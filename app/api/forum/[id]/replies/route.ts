export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";

const forumReplyCreateSchema = z.object({
  contenu: z.string().min(1, "Contenu requis").max(20000),
  auteurId: z.string().min(1, "auteurId requis"),
  auteurNom: z.string().min(1, "auteurNom requis").max(200),
});

// POST /api/forum/[id]/replies — ajouter une reponse
// Note : un seul write (forumReply.create), pas de tx necessaire.
export const POST = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const topic = await prisma.forumTopic.findUnique({ where: { id: params.id } });
  if (!topic) return NextResponse.json({ error: "Topic introuvable" }, { status: 404 });
  if (topic.verrouille) return NextResponse.json({ error: "Topic verrouille" }, { status: 403 });

  const raw = await req.json().catch(() => null);
  const parsed = forumReplyCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }
  const reply = await prisma.forumReply.create({
    data: {
      topicId: params.id,
      contenu: parsed.data.contenu,
      auteurId: parsed.data.auteurId,
      auteurNom: parsed.data.auteurNom,
    },
  });
  return NextResponse.json(reply, { status: 201 });
});
