import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formationSchema } from "@/lib/validations/formation";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const formation = await prisma.formation.findUnique({
    where: { id: params.id },
    include: { sessions: { include: { formateur: true, _count: { select: { inscriptions: true } } }, orderBy: { dateDebut: "desc" } } },
  });
  if (!formation) return NextResponse.json({ error: "Non trouvé" }, { status: 404 });
  return NextResponse.json(formation);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const parsed = formationSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const formation = await prisma.formation.update({ where: { id: params.id }, data: parsed.data });
  return NextResponse.json(formation);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.formation.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
