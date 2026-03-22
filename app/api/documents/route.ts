import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    const formateurId = searchParams.get("formateurId");
    const entrepriseId = searchParams.get("entrepriseId");
    const type = searchParams.get("type");

    const where: any = {};
    if (sessionId) where.sessionId = sessionId;
    if (formateurId) where.formateurId = formateurId;
    if (entrepriseId) where.entrepriseId = entrepriseId;
    if (type) where.type = type;

    const documents = await prisma.document.findMany({
      where,
      include: {
        session: { include: { formation: { select: { titre: true } } } },
        formateur: { select: { nom: true, prenom: true } },
        entreprise: { select: { nom: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(documents);
  } catch (err: unknown) {
    console.error("Erreur GET documents:", err);
    return NextResponse.json({ error: "Erreur lors de la récupération des documents" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const document = await prisma.document.create({
      data: {
        nom: body.nom,
        type: body.type,
        chemin: body.chemin || `/documents/${Date.now()}-${body.nom}`,
        taille: body.taille || null,
        sessionId: body.sessionId || null,
        formateurId: body.formateurId || null,
        entrepriseId: body.entrepriseId || null,
      },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (err: unknown) {
    console.error("Erreur POST document:", err);
    return NextResponse.json({ error: "Erreur lors de la création du document" }, { status: 500 });
  }
}
