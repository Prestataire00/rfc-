export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { parsePartialBody } from "@/lib/validations/helpers";

const updateSchema = z.object({
  formateurId: z.string().min(1),
  sessionId: z.string().min(1),
  evaluatorUserId: z.string().optional().nullable(),
  noteGlobale: z.number().int().min(1).max(5),
  pointsForts: z.string().optional().nullable(),
  pointsAmelioration: z.string().optional().nullable(),
  pedagogie: z.number().int().min(1).max(5).optional().nullable(),
  maitriseTechnique: z.number().int().min(1).max(5).optional().nullable(),
  animation: z.number().int().min(1).max(5).optional().nullable(),
  commentaire: z.string().optional().nullable(),
});

export const GET = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const item = await prisma.evaluationFormateur.findUnique({
    where: { id: params.id },
    include: { formateur: true, session: { include: { formation: true } } },
  });
  if (!item) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(item);
});

export const PUT = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const body = await parsePartialBody(req, updateSchema);
  const item = await prisma.evaluationFormateur.update({ where: { id: params.id }, data: body });
  return NextResponse.json(item);
});

export const DELETE = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  await prisma.evaluationFormateur.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
});
