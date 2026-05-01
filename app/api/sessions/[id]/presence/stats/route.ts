export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";

// GET /api/sessions/[id]/presence/stats
// Retourne les statistiques de presence pour la session.
export const GET = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const presences = await prisma.feuillePresence.findMany({
    where: { sessionId: params.id },
  });

  const inscrits = await prisma.inscription.count({
    where: { sessionId: params.id, statut: { in: ["confirmee", "presente", "en_attente"] } },
  });

  let totalSlots = 0;
  let present = 0;
  let absent = 0;
  let enRetard = 0;
  let excuse = 0;
  let departAnticipe = 0;
  let signed = 0;

  for (const p of presences) {
    // Matin
    if (p.statutMatin) {
      totalSlots++;
      if (p.statutMatin === "present") present++;
      if (p.statutMatin === "absent") absent++;
      if (p.statutMatin === "en_retard") { present++; enRetard++; }
      if (p.statutMatin === "excuse") excuse++;
      if (p.statutMatin === "depart_anticipe") { present++; departAnticipe++; }
      if (p.signatureMatin) signed++;
    } else if (p.matin) {
      totalSlots++;
      present++;
    }

    // Apres-midi
    if (p.statutApresMidi) {
      totalSlots++;
      if (p.statutApresMidi === "present") present++;
      if (p.statutApresMidi === "absent") absent++;
      if (p.statutApresMidi === "en_retard") { present++; enRetard++; }
      if (p.statutApresMidi === "excuse") excuse++;
      if (p.statutApresMidi === "depart_anticipe") { present++; departAnticipe++; }
      if (p.signatureApresMidi) signed++;
    } else if (p.apresMidi) {
      totalSlots++;
      present++;
    }
  }

  const tauxPresence = totalSlots > 0 ? Math.round((present / totalSlots) * 100) : 0;
  const tauxSignature = totalSlots > 0 ? Math.round((signed / totalSlots) * 100) : 0;

  return NextResponse.json({
    inscrits,
    totalSlots,
    present,
    absent,
    enRetard,
    excuse,
    departAnticipe,
    signed,
    tauxPresence,
    tauxSignature,
  });
});
