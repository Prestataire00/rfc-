export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";

const forumTopicUpdateSchema = z.object({
  epingle: z.boolean().optional().nullable(),
  verrouille: z.boolean().optional().nullable(),
  titre: z.string().min(1).max(300).optional().nullable(),
  contenu: z.string().min(1).max(20000).optional().nullable(),
});

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
  const raw = await req.json().catch(() => null);
  const parsed = forumTopicUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }
  const body = parsed.data;
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
