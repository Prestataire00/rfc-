export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";

// GET /api/sessions/[id]/evaluations-synthese
// Synthese par session des evaluations a chaud / a froid :
// taux de reponse, note moyenne, repartition 1-5, derniers commentaires.
type SyntheseBlock = {
  total: number;            // evaluations envoyees pour ce type
  completes: number;        // evaluations completees
  tauxReponse: number;      // % completes / total
  noteMoyenne: number;      // moyenne /5 (0 si vide)
  repartition: [number, number, number, number, number]; // [count1, count2, count3, count4, count5]
  commentaires: Array<{ id: string; commentaire: string; noteGlobale: number | null; createdAt: string }>;
};

function emptyBlock(): SyntheseBlock {
  return { total: 0, completes: 0, tauxReponse: 0, noteMoyenne: 0, repartition: [0, 0, 0, 0, 0], commentaires: [] };
}

export const GET = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const sessionId = params.id;

  // Toutes les evaluations de la session, peu importe estComplete (pour calculer le taux).
  const evaluations = await prisma.evaluation.findMany({
    where: { sessionId, type: { in: ["satisfaction_chaud", "satisfaction_froid"] } },
    select: {
      id: true,
      type: true,
      noteGlobale: true,
      commentaire: true,
      estComplete: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const inscriptionsCount = await prisma.inscription.count({ where: { sessionId } });

  const buildBlock = (type: "satisfaction_chaud" | "satisfaction_froid"): SyntheseBlock => {
    const block = emptyBlock();
    const evals = evaluations.filter((e) => e.type === type);
    block.total = evals.length;
    const completes = evals.filter((e) => e.estComplete);
    block.completes = completes.length;

    // Taux de reponse : si on a des evaluations envoyees, base = total envoye ;
    // sinon fallback sur le nombre d'inscrits (pour eviter division par zero qui masque le besoin).
    const base = evals.length > 0 ? evals.length : inscriptionsCount;
    block.tauxReponse = base > 0 ? Math.round((completes.length / base) * 100) : 0;

    const notes = completes.map((e) => e.noteGlobale).filter((n): n is number => typeof n === "number");
    block.noteMoyenne = notes.length > 0
      ? Math.round((notes.reduce((a, b) => a + b, 0) / notes.length) * 10) / 10
      : 0;

    for (const n of notes) {
      const idx = Math.min(5, Math.max(1, Math.round(n))) - 1;
      block.repartition[idx] += 1;
    }

    block.commentaires = completes
      .filter((e) => e.commentaire && e.commentaire.trim().length > 0)
      .map((e) => ({
        id: e.id,
        commentaire: e.commentaire as string,
        noteGlobale: e.noteGlobale,
        createdAt: e.createdAt.toISOString(),
      }));

    return block;
  };

  return NextResponse.json({
    inscriptionsCount,
    chaud: buildBlock("satisfaction_chaud"),
    froid: buildBlock("satisfaction_froid"),
  });
});
