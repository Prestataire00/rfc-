export const dynamic = "force-dynamic";
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

    const stagiaire = evaluation.contact
      ? `${evaluation.contact.prenom} ${evaluation.contact.nom}`
      : "Anonyme";

    // Detect custom template questions stored in reponses
    let customQuestions: unknown[] | null = null;
    try {
      const parsed = JSON.parse(evaluation.reponses);
      if (
        Array.isArray(parsed) &&
        parsed.length > 0 &&
        typeof parsed[0] === "object" &&
        "type" in parsed[0] &&
        "label" in parsed[0]
      ) {
        customQuestions = parsed;
      }
    } catch {
      // not custom
    }

    if (customQuestions) {
      return NextResponse.json({
        id: evaluation.id,
        type: evaluation.type,
        estComplete: evaluation.estComplete,
        formation: evaluation.session.formation.titre,
        stagiaire,
        isCustom: true,
        questions: customQuestions,
      });
    }

    // Old format: fetch questionnaire sections
    const config = await prisma.questionnaireConfig.findUnique({ where: { id: "default" } });
    const sections = evaluation.type === "satisfaction_froid"
      ? (config?.froid ?? [])
      : (config?.chaud ?? []);

    return NextResponse.json({
      id: evaluation.id,
      type: evaluation.type,
      estComplete: evaluation.estComplete,
      formation: evaluation.session.formation.titre,
      stagiaire,
      isCustom: false,
      sections,
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

    const body = await req.json();
    const { noteGlobale, reponses, commentaire, isCustom } = body;

    if (!isCustom && (!noteGlobale || noteGlobale < 1 || noteGlobale > 5)) {
      return NextResponse.json({ error: "Note globale requise (1-5)" }, { status: 400 });
    }

    // For custom evaluations, derive noteGlobale from the first note-type answer
    let finalNote: number | null = noteGlobale || null;
    if (isCustom && Array.isArray(reponses)) {
      const firstNote = reponses.find(
        (r: { type: string; valeur: unknown }) => r.type === "note" && r.valeur !== null
      );
      if (firstNote) finalNote = firstNote.valeur as number;
    }

    await prisma.evaluation.update({
      where: { tokenAcces: params.token },
      data: {
        noteGlobale: finalNote,
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
