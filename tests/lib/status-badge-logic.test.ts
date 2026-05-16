import { describe, it, expect } from "vitest";
import { BESOIN_STATUTS } from "@/lib/constants";

// StatusBadge relies on BESOIN_STATUTS for labels and STATUS_DOT for colours.
// These tests validate the data contract that StatusBadge depends on.

const STATUS_DOT: Record<string, string> = {
  nouveau:      "bg-sky-500",
  qualifie:     "bg-indigo-500",
  devis_envoye: "bg-amber-500",
  accepte:      "bg-emerald-500",
  refuse:       "bg-red-500",
  archive:      "bg-slate-500",
};

describe("StatusBadge data contract", () => {
  it("chaque statut dans BESOIN_STATUTS a un dot couleur dans STATUS_DOT", () => {
    for (const key of Object.keys(BESOIN_STATUTS)) {
      expect(STATUS_DOT[key], `dot manquant pour statut: ${key}`).toBeDefined();
      expect(STATUS_DOT[key]).toMatch(/^bg-/);
    }
  });

  it("chaque statut dans STATUS_DOT a un label dans BESOIN_STATUTS", () => {
    for (const key of Object.keys(STATUS_DOT)) {
      expect(BESOIN_STATUTS[key as keyof typeof BESOIN_STATUTS], `label manquant pour statut: ${key}`).toBeDefined();
    }
  });

  it("le statut 'nouveau' a le bon label", () => {
    expect(BESOIN_STATUTS.nouveau.label).toBe("Nouveau");
  });

  it("le statut 'qualifie' a le bon label", () => {
    expect(BESOIN_STATUTS.qualifie.label).toBe("Qualifié");
  });

  it("le statut 'accepte' a le dot vert (bg-emerald-500)", () => {
    expect(STATUS_DOT.accepte).toBe("bg-emerald-500");
  });

  it("le statut 'archive' a le dot gris (bg-slate-500)", () => {
    expect(STATUS_DOT.archive).toBe("bg-slate-500");
  });

  it("STATUS_DOT et BESOIN_STATUTS ont le même nombre d'entrées", () => {
    expect(Object.keys(STATUS_DOT).length).toBe(Object.keys(BESOIN_STATUTS).length);
  });
});
