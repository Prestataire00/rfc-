import { describe, expect, it } from "vitest";

import {
  aggregateRoi,
  coutHoraire,
  coutParStagiaire,
  type EvaluationRow,
  type FactureRow,
  type InscriptionRow,
} from "@/lib/client/roi-calc";

function inscription(
  opts: Partial<InscriptionRow> & {
    contactId: string;
    statut: string;
    formationId?: string;
    duree?: number;
    dateDebut?: Date;
  },
): InscriptionRow {
  return {
    contactId: opts.contactId,
    statut: opts.statut,
    session: {
      formationId: opts.formationId ?? "f1",
      dateDebut: opts.dateDebut ?? new Date("2026-01-15"),
      formation: { duree: opts.duree ?? 7 },
    },
  };
}

function evaluation(
  opts: Partial<EvaluationRow> & { noteGlobale: number | null },
): EvaluationRow {
  return {
    noteGlobale: opts.noteGlobale,
    estComplete: opts.estComplete ?? true,
    type: opts.type ?? "satisfaction_chaud",
    cible: opts.cible ?? "stagiaire",
  };
}

function facture(opts: { montantTTC: number; statut: string }): FactureRow {
  return opts;
}

describe("aggregateRoi — counters", () => {
  it("retourne 0 partout sur input vide", () => {
    const k = aggregateRoi({ inscriptions: [], evaluations: [], factures: [] });
    expect(k.nbStagiairesFormes).toBe(0);
    expect(k.nbFormationsDistinctes).toBe(0);
    expect(k.heuresTotalesFormation).toBe(0);
    expect(k.tauxAssiduite).toBe(0);
    expect(k.noteSatisfactionMoyenne).toBeNull();
    expect(k.investissementTotalTTC).toBe(0);
  });

  it("compte les stagiaires distincts présents (pas confirmée, pas en_attente)", () => {
    const k = aggregateRoi({
      inscriptions: [
        inscription({ contactId: "c1", statut: "presente" }),
        inscription({ contactId: "c2", statut: "presente" }),
        inscription({ contactId: "c1", statut: "presente" }), // doublon contact
        inscription({ contactId: "c3", statut: "confirmee" }), // pas présent → exclu
        inscription({ contactId: "c4", statut: "annulee" }),
      ],
      evaluations: [],
      factures: [],
    });
    expect(k.nbStagiairesFormes).toBe(2);
    expect(k.nbInscriptionsPresentes).toBe(3);
    expect(k.nbInscriptionsTotal).toBe(5);
  });

  it("compte les formations distinctes parmi les présents", () => {
    const k = aggregateRoi({
      inscriptions: [
        inscription({ contactId: "c1", statut: "presente", formationId: "fA" }),
        inscription({ contactId: "c2", statut: "presente", formationId: "fA" }),
        inscription({ contactId: "c3", statut: "presente", formationId: "fB" }),
      ],
      evaluations: [],
      factures: [],
    });
    expect(k.nbFormationsDistinctes).toBe(2);
  });

  it("somme les heures uniquement sur les inscriptions présentes", () => {
    const k = aggregateRoi({
      inscriptions: [
        inscription({ contactId: "c1", statut: "presente", duree: 7 }),
        inscription({ contactId: "c2", statut: "presente", duree: 14 }),
        inscription({ contactId: "c3", statut: "confirmee", duree: 21 }), // exclu
      ],
      evaluations: [],
      factures: [],
    });
    expect(k.heuresTotalesFormation).toBe(21);
  });
});

