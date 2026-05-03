export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";
import { parseBody } from "@/lib/validations/helpers";

const createSchema = z.object({
  nom: z.string().min(1),
  description: z.string().optional().nullable(),
  sessionId: z.string().optional().nullable(),
  userId: z.string().optional().nullable(),
  couleur: z.string().optional(),
});

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");
  const userId = searchParams.get("userId");

  const where: Record<string, unknown> = {};
  if (sessionId) where.sessionId = sessionId;
  if (userId) where.userId = userId;

  const lists = await prisma.taskList.findMany({
    where,
    include: { _count: { select: { items: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(lists);
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = await parseBody(req, createSchema);
  const list = await prisma.taskList.create({ data: body });
  return NextResponse.json(list, { status: 201 });
});
