export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET /api/notes-frais — liste les notes (formateur: les siennes, admin: toutes)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Non autorise" }, { status: 401 });

    const statut = new URL(req.url).searchParams.get("statut");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (statut) where.statut = statut;

    // Formateur : ses propres notes uniquement
    if (session.user.role === "formateur" && session.user.formateurId) {
      where.formateurId = session.user.formateurId;
    }

    const notes = await prisma.noteFrais.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { formateur: { select: { nom: true, prenom: true } } },
    });
    return NextResponse.json(notes);
  } catch (err) {
    console.error("GET notes-frais:", err);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}

// POST /api/notes-frais — creer une note de frais
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Non autorise" }, { status: 401 });

    const body = await req.json();
    const formateurId = body.formateurId || session.user.formateurId;
    if (!formateurId) return NextResponse.json({ error: "formateurId requis" }, { status: 400 });

    const note = await prisma.noteFrais.create({
      data: {
        formateurId,
        sessionId: body.sessionId || null,
        categorie: body.categorie || "autre",
        description: body.description || "",
        montant: body.montant || 0,
        date: body.date ? new Date(body.date) : new Date(),
        lieu: body.lieu || null,
        justificatifUrl: body.justificatifUrl || null,
        justificatifNom: body.justificatifNom || null,
      },
    });
    return NextResponse.json(note, { status: 201 });
  } catch (err) {
    console.error("POST notes-frais:", err);
    return NextResponse.json({ error: "Erreur creation" }, { status: 500 });
  }
}
