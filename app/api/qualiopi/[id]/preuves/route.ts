import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const preuves = await prisma.preuveQualiopi.findMany({
    where: { indicateurId: params.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(preuves);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
}
