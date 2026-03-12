import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
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
}

export async function POST(req: NextRequest) {
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
}
