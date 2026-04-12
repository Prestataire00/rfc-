export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { besoinClientAdminSchema } from "@/lib/validations/besoin-client";
import { randomBytes } from "crypto";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    const where = sessionId ? { sessionId } : {};
    const fiches = await prisma.besoinClient.findMany({
      where,
      include: { session: { select: { id: true, dateDebut: true, formation: { select: { titre: true } } } }, entreprise: { select: { id: true, nom: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(fiches);
  } catch (err: unknown) {
    console.error("GET besoin-client error:", err);
    return NextResponse.json({ error: "Erreur lors de la recuperation" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = besoinClientAdminSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const tokenAcces = randomBytes(24).toString("hex");
    const fiche = await prisma.besoinClient.create({
      data: {
        ...parsed.data,
        destinataireEmail: parsed.data.destinataireEmail || null,
        tokenAcces,
      },
    });
    return NextResponse.json(fiche, { status: 201 });
  } catch (err: unknown) {
    console.error("POST besoin-client error:", err);
    return NextResponse.json({ error: "Erreur lors de la creation" }, { status: 500 });
  }
}
