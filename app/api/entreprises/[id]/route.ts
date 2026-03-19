import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { entrepriseSchema } from "@/lib/validations/entreprise";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const entreprise = await prisma.entreprise.findUnique({
    where: { id: params.id },
    include: {
      contacts: true,
      devis: { orderBy: { createdAt: "desc" } },
      factures: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!entreprise) return NextResponse.json({ error: "Non trouvé" }, { status: 404 });
  return NextResponse.json(entreprise);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const parsed = entrepriseSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = {
    nom: parsed.data.nom,
    siret: parsed.data.siret || null,
    email: parsed.data.email || null,
    telephone: parsed.data.telephone || null,
    site: parsed.data.site || null,
    secteur: parsed.data.secteur || null,
    adresse: parsed.data.adresse || null,
    ville: parsed.data.ville || null,
    codePostal: parsed.data.codePostal || null,
    notes: parsed.data.notes || null,
  };

  try {
    const entreprise = await prisma.entreprise.update({
      where: { id: params.id },
      data,
    });
    return NextResponse.json(entreprise);
  } catch (err: unknown) {
    console.error("Entreprise update error:", err);
    return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.entreprise.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
