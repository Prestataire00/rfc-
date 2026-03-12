import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { entrepriseSchema } from "@/lib/validations/entreprise";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const entreprise = await prisma.entreprise.findUnique({
    where: { id: params.id },
    include: {
      contacts: true,
      devis: { orderBy: { createdAt: "desc" } },
      factures: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!entreprise) return NextResponse.json({ error: "Non trouvé" }, { status: 404 });
  return NextResponse.json(entreprise);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const parsed = entrepriseSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = { ...parsed.data };
  if (!data.siret) delete data.siret;

  const entreprise = await prisma.entreprise.update({
    where: { id: params.id },
    data,
  });
  return NextResponse.json(entreprise);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.entreprise.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
