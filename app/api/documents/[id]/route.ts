import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const document = await prisma.document.findUnique({
      where: { id: params.id },
      include: {
        session: { include: { formation: { select: { titre: true } } } },
        formateur: { select: { nom: true, prenom: true } },
        entreprise: { select: { nom: true } },
      },
    });

    if (!document) {
      return NextResponse.json({ error: "Document introuvable" }, { status: 404 });
    }

    return NextResponse.json(document);
  } catch (err: unknown) {
    console.error("Erreur GET document:", err);
    return NextResponse.json({ error: "Erreur lors de la récupération du document" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();

    const document = await prisma.document.update({
      where: { id: params.id },
      data: {
        nom: body.nom,
        type: body.type,
        sessionId: body.sessionId || null,
        formateurId: body.formateurId || null,
        entrepriseId: body.entrepriseId || null,
      },
    });

    return NextResponse.json(document);
  } catch (err: unknown) {
    console.error("Erreur PUT document:", err);
    return NextResponse.json({ error: "Erreur lors de la mise à jour du document" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.document.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Erreur DELETE document:", err);
    return NextResponse.json({ error: "Erreur lors de la suppression du document" }, { status: 500 });
  }
}
