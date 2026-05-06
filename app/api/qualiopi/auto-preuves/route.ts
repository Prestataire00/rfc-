export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";
import { AUTO_PREUVES, AutoPreuvesStats } from "@/lib/qualiopi-auto-preuves";

// GET /api/qualiopi/auto-preuves
// Calcule les statistiques CRM (formations actives, inscriptions, evaluations, feedbacks, presences,
// attestations, contacts) puis renvoie pour chaque indicateur Qualiopi couvert par AUTO_PREUVES
// un objet { titre, description, count, lien, statut: "disponible" | "manquant" }.
export const GET = withErrorHandler(async () => {
  const [
    nbFormations,
    nbSessions,
    nbInscriptions,
    nbPresences,
    completes,
    nbFeedbacks,
    nbContacts,
    nbAttestations,
  ] = await Promise.all([
    prisma.formation.count({ where: { actif: true } }),
    prisma.session.count(),
    prisma.inscription.count(),
    // Une feuille de presence est consideree "renseignee" des qu'une demi-journee a un statut
    // detaille V2 ou un boolean V1 a true (matin OU apresMidi).
    prisma.feuillePresence.count({
      where: {
        OR: [
          { statutMatin: { not: null } },
          { statutApresMidi: { not: null } },
          { matin: true },
          { apresMidi: true },
        ],
      },
    }),
    prisma.evaluation.findMany({
      where: { estComplete: true },
      select: { noteGlobale: true },
    }),
    prisma.feedbackFormateur.count(),
    prisma.contact.count(),
    prisma.attestation.count(),
  ]);

  const notes = completes.map((e) => e.noteGlobale).filter((n): n is number => typeof n === "number");
  const noteMoyenne = notes.length > 0
    ? Math.round((notes.reduce((a, b) => a + b, 0) / notes.length) * 10) / 10
    : 0;

  const stats: AutoPreuvesStats = {
    nbFormations,
    nbSessions,
    nbInscriptions,
    nbPresences,
    nbEvaluations: completes.length,
    noteMoyenne,
    nbFeedbacks,
    nbContacts,
    nbAttestations,
  };

  const preuves: Record<number, {
    titre: string;
    description: string;
    count: number;
    lien: string;
    statut: "disponible" | "manquant";
  }> = {};

  for (const [idStr, builder] of Object.entries(AUTO_PREUVES)) {
    const indicateurId = Number(idStr);
    const p = builder(stats);
    preuves[indicateurId] = {
      titre: p.titre,
      description: p.description,
      count: p.count ?? 0,
      lien: p.lien,
      statut: p.disponible ? "disponible" : "manquant",
    };
  }

  return NextResponse.json({ stats, preuves });
});
