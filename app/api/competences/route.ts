export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";

// GET /api/competences — referentiel de competences
export const GET = withErrorHandler(async () => {
  const competences = await prisma.competenceReferentiel.findMany({
    orderBy: { nom: "asc" },
    include: { _count: { select: { formateurs: true } } },
  });
  return NextResponse.json(competences);
});

// POST /api/competences — ajouter une competence au referentiel
// Le wrapper convertit P2002 (unique constraint) en 409.
export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = await req.json();
  const comp = await prisma.competenceReferentiel.create({
    data: {
      nom: body.nom,
      description: body.description || null,
      categorie: body.categorie || null,
    },
  });
  return NextResponse.json(comp, { status: 201 });
});
