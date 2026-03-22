import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: Retrieve evaluation info by token (public, no auth)
export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const evaluation = await prisma.evaluation.findUnique({
      where: { tokenAcces: params.token },
      include: {
        session: {
          include: { formation: { select: { titre: true } } },
        },
        contact: { select: { nom: true, prenom: true } },
      },
    });

    if (!evaluation) {
      return NextResponse.json({ error: "Lien invalide" }, { status: 404 });
    }

    return NextResponse.json({
      id: evaluation.id,
      type: evaluation.type,
      estComplete: evaluation.estComplete,
      formation: evaluation.session.formation.titre,
      stagiaire: evaluation.contact
        ? `${evaluation.contact.prenom} ${evaluation.contact.nom}`
        : "Anonyme",
    });
  } catch (err: unknown) {
    console.error("Erreur recuperation evaluation:", err);
    return NextResponse.json({ error: "Erreur lors de la recuperation de l'evaluation" }, { status: 500 });
  }
}

// POST: Submit evaluation (public, no auth)
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const evaluation = await prisma.evaluation.findUnique({
      where: { tokenAcces: params.token },
    });

    if (!evaluation) {
      return NextResponse.json({ error: "Lien invalide" }, { status: 404 });
    }

    if (evaluation.estComplete) {
      return NextResponse.json({ error: "Cette evaluation a deja ete soumise" }, { status: 400 });
    }

    const { noteGlobale, reponses, commentaire } = await req.json();

    if (!noteGlobale || noteGlobale < 1 || noteGlobale > 5) {
      return NextResponse.json({ error: "Note globale requise (1-5)" }, { status: 400 });
    }

    await prisma.evaluation.update({
      where: { tokenAcces: params.token },
      data: {
        noteGlobale,
        reponses: JSON.stringify(reponses || {}),
        commentaire: commentaire || null,
        estComplete: true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Erreur soumission evaluation:", err);
    return NextResponse.json({ error: "Erreur lors de la soumission de l'evaluation" }, { status: 500 });
  }
}