describe("aggregateRoi — assiduité", () => {
  it("présents / (présents + absents), ignore en_attente/confirmee/annulee", () => {
    const k = aggregateRoi({
      inscriptions: [
        inscription({ contactId: "c1", statut: "presente" }),
        inscription({ contactId: "c2", statut: "presente" }),
        inscription({ contactId: "c3", statut: "presente" }),
        inscription({ contactId: "c4", statut: "absente" }),
        inscription({ contactId: "c5", statut: "confirmee" }), // ignoré
        inscription({ contactId: "c6", statut: "en_attente" }), // ignoré
        inscription({ contactId: "c7", statut: "annulee" }), // ignoré
      ],
      evaluations: [],
      factures: [],
    });
    expect(k.tauxAssiduite).toBeCloseTo(3 / 4, 5);
  });

  it("0 si aucune inscription présente/absente", () => {
    const k = aggregateRoi({
      inscriptions: [
        inscription({ contactId: "c1", statut: "confirmee" }),
      ],
      evaluations: [],
      factures: [],
    });
    expect(k.tauxAssiduite).toBe(0);
  });
});

describe("aggregateRoi — satisfaction", () => {
  it("moyenne uniquement sur évaluations stagiaire chaud complètes", () => {
    const k = aggregateRoi({
      inscriptions: [],
      evaluations: [
        evaluation({ noteGlobale: 5 }),
        evaluation({ noteGlobale: 4 }),
        evaluation({ noteGlobale: 3 }),
        evaluation({ noteGlobale: 5, estComplete: false }), // exclu
        evaluation({ noteGlobale: 2, cible: "client" }), // exclu
        evaluation({ noteGlobale: 1, type: "satisfaction_froid" }), // exclu
        evaluation({ noteGlobale: null }), // exclu
      ],
      factures: [],
    });
    expect(k.nbEvaluationsCompletes).toBe(3);
    expect(k.noteSatisfactionMoyenne).toBeCloseTo(4, 5);
  });

  it("null si aucune évaluation éligible", () => {
    const k = aggregateRoi({
      inscriptions: [],
      evaluations: [evaluation({ noteGlobale: 5, cible: "formateur" })],
      factures: [],
    });
    expect(k.noteSatisfactionMoyenne).toBeNull();
  });
});

describe("aggregateRoi — investissement", () => {
  it("somme uniquement les factures payées", () => {
    const k = aggregateRoi({
      inscriptions: [],
      evaluations: [],
      factures: [
        facture({ montantTTC: 1200, statut: "payee" }),
        facture({ montantTTC: 800, statut: "payee" }),
        facture({ montantTTC: 500, statut: "envoyee" }), // exclu
        facture({ montantTTC: 300, statut: "en_retard" }), // exclu
      ],
    });
    expect(k.investissementTotalTTC).toBe(2000);
  });
});

describe("aggregateRoi — filtre temporel since", () => {
  it("ne compte que les sessions après since", () => {
    const since = new Date("2026-01-01");
    const k = aggregateRoi({
      inscriptions: [
        inscription({
          contactId: "c1",
          statut: "presente",
          dateDebut: new Date("2025-12-15"),
        }),
        inscription({
          contactId: "c2",
          statut: "presente",
          dateDebut: new Date("2026-02-01"),
        }),
      ],
      evaluations: [],
      factures: [],
      since,
    });
    expect(k.nbStagiairesFormes).toBe(1);
    expect(k.nbInscriptionsTotal).toBe(1);
  });
});

describe("coutParStagiaire / coutHoraire", () => {
  it("null si pas de stagiaire / pas d'heure", () => {
    const k = aggregateRoi({ inscriptions: [], evaluations: [], factures: [] });
    expect(coutParStagiaire(k)).toBeNull();
    expect(coutHoraire(k)).toBeNull();
  });

  it("divise correctement", () => {
    const k = aggregateRoi({
      inscriptions: [
        inscription({ contactId: "c1", statut: "presente", duree: 10 }),
        inscription({ contactId: "c2", statut: "presente", duree: 10 }),
      ],
      evaluations: [],
      factures: [facture({ montantTTC: 1000, statut: "payee" })],
    });
    expect(coutParStagiaire(k)).toBe(500);
    expect(coutHoraire(k)).toBe(50);
  });
});
