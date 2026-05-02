export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";

// GET /api/forum?sessionId=xxx — liste les topics (d'une session ou generaux)
export const GET = withErrorHandler(async (req: NextRequest) => {
  const sessionId = new URL(req.url).searchParams.get("sessionId");
  const topics = await prisma.forumTopic.findMany({
    where: sessionId ? { sessionId } : { sessionId: null },
    orderBy: [{ epingle: "desc" }, { createdAt: "desc" }],
    include: { _count: { select: { replies: true } } },
  });
  return NextResponse.json(topics);
});

// POST /api/forum — creer un topic
export const POST = withErrorHandler(async (req: NextRequest) => {
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
});
