export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/historique";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const financement = await prisma.financement.findUnique({
      where: { id: params.id },
      include: {
        entreprise: { select: { id: true, nom: true } },
      },
    });

    if (!financement) {
      return NextResponse.json({ error: "Financement non trouvé" }, { status: 404 });
    }

    return NextResponse.json(financement);
  } catch (err: unknown) {
    console.error("Erreur GET financement:", err);
    return NextResponse.json({ error: "Erreur lors de la récupération du financement" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    const { type, montant, organisme, reference, statut, notes } = body;

    const financement = await prisma.financement.update({
      where: { id: params.id },
      data: {
        ...(type !== undefined && { type }),
        ...(montant !== undefined && { montant: Number(montant) }),
        ...(organisme !== undefined && { organisme: organisme || null }),
        ...(reference !== undefined && { reference: reference || null }),
        ...(statut !== undefined && { statut }),
        ...(notes !== undefined && { notes: notes || null }),
      },
    });

    await logAction({
      action: "financement_modifie",
      label: `Financement ${financement.type} modifié`,
      entrepriseId: financement.entrepriseId ?? undefined,
      userId: session.user.id,
    });

    return NextResponse.json(financement);
  } catch (err: unknown) {
    console.error("Erreur PUT financement:", err);
    return NextResponse.json({ error: "Erreur lors de la mise à jour du financement" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const financement = await prisma.financement.findUnique({
      where: { id: params.id },
    });

    if (!financement) {
      return NextResponse.json({ error: "Financement non trouvé" }, { status: 404 });
    }

    await prisma.financement.delete({ where: { id: params.id } });

    await logAction({
      action: "financement_supprime",
      label: `Financement ${financement.type} supprimé`,
      entrepriseId: financement.entrepriseId ?? undefined,
      userId: session.user.id,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Erreur DELETE financement:", err);
    return NextResponse.json({ error: "Erreur lors de la suppression du financement" }, { status: 500 });
  }
}
