export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { lieuFormationSchema } from "@/lib/validations/formation";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") ?? "";
    const actif = searchParams.get("actif");

    const where = {
      AND: [
        search
          ? {
              OR: [
                { nom: { contains: search, mode: "insensitive" as const } },
                { ville: { contains: search, mode: "insensitive" as const } },
              ],
            }
          : {},
        actif !== null && actif !== "" ? { actif: actif === "true" } : {},
      ],
    };

    const lieux = await prisma.lieuFormation.findMany({
      where,
      include: { _count: { select: { sessions: true } } },
      orderBy: { nom: "asc" },
    });

    return NextResponse.json({ lieux });
  } catch (err: unknown) {
    console.error("Erreur GET lieux:", err);
    return NextResponse.json({ error: "Erreur lors de la récupération des lieux" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = lieuFormationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const lieu = await prisma.lieuFormation.create({ data: parsed.data });
    return NextResponse.json(lieu, { status: 201 });
  } catch (err: unknown) {
    console.error("Lieu creation error:", err);
    return NextResponse.json({ error: "Erreur lors de la création du lieu" }, { status: 500 });
  }
}
