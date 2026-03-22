export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const facture = await prisma.facture.findUnique({
      where: { id: params.id },
      include: { entreprise: true, devis: { include: { lignes: true } } },
    });
    if (!facture) return NextResponse.json({ error: "Non trouvé" }, { status: 404 });
    return NextResponse.json(facture);
  } catch (err: unknown) {
    console.error("Erreur GET facture:", err);
    return NextResponse.json({ error: "Erreur lors de la récupération de la facture" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
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
  } catch (err: unknown) {
    console.error("Erreur PUT facture:", err);
    return NextResponse.json({ error: "Erreur lors de la mise à jour de la facture" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.facture.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Erreur DELETE facture:", err);
    return NextResponse.json({ error: "Erreur lors de la suppression de la facture" }, { status: 500 });
  }
}
