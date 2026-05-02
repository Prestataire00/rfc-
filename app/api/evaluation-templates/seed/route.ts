export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { EVALUATION_PRESETS } from "@/lib/evaluation-presets";
import { withErrorHandler } from "@/lib/api-wrapper";

// POST /api/evaluation-templates/seed
// Upsert idempotent des templates preconstruits dans la base.
// Peut etre appele par n'importe quel admin authentifie, ou au premier chargement
// de la page /evaluations/modeles.
//
// Atomique : si un upsert echoue, aucun n'est applique (etat coherent du catalogue
// de presets — pas de seed partiel).
export const POST = withErrorHandler(async (_req: NextRequest) => {
  const results = await prisma.$transaction(async (tx) => {
    return Promise.all(
      EVALUATION_PRESETS.map((preset) =>
        tx.evaluationTemplate.upsert({
          where: { id: preset.id },
          create: {
            id: preset.id,
            nom: preset.nom,
            description: preset.description,
            type: preset.type,
            icon: preset.icon,
            ordre: preset.ordre,
            preset: true,
            questions: JSON.stringify(preset.questions),
          },
          update: {
            // On met a jour les preconfigurations (si le code a evolue)
            // mais on force toujours preset=true
            nom: preset.nom,
            description: preset.description,
            type: preset.type,
            icon: preset.icon,
            ordre: preset.ordre,
            preset: true,
            questions: JSON.stringify(preset.questions),
          },
        })
      )
    );
  });
  return NextResponse.json({ seeded: results.length });
});
