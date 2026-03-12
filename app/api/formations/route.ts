import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formationSchema } from "@/lib/validations/formation";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const actif = searchParams.get("actif");

  const formations = await prisma.formation.findMany({
    where: {
      AND: [
        search ? { titre: { contains: search } } : {},
        actif !== null ? { actif: actif === "true" } : {},
      ],
    },
    include: { _count: { select: { sessions: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(formations);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = formationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const formation = await prisma.formation.create({ data: parsed.data });
  return NextResponse.json(formation, { status: 201 });
}
