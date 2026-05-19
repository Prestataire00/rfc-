export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";
import {
  bpfCerfaPdf,
  type BpfCerfaInput,
  type BpfCerfaCharges,
  type BpfCerfaPedagogique,
  type BpfCerfaProduits,
} from "@/lib/pdf/templates";
import { generatePdfBuffer } from "@/lib/pdf/generate";
import { pdfResponse } from "@/lib/pdf/response";

/**
 * GET /api/bpf/export-cerfa?annee=2026
 *
 * Génère un PDF au format Cerfa 10443*17 pré-rempli depuis les données
 * Prisma. Les sections non suivies en base (charges détaillées, nature
 * juridique) restent vides — à compléter manuellement avant télédéclaration
 * sur Démarches Simplifiées.
 *
 * Auto-fill
 * - Cadre A : depuis Parametres (raison sociale, SIRET, NDA, adresse…)
 * - Cadre B (produits) : depuis Financement.type + Facture.paiements
 *   - "entreprise" → B1
 *   - "opco" → B2
 *   - "etat" → B3a, "region" → B3b, "france_travail"/"pole_emploi" → B3c
 *   - "cpf" / "individuel" / "particulier" → B4
 *   - Autres → B6 (annexes)
 * - Cadre C (charges) : non auto-rempli (à saisir manuellement)
 * - Cadre D (pédagogique) :
 *   - Stagiaires & heures par catégorie : déduit du type de Contact
 *     (stagiaire avec entreprise = "salariés", sans entreprise =
 *     "particuliers", France Travail = "demandeurs d'emploi")
 *   - Heures par type d'action : Formation.certifiante → "qualification",
 *     sinon "adaptation" par défaut
 */
export const GET = withErrorHandler(async (req: NextRequest) => {
  const annee =
    Number(new URL(req.url).searchParams.get("annee")) || new Date().getFullYear();
  const start = new Date(annee, 0, 1);
  const end = new Date(annee, 11, 31, 23, 59, 59);

  const [params, financements, factures, sessions] = await Promise.all([
    prisma.parametres.findFirst({ where: { id: "default" } }),
    prisma.financement.findMany({
      where: { createdAt: { gte: start, lte: end } },
    }),
    prisma.facture.findMany({
      where: {
        statut: "payee",
        dateEmission: { gte: start, lte: end },
      },
      select: { paiements: true, montantHT: true },
    }),
    prisma.session.findMany({
      where: { statut: "terminee", dateDebut: { gte: start, lte: end } },
      include: {
        formation: { select: { duree: true, certifiante: true } },
        inscriptions: {
          where: { statut: "presente" },
          include: {
            contact: {
              select: {
                entrepriseId: true,
                numeroFranceTravail: true,
              },
            },
          },
        },
      },
    }),
  ]);

  // Cadre B — Produits
  const produits = computeProduits(financements, factures);

  // Cadre C — Charges (laissées à zéro, l'utilisateur les saisit à la main
  // avant le télédépôt)
  const charges: BpfCerfaCharges = {
    c1_achats: 0,
    c2_services: 0,
    c3_autresCharges: 0,
    c4_impots: 0,
    c5_salaires: 0,
    c6_autres: 0,
    c7_total: 0,
  };

  // Cadre D — Bilan pédagogique
  const pedagogique = computePedagogique(sessions);

  const input: BpfCerfaInput = {
    annee,
    raisonSociale: params?.nomEntreprise ?? "",
    adresse: params?.adresse ?? "",
    codePostal: params?.codePostal ?? "",
    ville: params?.ville ?? "",
    telephone: params?.telephone ?? "",
    email: params?.email ?? "",
    siret: params?.siret ?? "",
    nda: params?.nda ?? "",
    natureJuridique: undefined,
    produits,
    charges,
    pedagogique,
  };

  const docDef = bpfCerfaPdf(input);
  const buffer = await generatePdfBuffer(docDef);

  return pdfResponse(Buffer.from(buffer), `BPF-Cerfa-10443-17-${annee}`);
});

