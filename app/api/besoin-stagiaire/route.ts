export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { besoinStagiaireAdminSchema } from "@/lib/validations/besoin-stagiaire";
import { randomBytes } from "crypto";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    const where = sessionId ? { sessionId } : {};
    const fiches = await prisma.besoinStagiaire.findMany({
      where,
      include: { contact: { select: { id: true, nom: true, prenom: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(fiches);
  } catch (err: unknown) {
    console.error("GET besoin-stagiaire error:", err);
    return NextResponse.json({ error: "Erreur lors de la recuperation" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = besoinStagiaireAdminSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const existing = await prisma.besoinStagiaire.findUnique({
      where: { sessionId_contactId: { sessionId: parsed.data.sessionId, contactId: parsed.data.contactId } },
    });
    if (existing) return NextResponse.json(existing, { status: 200 });

    const tokenAcces = randomBytes(24).toString("hex");
    const fiche = await prisma.besoinStagiaire.create({
      data: { ...parsed.data, tokenAcces },
    });
    return NextResponse.json(fiche, { status: 201 });
  } catch (err: unknown) {
    console.error("POST besoin-stagiaire error:", err);
    return NextResponse.json({ error: "Erreur lors de la creation" }, { status: 500 });
  }
}
