export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { withErrorHandlerParams } from "@/lib/api-wrapper";

// POST /api/evaluation-templates/[id]/dupliquer
// Cree une copie custom (preset=false) d'un template existant.
// Fonctionne pour les presets ET les customs.
// Note : un seul write — deja atomique, pas de tx necessaire.
export const POST = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const source = await prisma.evaluationTemplate.findUnique({ where: { id: params.id } });
  if (!source) return NextResponse.json({ error: "Template introuvable" }, { status: 404 });

  const copy = await prisma.evaluationTemplate.create({
    data: {
      id: "custom_" + randomUUID(),
      nom: `Copie de ${source.nom}`,
      description: source.description,
      type: source.type,
      questions: source.questions,
      icon: source.icon,
      ordre: 0,
      preset: false,
    },
  });

  return NextResponse.json(copy, { status: 201 });
});
