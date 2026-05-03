export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";
import { parseBody } from "@/lib/validations/helpers";

const createSchema = z.object({
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

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const formateurId = searchParams.get("formateurId");
  const sessionId = searchParams.get("sessionId");

  const where: Record<string, unknown> = {};
  if (formateurId) where.formateurId = formateurId;
  if (sessionId) where.sessionId = sessionId;

  const items = await prisma.evaluationFormateur.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(items);
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = await parseBody(req, createSchema);
  const item = await prisma.evaluationFormateur.create({ data: body });
  return NextResponse.json(item, { status: 201 });
});
