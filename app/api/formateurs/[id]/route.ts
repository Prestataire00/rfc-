export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formateurSchema } from "@/lib/validations/formateur";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
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
  } catch (err: unknown) {
    console.error("Erreur GET formateur:", err);
    return NextResponse.json({ error: "Erreur lors de la récupération du formateur" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const parsed = formateurSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const { specialites, ...rest } = parsed.data;
    const formateur = await prisma.formateur.update({
      where: { id: params.id },
      data: { ...rest, specialites: JSON.stringify(specialites) },
    });
    return NextResponse.json(formateur);
  } catch (err: unknown) {
    console.error("Erreur PUT formateur:", err);
    return NextResponse.json({ error: "Erreur lors de la mise à jour du formateur" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.formateur.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Erreur DELETE formateur:", err);
    return NextResponse.json({ error: "Erreur lors de la suppression du formateur" }, { status: 500 });
  }
}
