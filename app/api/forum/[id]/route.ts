export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";

// GET /api/forum/[id] — detail du topic + replies
export const GET = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const topic = await prisma.forumTopic.findUnique({
    where: { id: params.id },
    include: { replies: { orderBy: { createdAt: "asc" } } },
  });
  if (!topic) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(topic);
});

// PUT /api/forum/[id] — moderation (epingler, verrouiller, supprimer)
export const PUT = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const body = await req.json();
  const topic = await prisma.forumTopic.update({
    where: { id: params.id },
    data: {
      epingle: body.epingle ?? undefined,
      verrouille: body.verrouille ?? undefined,
      titre: body.titre ?? undefined,
      contenu: body.contenu ?? undefined,
    },
  });
  return NextResponse.json(topic);
});

// DELETE /api/forum/[id]
export const DELETE = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  await prisma.forumTopic.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
});
