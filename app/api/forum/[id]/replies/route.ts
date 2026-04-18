export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/forum/[id]/replies — ajouter une reponse
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
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
  } catch (err) {
    console.error("POST forum/[id]/replies:", err);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}
