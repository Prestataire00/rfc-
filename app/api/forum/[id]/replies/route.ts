export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";

// POST /api/forum/[id]/replies — ajouter une reponse
// Note : un seul write (forumReply.create), pas de tx necessaire.
export const POST = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const topic = await prisma.forumTopic.findUnique({ where: { id: params.id } });
  if (!topic) return NextResponse.json({ error: "Topic introuvable" }, { status: 404 });
  if (topic.verrouille) return NextResponse.json({ error: "Topic verrouille" }, { status: 403 });

  const body = await req.json();
  const reply = await prisma.forumReply.create({
    data: {
      topicId: params.id,
      contenu: body.contenu,
      auteurId: body.auteurId,
      auteurNom: body.auteurNom,
    },
  });
  return NextResponse.json(reply, { status: 201 });
});
