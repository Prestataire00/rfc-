import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

// Generate evaluation tokens for all participants of a session
export async function POST(req: NextRequest) {
  const { sessionId, type } = await req.json();

  if (!sessionId || !type) {
    return NextResponse.json({ error: "sessionId et type requis" }, { status: 400 });
  }

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      inscriptions: {
        where: { statut: { in: ["confirmee", "presente"] } },
        include: { contact: true },
      },
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Session introuvable" }, { status: 404 });
  }

  const evaluations = [];

  for (const inscription of session.inscriptions) {
    // Check if evaluation already exists
    const existing = await prisma.evaluation.findFirst({
      where: {
        sessionId,
        contactId: inscription.contactId,
        type,
      },
    });

    if (existing) {
      evaluations.push(existing);
      continue;
    }

    const token = randomBytes(32).toString("hex");
    const evaluation = await prisma.evaluation.create({
      data: {
        type,
        cible: "stagiaire",
        sessionId,
        contactId: inscription.contactId,
        tokenAcces: token,
      },
    });
    evaluations.push(evaluation);
  }

  return NextResponse.json({
    count: evaluations.length,
    evaluations: evaluations.map((e) => ({
      id: e.id,
      contactId: e.contactId,
      token: e.tokenAcces,
      estComplete: e.estComplete,
    })),
  });
}
