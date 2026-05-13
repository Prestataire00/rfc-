import { describe, expect, it } from "vitest";

import {
  aggregateProjet,
  buildCode,
  type AggregateInput,
} from "@/lib/projets/aggregate";

const NOW = new Date("2026-05-13T10:00:00Z");

function base(overrides: Partial<AggregateInput> = {}): AggregateInput {
  return {
    statut: "en_cours",
    budget: null,
    dateFinPrevue: null,
    besoins: [],
    devis: [],
    sessions: [],
    factures: [],
    now: NOW,
    ...overrides,
  };
}

describe("aggregateProjet — volumes", () => {
  it("0 partout sur projet vide", () => {
    const k = aggregateProjet(base());
    expect(k.nbBesoins).toBe(0);
    expect(k.nbDevis).toBe(0);
    expect(k.nbSessions).toBe(0);
    expect(k.nbFactures).toBe(0);
    expect(k.caEncaisse).toBe(0);
  });

  it("compte les sessions par statut + sessions futures", () => {
    const future = new Date(NOW);
    future.setDate(future.getDate() + 30);
    const past = new Date(NOW);
    past.setDate(past.getDate() - 30);

    const k = aggregateProjet(
      base({
        sessions: [
          { statut: "planifiee", dateDebut: future, dateFin: future },
          { statut: "confirmee", dateDebut: future, dateFin: future },
          { statut: "terminee", dateDebut: past, dateFin: past },
          { statut: "annulee", dateDebut: past, dateFin: past },
        ],
      }),
    );

    expect(k.nbSessions).toBe(4);
    expect(k.nbSessionsTerminees).toBe(1);
    expect(k.nbSessionsAVenir).toBe(2);
  });
});

describe("aggregateProjet — finance", () => {
  it("caEncaisse = somme des factures payées uniquement", () => {
    const k = aggregateProjet(
      base({
        factures: [
          { statut: "payee", montantTTC: 1000 },
          { statut: "payee", montantTTC: 500 },
          { statut: "envoyee", montantTTC: 800 },
          { statut: "en_retard", montantTTC: 200 },
          { statut: "annulee", montantTTC: 999 },
        ],
      }),
    );
    expect(k.caEncaisse).toBe(1500);
    expect(k.nbFacturesPayees).toBe(2);
    expect(k.nbFacturesEnRetard).toBe(1);
  });

  it("caPrevisionnel = factures non payées + devis signés non couverts", () => {
    const k = aggregateProjet(
      base({
        devis: [
          { statut: "signe", montantTTC: 3000 }, // signé
        ],
        factures: [
          { statut: "envoyee", montantTTC: 1000 }, // non payée → +1000
          // Reste 2000 sur le devis signé pas couvert par une facture
        ],
      }),
    );
    expect(k.caPrevisionnel).toBe(1000 + 2000);
  });

  it("caDevisEnvoyes = pipe commercial (devis envoyés non signés)", () => {
    const k = aggregateProjet(
      base({
        devis: [
          { statut: "envoye", montantTTC: 1000 },
          { statut: "envoye", montantTTC: 500 },
          { statut: "signe", montantTTC: 2000 }, // exclu
          { statut: "refuse", montantTTC: 800 }, // exclu
        ],
      }),
    );
    expect(k.caDevisEnvoyes).toBe(1500);
  });

  it("budgetRestant = budget - caEncaisse, null si budget null", () => {
    expect(
      aggregateProjet(
        base({
          budget: 10000,
          factures: [{ statut: "payee", montantTTC: 3000 }],
        }),
      ).budgetRestant,
    ).toBe(7000);

    expect(aggregateProjet(base({ budget: null })).budgetRestant).toBeNull();
  });

  it("budgetRestant peut être négatif (dépassement budget)", () => {
    const k = aggregateProjet(
      base({
        budget: 1000,
        factures: [{ statut: "payee", montantTTC: 1500 }],
      }),
    );
    expect(k.budgetRestant).toBe(-500);
  });
});

describe("aggregateProjet — avancement", () => {
  it("ratio sessions terminées / total si sessions présentes", () => {
    const k = aggregateProjet(
      base({
        sessions: [
          { statut: "terminee", dateDebut: NOW, dateFin: NOW },
          { statut: "terminee", dateDebut: NOW, dateFin: NOW },
          { statut: "planifiee", dateDebut: NOW, dateFin: NOW },
          { statut: "confirmee", dateDebut: NOW, dateFin: NOW },
        ],
      }),
    );
    expect(k.avancement).toBe(0.5);
  });

  it("statut-based fallback si aucune session", () => {
    expect(aggregateProjet(base({ statut: "brouillon" })).avancement).toBe(0);
    expect(aggregateProjet(base({ statut: "en_cours" })).avancement).toBe(0.5);
    expect(aggregateProjet(base({ statut: "en_pause" })).avancement).toBe(0.5);
    expect(aggregateProjet(base({ statut: "termine" })).avancement).toBe(1);
    expect(aggregateProjet(base({ statut: "archive" })).avancement).toBe(1);
  });
});

describe("aggregateProjet — délais", () => {
  it("joursAvantFin positif si future, négatif si passée", () => {
    const future = new Date(NOW);
    future.setDate(future.getDate() + 10);
    expect(
      aggregateProjet(base({ dateFinPrevue: future })).joursAvantFin,
    ).toBe(10);

    const past = new Date(NOW);
    past.setDate(past.getDate() - 5);
    const days = aggregateProjet(base({ dateFinPrevue: past })).joursAvantFin;
    expect(days).toBeLessThanOrEqual(-4);
  });

  it("null si dateFinPrevue null", () => {
    expect(
      aggregateProjet(base({ dateFinPrevue: null })).joursAvantFin,
    ).toBeNull();
  });

  it("enRetard = true si dateFinPrevue dépassée ET statut actif", () => {
    const past = new Date(NOW);
    past.setDate(past.getDate() - 1);

    expect(
      aggregateProjet(
        base({ statut: "en_cours", dateFinPrevue: past }),
      ).enRetard,
    ).toBe(true);

    expect(
      aggregateProjet(
        base({ statut: "termine", dateFinPrevue: past }),
      ).enRetard,
    ).toBe(false);

    expect(
      aggregateProjet(
        base({ statut: "archive", dateFinPrevue: past }),
      ).enRetard,
    ).toBe(false);
  });
});

describe("buildCode", () => {
  it("format PROJ-YYYY-NNN avec padding 3 chiffres", () => {
    expect(buildCode(2026, 1)).toBe("PROJ-2026-001");
    expect(buildCode(2026, 42)).toBe("PROJ-2026-042");
    expect(buildCode(2026, 999)).toBe("PROJ-2026-999");
  });

  it("au-delà de 999, plus de padding", () => {
    expect(buildCode(2026, 1234)).toBe("PROJ-2026-1234");
  });
});
