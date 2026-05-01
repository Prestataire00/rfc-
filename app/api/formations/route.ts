export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formationSchema } from "@/lib/validations/formation";
import { withErrorHandler } from "@/lib/api-wrapper";
import { parseBody } from "@/lib/validations/helpers";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const actif = searchParams.get("actif");
  const categorie = searchParams.get("categorie") ?? "";
  const niveau = searchParams.get("niveau") ?? "";
  const modalite = searchParams.get("modalite") ?? "";
  const statut = searchParams.get("statut") ?? "";
  const sortBy = searchParams.get("sortBy") ?? "createdAt";
  const sortOrder = (searchParams.get("sortOrder") ?? "desc") as "asc" | "desc";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 50));

  const where = {
    AND: [
      search
        ? {
            OR: [
              { titre: { contains: search, mode: "insensitive" as const } },
              { description: { contains: search, mode: "insensitive" as const } },
              { categorie: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {},
      actif !== null && actif !== "" ? { actif: actif === "true" } : {},
      categorie ? { categorie } : {},
      niveau ? { niveau } : {},
      modalite ? { modalite } : {},
      statut ? { statut } : {},
    ],
  };

  const [formations, total] = await Promise.all([
    prisma.formation.findMany({
      where,
      include: { _count: { select: { sessions: true } } },
      orderBy: sortBy === "misEnAvant"
        ? [{ misEnAvant: "desc" }, { createdAt: "desc" }]
        : { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.formation.count({ where }),
  ]);

  const categories = await prisma.formation.findMany({
    select: { categorie: true },
    distinct: ["categorie"],
    where: { categorie: { not: null } },
    orderBy: { categorie: "asc" },
  });

  return NextResponse.json({
    formations,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    categories: categories.map((c) => c.categorie).filter(Boolean),
  });
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const parsed = await parseBody(req, formationSchema);

  const cleanData = Object.fromEntries(
    Object.entries(parsed).filter(([, v]) => v !== undefined)
  );
  const formation = await prisma.formation.create({ data: cleanData as typeof parsed });
  return NextResponse.json(formation, { status: 201 });
});
