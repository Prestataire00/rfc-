export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
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
// Audit 2026-05-19 §2.2 : auteurId/auteurNom récupérés depuis la session,
// jamais depuis le body (usurpation d'identité sinon).
export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const body = await req.json();

  // Lookup auteur depuis la DB pour le nom (session.user.name peut être vide)
  const auteur = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { nom: true, prenom: true, email: true },
  });
  const auteurNom = auteur
    ? [auteur.prenom, auteur.nom].filter(Boolean).join(" ") || auteur.email
    : session.user.email || "Utilisateur";

  const topic = await prisma.forumTopic.create({
    data: {
      titre: body.titre,
      contenu: body.contenu,
      sessionId: body.sessionId || null,
      categorie: body.categorie || null,
      auteurId: session.user.id,
      auteurNom,
    },
  });
  return NextResponse.json(topic, { status: 201 });
});
