export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formationSchema } from "@/lib/validations/formation";

export async function GET(req: NextRequest) {
  try {
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

    // Get distinct categories for filter
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
  } catch (err: unknown) {
    console.error("Erreur lors de la récupération des formations:", err);
    return NextResponse.json({ error: "Erreur lors de la récupération des formations" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = formationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const formation = await prisma.formation.create({ data: parsed.data });
    return NextResponse.json(formation, { status: 201 });
  } catch (err: unknown) {
    console.error("Formation creation error:", err);
    return NextResponse.json({ error: "Erreur lors de la création de la formation" }, { status: 500 });
  }
}
