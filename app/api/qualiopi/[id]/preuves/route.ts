export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const preuves = await prisma.preuveQualiopi.findMany({
      where: { indicateurId: params.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(preuves);
  } catch (err: unknown) {
    console.error("Erreur lors de la récupération des preuves:", err);
    return NextResponse.json({ error: "Erreur lors de la récupération des preuves" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();

    const preuve = await prisma.preuveQualiopi.create({
      data: {
        indicateurId: params.id,
        titre: body.titre,
        description: body.description || null,
        fichierUrl: body.fichierUrl || null,
        type: body.type,
        valide: body.valide || false,
      },
    });

    return NextResponse.json(preuve, { status: 201 });
  } catch (err: unknown) {
    console.error("Erreur lors de la création de la preuve:", err);
    return NextResponse.json({ error: "Erreur lors de la création de la preuve" }, { status: 500 });
  }
}
