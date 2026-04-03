export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { devisSchema } from "@/lib/validations/devis";
import { generateNumero, formatCurrency } from "@/lib/utils";
import { logAction } from "@/lib/historique";

export async function GET(req: NextRequest) {
  try {
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
  } catch (err: unknown) {
    console.error("Erreur lors de la récupération des devis:", err);
    return NextResponse.json({ error: "Erreur lors de la récupération des devis" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = devisSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const allDevis = await prisma.devis.findMany({ select: { numero: true } });
  const maxNum = allDevis.reduce((max, d) => {
    const n = parseInt(d.numero.split("-").pop() || "0");
    return n > max ? n : max;
  }, 0);
  const numero = generateNumero("DEV", maxNum);

  const { lignes, dateValidite, entrepriseId, contactId, tauxTVA, ...rest } = parsed.data;
  const montantHT = lignes.reduce((sum, l) => sum + l.montant, 0);
  const montantTTC = montantHT * (1 + tauxTVA / 100);

  try {
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
        lignes: { create: lignes.map(({ id: _, ...l }) => l) },
      },
      include: { lignes: true },
    });

    try {
      await logAction({
        action: "devis_cree",
        label: "Devis " + numero + " créé (" + formatCurrency(montantTTC) + ")",
        lien: "/commercial/devis/" + devis.id,
        entrepriseId: devis.entrepriseId ?? undefined,
        contactId: devis.contactId ?? undefined,
        devisId: devis.id,
      });
    } catch {}

    return NextResponse.json(devis, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Devis creation error:", message);
    return NextResponse.json({ error: `Erreur lors de la création du devis: ${message.split("\n").pop()}` }, { status: 500 });
  }
}
