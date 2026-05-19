export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";

const evaluationUpdateSchema = z.object({
  noteGlobale: z.union([z.number(), z.string()]).optional().nullable(),
  reponses: z.unknown().optional(),
  commentaire: z.string().max(5000).optional().nullable(),
  estComplete: z.boolean().optional(),
});

export const GET = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const evaluation = await prisma.evaluation.findUnique({
    where: { id: params.id },
    include: {
      session: { include: { formation: true, formateur: true } },
      contact: true,
    },
  });
  if (!evaluation) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(evaluation);
});

export const PUT = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const raw = await req.json().catch(() => null);
  const parsed = evaluationUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }
  const body = parsed.data;

  const evaluation = await prisma.evaluation.update({
    where: { id: params.id },
    data: {
      noteGlobale: body.noteGlobale ? parseInt(String(body.noteGlobale)) : null,
      reponses: body.reponses ? JSON.stringify(body.reponses) : undefined,
      commentaire: body.commentaire || null,
      estComplete: body.estComplete ?? false,
    },
  });

  return NextResponse.json(evaluation);
});
