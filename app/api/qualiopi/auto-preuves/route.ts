export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AUTO_PREUVES, AutoPreuvesStats } from "@/lib/qualiopi-auto-preuves";

export async function GET() {
  try {
    const [
      nbFormations,
      nbSessions,
      nbInscriptions,
      nbPresences,
      nbEvaluations,
      evaluationsAvecNote,
      nbFeedbacks,
      nbContacts,
      nbAttestations,
    ] = await Promise.all([
      prisma.formation.count({ where: { actif: true } }),
      prisma.session.count(),
      prisma.inscription.count(),
      prisma.feuillePresence.count(),
      prisma.evaluation.count({ where: { estComplete: true } }),
      prisma.evaluation.findMany({
        where: { estComplete: true, noteGlobale: { not: null } },
        select: { noteGlobale: true },
      }),
      prisma.feedbackFormateur.count(),
      prisma.contact.count({ where: { type: "stagiaire" } }),
      prisma.attestation.count(),
    ]);

    const noteMoyenne =
      evaluationsAvecNote.length > 0
        ? Math.round(
            (evaluationsAvecNote.reduce((sum, e) => sum + (e.noteGlobale ?? 0), 0) /
              evaluationsAvecNote.length) *
              10
          ) / 10
        : 0;

    const stats: AutoPreuvesStats = {
      nbFormations,
      nbSessions,
      nbInscriptions,
      nbPresences,
      nbEvaluations,
      noteMoyenne,
      nbFeedbacks,
      nbContacts,
      nbAttestations,
    };

    const result: Record<number, ReturnType<typeof AUTO_PREUVES[number]>> = {};
    for (const [num, fn] of Object.entries(AUTO_PREUVES)) {
      result[Number(num)] = fn(stats);
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("Erreur auto-preuves qualiopi:", err);
    return NextResponse.json({ error: "Erreur lors du calcul des preuves automatiques" }, { status: 500 });
  }
}
