export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { entrepriseSchema } from "@/lib/validations/entreprise";
import { withErrorHandler } from "@/lib/api-wrapper";
import { parseBody } from "@/lib/validations/helpers";

export const GET = withErrorHandler(async (req: NextRequest) => {
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
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const parsed = await parseBody(req, entrepriseSchema);

  const data = {
    nom: parsed.nom,
    siret: parsed.siret || null,
    email: parsed.email || null,
    telephone: parsed.telephone || null,
    site: parsed.site || null,
    secteur: parsed.secteur || null,
    adresse: parsed.adresse || null,
    ville: parsed.ville || null,
    codePostal: parsed.codePostal || null,
    notes: parsed.notes || null,
  };

  const entreprise = await prisma.entreprise.create({ data });
  return NextResponse.json(entreprise, { status: 201 });
});
