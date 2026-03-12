import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const inscriptions = await prisma.inscription.findMany({
    where: { sessionId: params.id },
    include: {
      contact: { include: { entreprise: { select: { nom: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(inscriptions);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { contactId, statut = "en_attente", notes } = body;

  if (!contactId) {
    return NextResponse.json({ error: "contactId requis" }, { status: 400 });
  }

  // Check capacity
  const session = await prisma.session.findUnique({
    where: { id: params.id },
    include: { _count: { select: { inscriptions: true } } },
  });

  if (!session) return NextResponse.json({ error: "Session non trouvée" }, { status: 404 });

  if (session._count.inscriptions >= session.capaciteMax) {
    return NextResponse.json({ error: "Session complète" }, { status: 409 });
  }

  // Check duplicate
  const existing = await prisma.inscription.findUnique({
    where: { contactId_sessionId: { contactId, sessionId: params.id } },
  });

  if (existing) {
    return NextResponse.json({ error: "Contact déjà inscrit" }, { status: 409 });
  }

  const inscription = await prisma.inscription.create({
    data: { contactId, sessionId: params.id, statut, notes },
    include: { contact: true },
  });

  return NextResponse.json(inscription, { status: 201 });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { inscriptionId, statut } = body;

  if (!inscriptionId || !statut) {
    return NextResponse.json({ error: "inscriptionId et statut requis" }, { status: 400 });
  }

  const inscription = await prisma.inscription.update({
    where: { id: inscriptionId },
    data: { statut },
  });

  return NextResponse.json(inscription);
}
