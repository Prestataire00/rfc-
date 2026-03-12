import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateNumero } from "@/lib/utils";

export async function GET(req: NextRequest) {
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
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const count = await prisma.facture.count();
  const numero = generateNumero("FAC", count);

  const facture = await prisma.facture.create({
    data: {
      ...body,
      numero,
      dateEmission: new Date(),
      dateEcheance: new Date(body.dateEcheance),
    },
  });
  return NextResponse.json(facture, { status: 201 });
}
