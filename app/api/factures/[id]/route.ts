import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const facture = await prisma.facture.findUnique({
    where: { id: params.id },
    include: { entreprise: true, devis: { include: { lignes: true } } },
  });
  if (!facture) return NextResponse.json({ error: "Non trouvé" }, { status: 404 });
  return NextResponse.json(facture);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const facture = await prisma.facture.update({
    where: { id: params.id },
    data: {
      ...body,
      ...(body.dateEcheance ? { dateEcheance: new Date(body.dateEcheance) } : {}),
      ...(body.datePaiement ? { datePaiement: new Date(body.datePaiement) } : {}),
    },
  });
  return NextResponse.json(facture);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.facture.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
