// GET /api/questionnaires/suivi
// Agrège tous les questionnaires envoyés par la plateforme dans une vue
// unifiée pour /suivi-questionnaires. 3 sources :
//   - FichePreFormationEntreprise (besoin client avant formation)
//   - FichePreFormationStagiaire (questionnaire individuel pré-formation)
//   - Evaluation (satisfaction à chaud / froid / acquis post-formation)
//
// Chaque item est normalisé en une shape commune avec un type discriminant
// pour permettre tri/filtre/affichage côté UI.
//
// Réponse :
//   { items: Item[], stats: { total, repondus, enAttente, tauxReponse } }
//
// Note : Evaluation n'a pas de dateEnvoi/dateReponse en DB → on utilise
// createdAt comme proxy de dateEnvoi, et estComplete pour déterminer
// le statut (repondu / en_attente). Pas de dateReponse précise pour
// les évals → on tolère null.

export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";

export type QuestionnaireType =
  | "fiche_entreprise"
  | "fiche_stagiaire"
  | "evaluation";

export type SuiviStatut = "en_attente" | "envoye" | "repondu" | "incomplet";

export type SuiviItem = {
  id: string;
  type: QuestionnaireType;
  typeLabel: string; // libellé court ex "Fiche entreprise"
  destinataire: string; // ex "ACME (Jean Dupont)" ou "Marie Curie"
  destinataireEmail: string | null;
  contexte: string | null; // ex "Formation SST" ou type d'éval
  statut: SuiviStatut;
  dateEnvoi: string | null;
  dateReponse: string | null;
  // URL admin / URL publique selon ce qu'on veut afficher
  lienAdmin: string | null;
  lienPublic: string | null;
};

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const typeFilter = searchParams.get("type") as QuestionnaireType | null;
  const statutFilter = searchParams.get("statut") as SuiviStatut | null;

  // Fetch les 3 sources en parallèle
  const [fichesEntreprise, fichesStagiaire, evaluations] = await Promise.all([
    typeFilter && typeFilter !== "fiche_entreprise"
      ? Promise.resolve([])
      : prisma.fichePreFormationEntreprise.findMany({
          orderBy: { createdAt: "desc" },
          include: {
            entreprise: { select: { nom: true } },
            session: { select: { id: true, formation: { select: { titre: true } } } },
            formation: { select: { titre: true } },
            demande: { select: { id: true, titre: true } },
          },
        }),
    typeFilter && typeFilter !== "fiche_stagiaire"
      ? Promise.resolve([])
      : prisma.fichePreFormationStagiaire.findMany({
          orderBy: { createdAt: "desc" },
          include: {
            contact: { select: { prenom: true, nom: true, email: true } },
            session: { select: { id: true, formation: { select: { titre: true } } } },
            formation: { select: { titre: true } },
            demande: { select: { id: true, titre: true } },
          },
        }),
    typeFilter && typeFilter !== "evaluation"
      ? Promise.resolve([])
      : prisma.evaluation.findMany({
          orderBy: { createdAt: "desc" },
          include: {
            contact: { select: { prenom: true, nom: true, email: true } },
            session: { select: { id: true, formation: { select: { titre: true } } } },
          },
        }),
  ]);

  const items: SuiviItem[] = [];

  for (const f of fichesEntreprise) {
    const destinataireNom = f.destinataireNom
      || f.entreprise?.nom
      || "—";
    const contexte = f.session?.formation?.titre
      || f.formation?.titre
      || f.demande?.titre
      || null;
    items.push({
      id: f.id,
      type: "fiche_entreprise",
      typeLabel: "Fiche entreprise",
      destinataire: f.entreprise?.nom
        ? `${f.entreprise.nom} (${destinataireNom})`
        : destinataireNom,
      destinataireEmail: f.destinataireEmail,
      contexte,
      statut: f.statut as SuiviStatut,
      dateEnvoi: f.dateEnvoi?.toISOString() ?? null,
      dateReponse: f.dateReponse?.toISOString() ?? null,
      lienAdmin: f.statut === "repondu"
        ? `/qualiopi/fiches-pre-formation/${f.id}/generer-devis`
        : `/qualiopi/fiches-pre-formation`,
      lienPublic: `/qualiopi/fiche-entreprise/${f.tokenAcces}`,
    });
  }

  for (const f of fichesStagiaire) {
    const destinataireNom = f.contact
      ? `${f.contact.prenom} ${f.contact.nom}`
      : "—";
    const contexte = f.session?.formation?.titre
      || f.formation?.titre
      || f.demande?.titre
      || null;
    items.push({
      id: f.id,
      type: "fiche_stagiaire",
      typeLabel: "Fiche stagiaire",
      destinataire: destinataireNom,
      destinataireEmail: f.contact?.email ?? null,
      contexte,
      statut: f.statut as SuiviStatut,
      dateEnvoi: f.dateEnvoi?.toISOString() ?? null,
      dateReponse: f.dateReponse?.toISOString() ?? null,
      lienAdmin: null, // pas de page admin dédiée actuellement
      lienPublic: `/qualiopi/fiche-stagiaire/${f.tokenAcces}`,
    });
  }

  for (const e of evaluations) {
    const destinataireNom = e.contact
      ? `${e.contact.prenom} ${e.contact.nom}`
      : "—";
    // Evaluation : pas de dateEnvoi/dateReponse en DB.
    // → createdAt comme proxy de dateEnvoi (date à laquelle l'éval a été
    //   créée, donc envoyée pour réponse)
    // → estComplete=true → statut="repondu" (mais pas de date précise)
    //   estComplete=false → statut="envoye" (en attente de réponse)
    const statut: SuiviStatut = e.estComplete ? "repondu" : "envoye";
    items.push({
      id: e.id,
      type: "evaluation",
      typeLabel: `Évaluation (${e.type.replace(/_/g, " ")})`,
      destinataire: destinataireNom,
      destinataireEmail: e.contact?.email ?? null,
      contexte: e.session?.formation?.titre ?? null,
      statut,
      dateEnvoi: e.createdAt.toISOString(),
      dateReponse: e.estComplete ? e.createdAt.toISOString() : null,
      lienAdmin: e.sessionId ? `/sessions/${e.sessionId}` : `/evaluations`,
      lienPublic: e.tokenAcces ? `/evaluation/${e.tokenAcces}` : null,
    });
  }

  // Tri global par date d'envoi décroissante (les plus récents en premier)
  items.sort((a, b) => {
    const ta = a.dateEnvoi ? new Date(a.dateEnvoi).getTime() : 0;
    const tb = b.dateEnvoi ? new Date(b.dateEnvoi).getTime() : 0;
    return tb - ta;
  });

  // Filtre statut côté serveur si demandé
  const filtered = statutFilter
    ? items.filter((it) => it.statut === statutFilter)
    : items;

  // Stats calculées sur l'ensemble (pas le filtre, pour avoir une vue globale)
  const total = items.length;
  const repondus = items.filter((it) => it.statut === "repondu").length;
  const enAttente = items.filter((it) => it.statut === "envoye" || it.statut === "en_attente").length;
  const tauxReponse = total > 0 ? Math.round((repondus / total) * 100) : 0;

  return NextResponse.json({
    items: filtered,
    stats: { total, repondus, enAttente, tauxReponse },
  });
});
