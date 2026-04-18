export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/competences — referentiel de competences
export async function GET() {
  try {
    const competences = await prisma.competenceReferentiel.findMany({
      orderBy: { nom: "asc" },
      include: { _count: { select: { formateurs: true } } },
    });
    return NextResponse.json(competences);
  } catch (err) {
    console.error("GET competences:", err);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}

// POST /api/competences — ajouter une competence au referentiel
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const comp = await prisma.competenceReferentiel.create({
      data: {
        nom: body.nom,
        description: body.description || null,
        categorie: body.categorie || null,
      },
    });
    return NextResponse.json(comp, { status: 201 });
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "Cette competence existe deja" }, { status: 409 });
    }
    console.error("POST competences:", err);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}
