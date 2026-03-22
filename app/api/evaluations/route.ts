import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    const type = searchParams.get("type");

    const where: any = {};
    if (sessionId) where.sessionId = sessionId;
    if (type) where.type = type;

    const evaluations = await prisma.evaluation.findMany({
      where,
      include: {
        session: {
          include: {
            formation: { select: { titre: true } },
          },
        },
        contact: { select: { id: true, nom: true, prenom: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(evaluations);
  } catch (err: unknown) {
    console.error("Erreur GET évaluations:", err);
    return NextResponse.json({ error: "Erreur lors de la récupération des évaluations" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const token = randomBytes(32).toString("hex");

    const evaluation = await prisma.evaluation.create({
      data: {
        type: body.type,
        cible: body.cible,
        sessionId: body.sessionId,
        contactId: body.contactId || null,
        tokenAcces: token,
      },
    });

    return NextResponse.json(evaluation, { status: 201 });
  } catch (err: unknown) {
    console.error("Erreur POST évaluation:", err);
    return NextResponse.json({ error: "Erreur lors de la création de l'évaluation" }, { status: 500 });
  }
}
