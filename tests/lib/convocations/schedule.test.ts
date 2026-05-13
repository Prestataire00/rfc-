import { describe, expect, it } from "vitest";

import {
  daysUntil,
  DEFAULT_POLICY,
  selectSessionsToConvoke,
  shouldSendConvocations,
  type SessionRow,
} from "@/lib/convocations/schedule";

const NOW = new Date("2026-05-13T08:00:00Z");

function session(opts: Partial<SessionRow> & { daysAhead: number }): SessionRow {
  const dateDebut = new Date(NOW);
  dateDebut.setDate(dateDebut.getDate() + opts.daysAhead);
  return {
    id: "s1",
    dateDebut,
    statut: opts.statut ?? "confirmee",
    modeExpress: opts.modeExpress ?? false,
    convocationsEnvoyeesAt: opts.convocationsEnvoyeesAt ?? null,
  };
}

describe("daysUntil", () => {
  it("0 si date égale à now", () => {
    expect(daysUntil(NOW, NOW)).toBe(0);
  });

  it("positif si future", () => {
    const future = new Date(NOW);
    future.setDate(future.getDate() + 7);
    expect(daysUntil(future, NOW)).toBe(7);
  });

  it("négatif si passé", () => {
    const past = new Date(NOW);
    past.setDate(past.getDate() - 3);
    expect(daysUntil(past, NOW)).toBe(-3);
  });
});

describe("shouldSendConvocations — politique par défaut (J-7 ±1)", () => {
  it("session à J+7 confirmée → send", () => {
    const d = shouldSendConvocations(session({ daysAhead: 7 }), NOW);
    expect(d).toEqual({ kind: "send" });
  });

  it("session à J+6 → send (dans la fenêtre)", () => {
    const d = shouldSendConvocations(session({ daysAhead: 6 }), NOW);
    expect(d).toEqual({ kind: "send" });
  });

  it("session à J+8 → send (dans la fenêtre)", () => {
    const d = shouldSendConvocations(session({ daysAhead: 8 }), NOW);
    expect(d).toEqual({ kind: "send" });
  });

  it("session à J+5 → skip outside_window", () => {
    const d = shouldSendConvocations(session({ daysAhead: 5 }), NOW);
    expect(d).toEqual({ kind: "skip", reason: "outside_window" });
  });

  it("session à J+14 → skip outside_window", () => {
    const d = shouldSendConvocations(session({ daysAhead: 14 }), NOW);
    expect(d).toEqual({ kind: "skip", reason: "outside_window" });
  });

  it("session passée → skip session_passed", () => {
    const d = shouldSendConvocations(session({ daysAhead: -1 }), NOW);
    expect(d).toEqual({ kind: "skip", reason: "session_passed" });
  });
});

describe("shouldSendConvocations — gates", () => {
  it("convocationsEnvoyeesAt non null → skip already_sent", () => {
    const s = session({
      daysAhead: 7,
      convocationsEnvoyeesAt: new Date("2026-05-12"),
    });
    expect(shouldSendConvocations(s, NOW)).toEqual({
      kind: "skip",
      reason: "already_sent",
    });
  });

  it("modeExpress true → skip mode_express", () => {
    const s = session({ daysAhead: 7, modeExpress: true });
    expect(shouldSendConvocations(s, NOW)).toEqual({
      kind: "skip",
      reason: "mode_express",
    });
  });

  it("statut annulee → skip statut_ineligible", () => {
    const s = session({ daysAhead: 7, statut: "annulee" });
    expect(shouldSendConvocations(s, NOW)).toEqual({
      kind: "skip",
      reason: "statut_ineligible",
    });
  });

  it("statut terminee → skip statut_ineligible", () => {
    const s = session({ daysAhead: 7, statut: "terminee" });
    expect(shouldSendConvocations(s, NOW)).toEqual({
      kind: "skip",
      reason: "statut_ineligible",
    });
  });

  it("statut planifiee → send (éligible)", () => {
    const s = session({ daysAhead: 7, statut: "planifiee" });
    expect(shouldSendConvocations(s, NOW)).toEqual({ kind: "send" });
  });
});

describe("shouldSendConvocations — policy custom", () => {
  it("J-14 avec policy 14 jours → send à J+14", () => {
    const policy = { ...DEFAULT_POLICY, daysBeforeSession: 14 };
    const d = shouldSendConvocations(session({ daysAhead: 14 }), NOW, policy);
    expect(d).toEqual({ kind: "send" });
  });

  it("window 0 → tolérance nulle, doit être exactement le jour J-N", () => {
    const policy = { ...DEFAULT_POLICY, windowDays: 0 };
    expect(shouldSendConvocations(session({ daysAhead: 7 }), NOW, policy)).toEqual({
      kind: "send",
    });
    expect(shouldSendConvocations(session({ daysAhead: 6 }), NOW, policy)).toEqual({
      kind: "skip",
      reason: "outside_window",
    });
  });
});

describe("selectSessionsToConvoke", () => {
  it("filtre une liste mixte avec raisons des skip", () => {
    const sessions: SessionRow[] = [
      { ...session({ daysAhead: 7 }), id: "ok-1" },
      { ...session({ daysAhead: 7, modeExpress: true }), id: "express" },
      { ...session({ daysAhead: 7, statut: "annulee" }), id: "annulee" },
      { ...session({ daysAhead: 7 }), id: "ok-2" },
      { ...session({ daysAhead: 0 }), id: "today" },
    ];

    const { toSend, skipped } = selectSessionsToConvoke(sessions, NOW);

    expect(toSend.map((s) => s.id).sort()).toEqual(["ok-1", "ok-2"]);
    expect(skipped.map((s) => ({ id: s.session.id, reason: s.reason }))).toEqual([
      { id: "express", reason: "mode_express" },
      { id: "annulee", reason: "statut_ineligible" },
      { id: "today", reason: "outside_window" },
    ]);
  });
});
