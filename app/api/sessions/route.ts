import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sessionSchema } from "@/lib/validations/session";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const statut = searchParams.get("statut") ?? "";
  const formationId = searchParams.get("formationId") ?? "";

  const sessions = await prisma.session.findMany({
    where: {
      AND: [
        statut ? { statut } : {},
        formationId ? { formationId } : {},
      ],
    },
    include: {
      formation: { select: { id: true, titre: true, tarif: true } },
      formateur: { select: { id: true, nom: true, prenom: true } },
      _count: { select: { inscriptions: true } },
    },
    orderBy: { dateDebut: "asc" },
  });

  return NextResponse.json(sessions);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = sessionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { dateDebut, dateFin, formateurId, ...rest } = parsed.data;
  const session = await prisma.session.create({
    data: {
      ...rest,
      dateDebut: new Date(dateDebut),
      dateFin: new Date(dateFin),
      ...(formateurId ? { formateurId } : {}),
    },
  });
  return NextResponse.json(session, { status: 201 });
}
