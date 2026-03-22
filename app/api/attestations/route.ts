export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    const contactId = searchParams.get("contactId");

    const where: any = {};
    if (sessionId) where.sessionId = sessionId;
    if (contactId) where.contactId = contactId;

    const attestations = await prisma.attestation.findMany({
      where,
      include: {
        session: { include: { formation: { select: { titre: true } } } },
        contact: { select: { id: true, nom: true, prenom: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(attestations);
  } catch (err: unknown) {
    console.error("Erreur GET attestations:", err);
    return NextResponse.json({ error: "Erreur lors de la récupération des attestations" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const attestation = await prisma.attestation.create({
      data: {
        sessionId: body.sessionId,
        contactId: body.contactId,
        type: body.type || "fin_formation",
        statut: "generee",
      },
    });

    return NextResponse.json(attestation, { status: 201 });
  } catch (err: unknown) {
    console.error("Erreur POST attestation:", err);
    return NextResponse.json({ error: "Erreur lors de la création de l'attestation" }, { status: 500 });
  }
}