type FinancementRow = { type: string; montant: number };
type FactureRow = { paiements: unknown; montantHT: number };

function computeProduits(
  financements: FinancementRow[],
  factures: FactureRow[],
): BpfCerfaProduits {
  const acc: BpfCerfaProduits = {
    b1_entreprises: 0,
    b2_opco: 0,
    b3_etat: 0,
    b3_regions: 0,
    b3_franceTravail: 0,
    b3_autres: 0,
    b4_particuliers: 0,
    b5_autresOF: 0,
    b6_annexes: 0,
    b7_total: 0,
  };

  for (const f of financements) {
    bucketProduit(acc, f.type, f.montant);
  }

  // Paiements directement attachés aux factures (mode de paiement = origine)
  for (const f of factures) {
    if (Array.isArray(f.paiements)) {
      for (const p of f.paiements as Array<{ mode?: string; montant?: number }>) {
        if (p?.mode && typeof p.montant === "number") {
          bucketProduit(acc, p.mode, p.montant);
        }
      }
    }
  }

  acc.b7_total =
    acc.b1_entreprises +
    acc.b2_opco +
    acc.b3_etat +
    acc.b3_regions +
    acc.b3_franceTravail +
    acc.b3_autres +
    acc.b4_particuliers +
    acc.b5_autresOF +
    acc.b6_annexes;

  return acc;
}

function bucketProduit(acc: BpfCerfaProduits, type: string, montant: number) {
  const t = type.toLowerCase();
  if (["entreprise", "employeur", "direct"].includes(t)) acc.b1_entreprises += montant;
  else if (["opco", "opca", "afdas", "atlas"].some((k) => t.includes(k)))
    acc.b2_opco += montant;
  else if (["etat", "état"].includes(t)) acc.b3_etat += montant;
  else if (["region", "région"].includes(t)) acc.b3_regions += montant;
  else if (["france_travail", "francetravail", "pole_emploi", "pole-emploi"].includes(t))
    acc.b3_franceTravail += montant;
  else if (["cpf", "individuel", "particulier", "personnel"].includes(t))
    acc.b4_particuliers += montant;
  else if (["sous_traitance", "sous-traitance", "co_traitance"].includes(t))
    acc.b5_autresOF += montant;
  else acc.b6_annexes += montant;
}

type SessionRow = {
  formation: { duree: number; certifiante: boolean };
  inscriptions: Array<{
    contact: { entrepriseId: string | null; numeroFranceTravail: string | null };
  }>;
};

function computePedagogique(sessions: SessionRow[]): BpfCerfaPedagogique {
  const ped: BpfCerfaPedagogique = {
    d_salaries: 0,
    d_demandeursEmploi: 0,
    d_particuliers: 0,
    d_autres: 0,
    d_hSalaries: 0,
    d_hDemandeursEmploi: 0,
    d_hParticuliers: 0,
    d_hAutres: 0,
    typeActions: {
      adaptation: 0,
      promotion: 0,
      prevention: 0,
      conversion: 0,
      acquisition: 0,
      qualification: 0,
      apprentissage: 0,
      professionnalisation: 0,
      cpf: 0,
      vae: 0,
      bilanCompetences: 0,
    },
  };

  for (const s of sessions) {
    const duree = s.formation.duree;
    for (const ins of s.inscriptions) {
      const c = ins.contact;
      if (c.numeroFranceTravail) {
        ped.d_demandeursEmploi++;
        ped.d_hDemandeursEmploi += duree;
      } else if (c.entrepriseId) {
        ped.d_salaries++;
        ped.d_hSalaries += duree;
      } else {
        ped.d_particuliers++;
        ped.d_hParticuliers += duree;
      }
      // Type d'action — heuristique simple : certifiante → qualification,
      // sinon adaptation. À affiner si on capte un champ "typeActionBpf"
      // sur Formation plus tard.
      if (s.formation.certifiante) {
        ped.typeActions.qualification += duree;
      } else {
        ped.typeActions.adaptation += duree;
      }
    }
  }

  return ped;
}
