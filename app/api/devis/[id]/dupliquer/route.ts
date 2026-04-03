export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateNumero } from "@/lib/utils";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const original = await prisma.devis.findUnique({
      where: { id: params.id },
      include: { lignes: true },
    });

    if (!original) {
      return NextResponse.json({ error: "Devis introuvable" }, { status: 404 });
    }

    const allDevis = await prisma.devis.findMany({ select: { numero: true } });
    const maxNum = allDevis.reduce((max, d) => {
      const n = parseInt(d.numero.split("-").pop() || "0");
      return n > max ? n : max;
    }, 0);
    const numero = generateNumero("DEV", maxNum);

    const now = new Date();
    const dateValidite = new Date(now);
    dateValidite.setDate(dateValidite.getDate() + 30);

    const copie = await prisma.devis.create({
      data: {
        numero,
        objet: `Copie - ${original.objet}`,
        statut: "brouillon",
        montantHT: original.montantHT,
        tauxTVA: original.tauxTVA,
        montantTTC: original.montantTTC,
        dateEmission: now,
        dateValidite,
        notes: original.notes,
        entrepriseId: original.entrepriseId,
        contactId: original.contactId,
        lignes: {
          create: original.lignes.map(({ id: _, devisId: __, ...l }) => l),
        },
      },
    });

    return NextResponse.json(copie, { status: 201 });
  } catch (err: unknown) {
    console.error("Erreur duplication devis:", err);
    return NextResponse.json({ error: "Erreur lors de la duplication du devis" }, { status: 500 });
  }
}
