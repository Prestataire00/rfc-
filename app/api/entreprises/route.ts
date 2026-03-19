import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { entrepriseSchema } from "@/lib/validations/entreprise";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";

  const entreprises = await prisma.entreprise.findMany({
    where: search
      ? {
          OR: [
            { nom: { contains: search } },
            { ville: { contains: search } },
            { secteur: { contains: search } },
          ],
        }
      : {},
    include: { _count: { select: { contacts: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(entreprises);
}

export async function POST(req: NextRequest) {
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
    const entreprise = await prisma.entreprise.create({ data });
    return NextResponse.json(entreprise, { status: 201 });
  } catch (err: unknown) {
    console.error("Entreprise creation error:", err);
    const msg = err instanceof Error && err.message.includes("Unique constraint")
      ? "Une entreprise avec ce SIRET existe déjà"
      : "Erreur lors de la création de l'entreprise";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
