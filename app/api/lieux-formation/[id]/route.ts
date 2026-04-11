export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { lieuFormationSchema } from "@/lib/validations/formation";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const lieu = await prisma.lieuFormation.findUnique({
      where: { id: params.id },
      include: {
        sessions: {
          include: {
            formation: true,
            formateur: true,
            _count: { select: { inscriptions: true } },
          },
          orderBy: { dateDebut: "desc" },
        },
      },
    });
    if (!lieu) return NextResponse.json({ error: "Non trouvé" }, { status: 404 });
    return NextResponse.json(lieu);
  } catch (err: unknown) {
    console.error("Erreur GET lieu:", err);
    return NextResponse.json({ error: "Erreur lors de la récupération du lieu" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const parsed = lieuFormationSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const lieu = await prisma.lieuFormation.update({ where: { id: params.id }, data: parsed.data });
    return NextResponse.json(lieu);
  } catch (err: unknown) {
    console.error("Erreur PUT lieu:", err);
    return NextResponse.json({ error: "Erreur lors de la mise à jour du lieu" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.lieuFormation.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Erreur DELETE lieu:", err);
    return NextResponse.json({ error: "Erreur lors de la suppression du lieu" }, { status: 500 });
  }
}
