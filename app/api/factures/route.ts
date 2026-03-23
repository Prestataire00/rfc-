export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateNumero } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const statut = searchParams.get("statut") ?? "";

    const factures = await prisma.facture.findMany({
      where: statut ? { statut } : {},
      include: {
        entreprise: { select: { id: true, nom: true } },
        devis: { select: { id: true, numero: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(factures);
  } catch (err: unknown) {
    console.error("Erreur GET factures:", err);
    return NextResponse.json({ error: "Erreur lors de la récupération des factures" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const allFactures = await prisma.facture.findMany({ select: { numero: true } });
    const maxNum = allFactures.reduce((max, f) => {
      const n = parseInt(f.numero.split("-").pop() || "0");
      return n > max ? n : max;
    }, 0);
    const numero = generateNumero("FAC", maxNum);

    const facture = await prisma.facture.create({
      data: {
        ...body,
        numero,
        dateEmission: new Date(),
        dateEcheance: new Date(body.dateEcheance),
      },
    });
    return NextResponse.json(facture, { status: 201 });
  } catch (err: unknown) {
    console.error("Erreur POST facture:", err);
    return NextResponse.json({ error: "Erreur lors de la création de la facture" }, { status: 500 });
  }
}
