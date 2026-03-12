import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { devisSchema } from "@/lib/validations/devis";
import { generateNumero } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const statut = searchParams.get("statut") ?? "";

  const devis = await prisma.devis.findMany({
    where: statut ? { statut } : {},
    include: {
      entreprise: { select: { id: true, nom: true } },
      contact: { select: { id: true, nom: true, prenom: true } },
      lignes: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(devis);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = devisSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const count = await prisma.devis.count();
  const numero = generateNumero("DEV", count);

  const { lignes, dateValidite, entrepriseId, contactId, tauxTVA, ...rest } = parsed.data;
  const montantHT = lignes.reduce((sum, l) => sum + l.montant, 0);
  const montantTTC = montantHT * (1 + tauxTVA / 100);

  const devis = await prisma.devis.create({
    data: {
      ...rest,
      numero,
      tauxTVA,
      montantHT,
      montantTTC,
      dateValidite: new Date(dateValidite),
      entrepriseId: entrepriseId || null,
      contactId: contactId || null,
      lignes: { create: lignes },
    },
    include: { lignes: true },
  });

  return NextResponse.json(devis, { status: 201 });
}
