export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { parsePartialBody } from "@/lib/validations/helpers";

const updateSchema = z.object({
  sujet: z.string().optional().nullable(),
});

export const GET = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: params.id },
    include: {
      participants: {
        include: { user: { select: { id: true, nom: true, prenom: true, email: true } } },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });
  if (!conversation) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(conversation);
});

export const PUT = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const body = await parsePartialBody(req, updateSchema);
  const conversation = await prisma.conversation.update({
    where: { id: params.id },
    data: body,
  });
  return NextResponse.json(conversation);
});

export const DELETE = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  await prisma.conversation.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
});
