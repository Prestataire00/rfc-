export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/historique";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const entrepriseId = searchParams.get("entrepriseId");

    const financements = await prisma.financement.findMany({
      where: entrepriseId ? { entrepriseId } : {},
      include: {
        entreprise: { select: { id: true, nom: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(financements);
  } catch (err: unknown) {
    console.error("Erreur GET financements:", err);
    return NextResponse.json({ error: "Erreur lors de la récupération des financements" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    const { type, montant, organisme, reference, statut, notes, entrepriseId } = body;

    if (!type || montant == null || !entrepriseId) {
      return NextResponse.json(
        { error: "Les champs type, montant et entrepriseId sont requis" },
        { status: 400 }
      );
    }

    const financement = await prisma.financement.create({
      data: {
        type,
        montant: Number(montant),
        organisme: organisme || null,
        reference: reference || null,
        statut: statut || "en_cours",
        notes: notes || null,
        entrepriseId,
      },
    });

    await logAction({
      action: "financement_cree",
      label: `Financement ${type} créé — ${montant} €`,
      entrepriseId,
      userId: session.user.id,
    });

    return NextResponse.json(financement, { status: 201 });
  } catch (err: unknown) {
    console.error("Erreur POST financement:", err);
    return NextResponse.json({ error: "Erreur lors de la création du financement" }, { status: 500 });
  }
}
