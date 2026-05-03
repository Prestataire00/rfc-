export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { parsePartialBody } from "@/lib/validations/helpers";

const updateSchema = z.object({
  nom: z.string().min(1),
  description: z.string().optional().nullable(),
  sessionId: z.string().optional().nullable(),
  userId: z.string().optional().nullable(),
  couleur: z.string().optional(),
});

export const GET = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const list = await prisma.taskList.findUnique({
    where: { id: params.id },
    include: {
      items: { orderBy: { ordre: "asc" } },
      session: true,
    },
  });
  if (!list) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(list);
});

export const PUT = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const body = await parsePartialBody(req, updateSchema);
  const list = await prisma.taskList.update({ where: { id: params.id }, data: body });
  return NextResponse.json(list);
});

export const DELETE = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  await prisma.taskList.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
});
