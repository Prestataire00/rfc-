export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { entrepriseSchema } from "@/lib/validations/entreprise";
import { withErrorHandler } from "@/lib/api-wrapper";
import { parseBody } from "@/lib/validations/helpers";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  // type=client → entreprises ayant au moins un contact type=client
  // type=organisme → entreprises marquées comme organisme tier (notes/secteur)
  const type = searchParams.get("type");

  const whereClauses: Record<string, unknown>[] = [];
  if (search) {
    whereClauses.push({
      OR: [
        { nom: { contains: search } },
        { ville: { contains: search } },
        { secteur: { contains: search } },
      ],
    });
  }
  if (type === "client") {
    whereClauses.push({ contacts: { some: { type: "client" } } });
  } else if (type === "organisme") {
    // Marqueur historique posé par POST /api/prospects quand prospectType=organisme
    whereClauses.push({
      OR: [
        { notes: { contains: "[Type: Organisme" } },
        { secteur: { startsWith: "Organisme :" } },
      ],
    });
  }

  const entreprises = await prisma.entreprise.findMany({
    where: whereClauses.length > 0 ? { AND: whereClauses } : {},
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
