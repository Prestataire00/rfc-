import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const besoin = await prisma.besoinFormation.findUnique({
    where: { id: params.id },
    include: {
      entreprise: true,
      formation: true,
      devis: { include: { lignes: true } },
    },
  });

  if (!besoin) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(besoin);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();

  const besoin = await prisma.besoinFormation.update({
    where: { id: params.id },
    data: {
      titre: body.titre,
      description: body.description || null,
      origine: body.origine,
      statut: body.statut,
      priorite: body.priorite,
      nbStagiaires: body.nbStagiaires ? parseInt(body.nbStagiaires) : null,
      datesSouhaitees: body.datesSouhaitees || null,
      budget: body.budget ? parseFloat(body.budget) : null,
      notes: body.notes || null,
      entrepriseId: body.entrepriseId || null,
      formationId: body.formationId || null,
      devisId: body.devisId || null,
    },
  });

  return NextResponse.json(besoin);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.besoinFormation.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
