export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formationSchema } from "@/lib/validations/formation";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const formation = await prisma.formation.findUnique({
      where: { id: params.id },
      include: {
        sessions: {
          include: {
            formateur: true,
            lieuFormation: true,
            _count: { select: { inscriptions: true } },
          },
          orderBy: { dateDebut: "desc" },
        },
      },
    });
    if (!formation) return NextResponse.json({ error: "Non trouvé" }, { status: 404 });
    return NextResponse.json(formation);
  } catch (err: unknown) {
    console.error("Erreur GET formation:", err);
    return NextResponse.json({ error: "Erreur lors de la récupération de la formation" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const parsed = formationSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const cleanData = Object.fromEntries(
      Object.entries(parsed.data).filter(([, v]) => v !== undefined)
    );
    const formation = await prisma.formation.update({ where: { id: params.id }, data: cleanData as typeof parsed.data });
    return NextResponse.json(formation);
  } catch (err: unknown) {
    console.error("Erreur PUT formation:", err);
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.formation.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Erreur DELETE formation:", err);
    return NextResponse.json({ error: "Erreur lors de la suppression de la formation" }, { status: 500 });
  }
}
