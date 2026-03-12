import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formateurSchema } from "@/lib/validations/formateur";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const formateur = await prisma.formateur.findUnique({
    where: { id: params.id },
    include: {
      sessions: {
        include: { formation: true },
        orderBy: { dateDebut: "desc" },
      },
    },
  });
  if (!formateur) return NextResponse.json({ error: "Non trouvé" }, { status: 404 });
  return NextResponse.json(formateur);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const parsed = formateurSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { specialites, ...rest } = parsed.data;
  const formateur = await prisma.formateur.update({
    where: { id: params.id },
    data: { ...rest, specialites: JSON.stringify(specialites) },
  });
  return NextResponse.json(formateur);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.formateur.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
