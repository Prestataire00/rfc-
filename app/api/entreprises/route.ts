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

  const data = { ...parsed.data };
  if (!data.siret) delete data.siret;

  const entreprise = await prisma.entreprise.create({ data });
  return NextResponse.json(entreprise, { status: 201 });
}
