export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/forum?sessionId=xxx — liste les topics (d'une session ou generaux)
export async function GET(req: NextRequest) {
  try {
    const sessionId = new URL(req.url).searchParams.get("sessionId");
    const topics = await prisma.forumTopic.findMany({
      where: sessionId ? { sessionId } : { sessionId: null },
      orderBy: [{ epingle: "desc" }, { createdAt: "desc" }],
      include: { _count: { select: { replies: true } } },
    });
    return NextResponse.json(topics);
  } catch (err) {
    console.error("GET forum:", err);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}

// POST /api/forum — creer un topic
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const topic = await prisma.forumTopic.create({
      data: {
        titre: body.titre,
        contenu: body.contenu,
        sessionId: body.sessionId || null,
        categorie: body.categorie || null,
        auteurId: body.auteurId,
        auteurNom: body.auteurNom,
      },
    });
    return NextResponse.json(topic, { status: 201 });
  } catch (err) {
    console.error("POST forum:", err);
    return NextResponse.json({ error: "Erreur creation" }, { status: 500 });
  }
}
