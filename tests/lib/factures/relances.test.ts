import { describe, expect, it } from "vitest";

import {
  daysBetween,
  decideRelance,
  DEFAULT_POLICY,
  tierLabel,
  type RelancePolicy,
} from "@/lib/factures/relances";

const NOW = new Date("2026-05-13T10:00:00Z");

function input(opts: {
  daysOverdue: number;
  nbRappelsEnvoyes?: number;
  dernierRappelDaysAgo?: number | null;
  statut?: string;
}) {
  const dateEcheance = new Date(NOW);
  dateEcheance.setDate(dateEcheance.getDate() - opts.daysOverdue);
  const dernier =
    opts.dernierRappelDaysAgo == null
      ? null
      : (() => {
          const d = new Date(NOW);
          d.setDate(d.getDate() - opts.dernierRappelDaysAgo);
          return d;
        })();
  return {
    now: NOW,
    dateEcheance,
    statut: opts.statut ?? "en_retard",
    nbRappelsEnvoyes: opts.nbRappelsEnvoyes ?? 0,
    dernierRappelEnvoyeAt: dernier,
  };
}

describe("daysBetween", () => {
  it("retourne 0 si dates identiques", () => {
    expect(daysBetween(NOW, NOW)).toBe(0);
  });

  it("retourne positif si a après b", () => {
    const past = new Date(NOW);
    past.setDate(past.getDate() - 5);
    expect(daysBetween(NOW, past)).toBe(5);
  });

  it("floor — 23h59 ne compte pas pour un jour entier", () => {
    const almost = new Date(NOW.getTime() - 23 * 60 * 60 * 1000 - 59 * 60 * 1000);
    expect(daysBetween(NOW, almost)).toBe(0);
  });
});

describe("decideRelance — gates de base", () => {
  it("skip si statut ≠ en_retard", () => {
    const d = decideRelance(input({ daysOverdue: 10, statut: "envoyee" }));
    expect(d).toEqual({ kind: "skip", reason: "statut_not_en_retard" });
  });

  it("skip si les 3 paliers ont déjà été envoyés", () => {
    const d = decideRelance(input({ daysOverdue: 60, nbRappelsEnvoyes: 3 }));
    expect(d).toEqual({ kind: "skip", reason: "all_tiers_sent" });
  });
});

describe("decideRelance — paliers", () => {
  it("J+6 → pas encore palier 1 (seuil 7)", () => {
    const d = decideRelance(input({ daysOverdue: 6, nbRappelsEnvoyes: 0 }));
    expect(d).toEqual({ kind: "skip", reason: "tier_threshold_not_reached" });
  });

  it("J+7 → palier 1 (relance courtoise)", () => {
    const d = decideRelance(input({ daysOverdue: 7, nbRappelsEnvoyes: 0 }));
    expect(d).toEqual({ kind: "send", tier: 1 });
  });

  it("J+13, déjà palier 1 envoyé → skip (seuil palier 2 = 14)", () => {
    const d = decideRelance(
      input({
        daysOverdue: 13,
        nbRappelsEnvoyes: 1,
        dernierRappelDaysAgo: 6,
      }),
    );
    expect(d).toEqual({ kind: "skip", reason: "tier_threshold_not_reached" });
  });

  it("J+14, palier 1 envoyé il y a 7j → palier 2", () => {
    const d = decideRelance(
      input({
        daysOverdue: 14,
        nbRappelsEnvoyes: 1,
        dernierRappelDaysAgo: 7,
      }),
    );
    expect(d).toEqual({ kind: "send", tier: 2 });
  });

  it("J+30, paliers 1+2 envoyés → palier 3 (mise en demeure)", () => {
    const d = decideRelance(
      input({
        daysOverdue: 30,
        nbRappelsEnvoyes: 2,
        dernierRappelDaysAgo: 10,
      }),
    );
    expect(d).toEqual({ kind: "send", tier: 3 });
  });
});

describe("decideRelance — anti-spam minDaysBetweenReminders", () => {
  it("palier suivant éligible MAIS dernier rappel trop récent → skip", () => {
    const d = decideRelance(
      input({
        daysOverdue: 14,
        nbRappelsEnvoyes: 1,
        dernierRappelDaysAgo: 1, // < 3j depuis dernier
      }),
    );
    expect(d).toEqual({
      kind: "skip",
      reason: "too_soon_since_last_reminder",
    });
  });

  it("policy custom : minDaysBetween = 0 → autorise même jour", () => {
    const custom: RelancePolicy = {
      ...DEFAULT_POLICY,
      minDaysBetweenReminders: 0,
    };
    const d = decideRelance(
      input({
        daysOverdue: 14,
        nbRappelsEnvoyes: 1,
        dernierRappelDaysAgo: 0,
      }),
      custom,
    );
    expect(d).toEqual({ kind: "send", tier: 2 });
  });
});

describe("decideRelance — cas limite : premier rappel jamais envoyé", () => {
  it("J+7, nbRappels=0, dernier=null → palier 1 (pas d'anti-spam)", () => {
    const d = decideRelance(
      input({
        daysOverdue: 7,
        nbRappelsEnvoyes: 0,
        dernierRappelDaysAgo: null,
      }),
    );
    expect(d).toEqual({ kind: "send", tier: 1 });
  });
});

describe("tierLabel", () => {
  it("retourne un label distinct par palier", () => {
    const labels = [tierLabel(1), tierLabel(2), tierLabel(3)];
    expect(new Set(labels.map((l) => l.short)).size).toBe(3);
    expect(new Set(labels.map((l) => l.subject)).size).toBe(3);
  });

  it("palier 3 = mise en demeure", () => {
    expect(tierLabel(3).short).toBe("Mise en demeure");
  });
});
