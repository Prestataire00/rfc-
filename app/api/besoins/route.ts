import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const statut = searchParams.get("statut");

  const where: any = {};
  if (statut) where.statut = statut;

  const besoins = await prisma.besoinFormation.findMany({
    where,
    include: {
      entreprise: { select: { id: true, nom: true } },
      formation: { select: { id: true, titre: true } },
      devis: { select: { id: true, numero: true, statut: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(besoins);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const besoin = await prisma.besoinFormation.create({
    data: {
      titre: body.titre,
      description: body.description || null,
      origine: body.origine || "client",
      statut: body.statut || "nouveau",
      priorite: body.priorite || "normale",
      nbStagiaires: body.nbStagiaires ? parseInt(body.nbStagiaires) : null,
      datesSouhaitees: body.datesSouhaitees || null,
      budget: body.budget ? parseFloat(body.budget) : null,
      notes: body.notes || null,
      entrepriseId: body.entrepriseId || null,
      formationId: body.formationId || null,
    },
  });

  return NextResponse.json(besoin, { status: 201 });
}
