export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const presences = await prisma.feuillePresence.findMany({
      where: { sessionId: params.id },
      include: { contact: { select: { nom: true, prenom: true } } },
      orderBy: [{ date: "asc" }, { contactId: "asc" }],
    });
    return NextResponse.json(presences);
  } catch (err: unknown) {
    console.error("Erreur GET presence:", err);
    return NextResponse.json({ error: "Erreur lors de la récupération des présences" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { contactId, date, matin, apresMidi } = await req.json();

    if (!contactId || !date) {
      return NextResponse.json({ error: "contactId et date requis" }, { status: 400 });
    }

    // Normaliser à minuit UTC pour cohérence avec la contrainte unique
    const dateObj = new Date(`${date}T00:00:00.000Z`);

    const presence = await prisma.feuillePresence.upsert({
      where: { sessionId_contactId_date: { sessionId: params.id, contactId, date: dateObj } },
      update: { matin: !!matin, apresMidi: !!apresMidi },
      create: { sessionId: params.id, contactId, date: dateObj, matin: !!matin, apresMidi: !!apresMidi },
    });

    return NextResponse.json(presence);
  } catch (err: unknown) {
    console.error("Erreur PUT presence:", err);
    return NextResponse.json({ error: "Erreur lors de la mise à jour de la présence" }, { status: 500 });
  }
}
