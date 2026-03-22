export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sessionSchema } from "@/lib/validations/session";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await prisma.session.findUnique({
      where: { id: params.id },
      include: {
        formation: true,
        formateur: true,
        inscriptions: {
          include: { contact: { include: { entreprise: { select: { nom: true } } } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!session) return NextResponse.json({ error: "Non trouvé" }, { status: 404 });
    return NextResponse.json(session);
  } catch (err: unknown) {
    console.error("Erreur GET session:", err);
    return NextResponse.json({ error: "Erreur lors de la récupération de la session" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const parsed = sessionSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const { dateDebut, dateFin, formateurId, ...rest } = parsed.data;
    const session = await prisma.session.update({
      where: { id: params.id },
      data: {
        ...rest,
        dateDebut: new Date(dateDebut),
        dateFin: new Date(dateFin),
        formateurId: formateurId ?? null,
      },
    });
    return NextResponse.json(session);
  } catch (err: unknown) {
    console.error("Erreur PUT session:", err);
    return NextResponse.json({ error: "Erreur lors de la mise à jour de la session" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.session.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Erreur DELETE session:", err);
    return NextResponse.json({ error: "Erreur lors de la suppression de la session" }, { status: 500 });
  }
}
