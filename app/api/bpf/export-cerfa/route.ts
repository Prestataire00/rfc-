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
import { resolveBranding } from "@/lib/pdf/branding";
import { getParametres } from "@/lib/parametres";

/**
 * GET /api/bpf/export-cerfa?annee=2026
 *
 * Génère un PDF au format Cerfa 10443*17 pré-rempli depuis les données
 * Prisma, conforme aux art. R6352-22 à R6352-24 du Code du travail.
 *
 * Auto-fill
 * - Cadre A : Parametres (raison sociale, SIRET, NDA, adresse, formeJuridique)
 * - Cadre B (produits HT) : Facture.paiements (statut=payee, exercice civil).
 *   Source unique pour éviter le double comptage avec la table Financement.
 *   Bucketing par mode de paiement → B1/B2/B3a-d/B4/B5/B6.
 * - Cadre C (charges) : table BpfCharges (saisie manuelle par exercice).
 * - Cadre D (pédagogique) :
 *   - D1 catégorie : Contact.statutProfessionnel (override) ou heuristique
 *     (numeroFranceTravail → demandeur, entrepriseId → salarié, sinon
 *     particulier).
 *   - D1 heures-stagiaires : si la session a des FeuillePresence (émargement
 *     V2 actif), comptage des demi-créneaux réellement présents
 *     (present / en_retard / depart_anticipe) ; sinon fallback durée pleine.
 *   - D2 type d'action : Formation.typeActionBpf (11 valeurs réglementaires).
 *
 * Inscriptions retenues : statut ∈ ("confirmee", "presente").
 */
export const GET = withErrorHandler(async (req: NextRequest) => {
  const annee =
    Number(new URL(req.url).searchParams.get("annee")) || new Date().getFullYear();
  const start = new Date(annee, 0, 1);
  const end = new Date(annee, 11, 31, 23, 59, 59);

  const [params, factures, sessions, chargesRow] = await Promise.all([
    prisma.parametres.findFirst({ where: { id: "default" } }),
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
        formation: { select: { duree: true, typeActionBpf: true } },
        inscriptions: {
          where: { statut: { in: ["confirmee", "presente"] } },
          include: {
            contact: {
              select: {
                id: true,
                entrepriseId: true,
                numeroFranceTravail: true,
                statutProfessionnel: true,
              },
            },
          },
        },
        feuillesPresence: {
          select: { contactId: true, statutMatin: true, statutApresMidi: true },
        },
      },
    }),
    prisma.bpfCharges.findUnique({ where: { annee } }),
  ]);

  const produits = computeProduits(factures);
  const charges = computeCharges(chargesRow);
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
    natureJuridique: params?.formeJuridique || undefined,
    regimeTVA: params?.regimeTVA,
    produits,
    charges,
    pedagogique,
  };

  const docDef = bpfCerfaPdf(input, { branding: await resolveBranding(await getParametres()) });
  const buffer = await generatePdfBuffer(docDef);

  return pdfResponse(Buffer.from(buffer), `BPF-Cerfa-10443-17-${annee}`);
});

// ──────────────────────────────────────────────────────────────────────────
// Cadre B — Produits HT (source unique : paiements des factures payées)
// ──────────────────────────────────────────────────────────────────────────

type FactureRow = { paiements: unknown; montantHT: number };

