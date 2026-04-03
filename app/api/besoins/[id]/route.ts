export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const besoin = await prisma.besoinFormation.findUnique({
      where: { id: params.id },
      include: {
        entreprise: true,
        contact: { select: { id: true, nom: true, prenom: true, email: true, telephone: true, poste: true } },
        formation: true,
        devis: { include: { lignes: true } },
      },
    });

    if (!besoin) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(besoin);
  } catch (err: unknown) {
    console.error("Erreur GET besoin:", err);
    return NextResponse.json({ error: "Erreur lors de la récupération du besoin" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
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
        contactId: body.contactId || null,
        formationId: body.formationId || null,
        devisId: body.devisId || null,
      },
    });

    return NextResponse.json(besoin);
  } catch (err: unknown) {
    console.error("Erreur PUT besoin:", err);
    return NextResponse.json({ error: "Erreur lors de la mise à jour du besoin" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (body.devisId !== undefined) data.devisId = body.devisId || null;
    if (body.statut !== undefined) data.statut = body.statut;
    const besoin = await prisma.besoinFormation.update({ where: { id: params.id }, data });
    return NextResponse.json(besoin);
  } catch (err: unknown) {
    console.error("Erreur PATCH besoin:", err);
    return NextResponse.json({ error: "Erreur lors de la mise à jour du besoin" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.besoinFormation.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Erreur DELETE besoin:", err);
    return NextResponse.json({ error: "Erreur lors de la suppression du besoin" }, { status: 500 });
  }
}