function computeProduits(factures: FactureRow[]): BpfCerfaProduits {
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

  for (const f of factures) {
    const paiements = Array.isArray(f.paiements)
      ? (f.paiements as Array<{ mode?: string; montant?: number }>)
      : [];
    const totalPaiements = paiements.reduce(
      (s, p) => s + (typeof p?.montant === "number" ? p.montant : 0),
      0,
    );

    if (paiements.length > 0 && totalPaiements > 0) {
      // Ventilation détaillée par mode de paiement
      for (const p of paiements) {
        if (p?.mode && typeof p.montant === "number") {
          bucketProduit(acc, p.mode, p.montant);
        }
      }
    } else {
      // Facture payée sans détail de paiement → on bucket en B6 (annexes)
      // pour ne pas perdre le montant HT (préférable à omission silencieuse).
      acc.b6_annexes += f.montantHT;
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
  if (["entreprise", "employeur", "direct", "virement", "cheque", "especes", "carte"].includes(t))
    acc.b1_entreprises += montant;
  else if (["opco", "opca", "afdas", "atlas"].some((k) => t.includes(k)))
    acc.b2_opco += montant;
  else if (["etat", "état"].includes(t)) acc.b3_etat += montant;
  else if (["region", "région"].includes(t)) acc.b3_regions += montant;
  else if (
    ["france_travail", "francetravail", "pole_emploi", "pole-emploi"].includes(t)
  )
    acc.b3_franceTravail += montant;
  else if (["cpf", "individuel", "particulier", "personnel"].includes(t))
    acc.b4_particuliers += montant;
  else if (["sous_traitance", "sous-traitance", "co_traitance"].includes(t))
    acc.b5_autresOF += montant;
  else acc.b6_annexes += montant;
}

// ──────────────────────────────────────────────────────────────────────────
// Cadre C — Charges (saisie manuelle, table BpfCharges)
// ──────────────────────────────────────────────────────────────────────────

type ChargesRow = {
  c1Achats: number;
  c2Services: number;
  c3AutresCharges: number;
  c4Impots: number;
  c5Salaires: number;
  c6Autres: number;
} | null;

function computeCharges(row: ChargesRow): BpfCerfaCharges {
  const c1 = row?.c1Achats ?? 0;
  const c2 = row?.c2Services ?? 0;
  const c3 = row?.c3AutresCharges ?? 0;
  const c4 = row?.c4Impots ?? 0;
  const c5 = row?.c5Salaires ?? 0;
  const c6 = row?.c6Autres ?? 0;
  return {
    c1_achats: c1,
    c2_services: c2,
    c3_autresCharges: c3,
    c4_impots: c4,
    c5_salaires: c5,
    c6_autres: c6,
    c7_total: c1 + c2 + c3 + c4 + c5 + c6,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Cadre D — Pédagogique (catégorie D1 + type d'action D2 + heures réelles)
// ──────────────────────────────────────────────────────────────────────────

type FeuilleRow = {
  contactId: string;
  statutMatin: string | null;
  statutApresMidi: string | null;
};

type ContactRow = {
  id: string;
  entrepriseId: string | null;
  numeroFranceTravail: string | null;
  statutProfessionnel: string | null;
};

type SessionRow = {
  dateDebut: Date;
  dateFin: Date;
  formation: { duree: number; typeActionBpf: string };
  inscriptions: Array<{ contact: ContactRow }>;
  feuillesPresence: FeuilleRow[];
};

type Categorie = "salarie" | "demandeur" | "particulier" | "autre";

function categoriser(c: ContactRow): Categorie {
  // Override explicite (Contact.statutProfessionnel) prioritaire
  switch (c.statutProfessionnel) {
    case "salarie":
      return "salarie";
    case "demandeur_emploi":
      return "demandeur";
    case "particulier":
      return "particulier";
    case "contrat_pro":
    case "apprenti":
    case "travailleur_non_salarie":
    case "autre":
      return "autre";
  }
  // Fallback heuristique
  if (c.numeroFranceTravail) return "demandeur";
  if (c.entrepriseId) return "salarie";
  return "particulier";
}

// Statuts de présence considérés comme "présent" au sens BPF (le stagiaire
// a effectivement participé au créneau, même en retard ou parti en avance).
const STATUTS_PRESENTS = new Set(["present", "en_retard", "depart_anticipe"]);

/**
 * Calcule les heures effectivement suivies par un stagiaire sur une session.
 *
 * Si la session a des feuilles de présence (V2 émargement actif) : prorata
 * basé sur les demi-créneaux réellement présents. Sinon fallback durée pleine
 * (sessions historiques sans émargement numérique).
 */
function heuresInscription(
  feuillesContact: FeuilleRow[],
  duree: number,
  nbJours: number,
): number {
  if (feuillesContact.length === 0) return duree;
  let demiPresents = 0;
  for (const fp of feuillesContact) {
    if (fp.statutMatin && STATUTS_PRESENTS.has(fp.statutMatin)) demiPresents++;
    if (fp.statutApresMidi && STATUTS_PRESENTS.has(fp.statutApresMidi))
      demiPresents++;
  }
  const hParDemi = duree / Math.max(1, nbJours * 2);
  return Math.round(hParDemi * demiPresents);
}

// Mapping Formation.typeActionBpf → clé BpfCerfaPedagogique.typeActions
const TYPE_ACTION_KEYS = new Set<keyof BpfCerfaPedagogique["typeActions"]>([
  "adaptation",
  "promotion",
  "prevention",
  "conversion",
  "acquisition",
  "qualification",
  "apprentissage",
  "professionnalisation",
  "cpf",
  "vae",
  "bilanCompetences",
]);

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
    const nbJours = Math.max(
      1,
      Math.floor((s.dateFin.getTime() - s.dateDebut.getTime()) / 86_400_000) + 1,
    );

    const fpByContact = new Map<string, FeuilleRow[]>();
    for (const fp of s.feuillesPresence) {
      const arr = fpByContact.get(fp.contactId) ?? [];
      arr.push(fp);
      fpByContact.set(fp.contactId, arr);
    }

    const taKey = TYPE_ACTION_KEYS.has(
      s.formation.typeActionBpf as keyof BpfCerfaPedagogique["typeActions"],
    )
      ? (s.formation.typeActionBpf as keyof BpfCerfaPedagogique["typeActions"])
      : "adaptation";

    for (const ins of s.inscriptions) {
      const c = ins.contact;
      const heures = heuresInscription(
        fpByContact.get(c.id) ?? [],
        duree,
        nbJours,
      );

      const cat = categoriser(c);
      if (cat === "salarie") {
        ped.d_salaries++;
        ped.d_hSalaries += heures;
      } else if (cat === "demandeur") {
        ped.d_demandeursEmploi++;
        ped.d_hDemandeursEmploi += heures;
      } else if (cat === "particulier") {
        ped.d_particuliers++;
        ped.d_hParticuliers += heures;
      } else {
        ped.d_autres++;
        ped.d_hAutres += heures;
      }

      ped.typeActions[taKey] += heures;
    }
  }

  return ped;
}
