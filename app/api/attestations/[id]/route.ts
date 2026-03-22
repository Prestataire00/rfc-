export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();

    const attestation = await prisma.attestation.update({
      where: { id: params.id },
      data: {
        statut: body.statut,
        dateValidation: body.statut === "validee" ? new Date() : undefined,
      },
    });

    return NextResponse.json(attestation);
  } catch (err: unknown) {
    console.error("Erreur PUT attestation:", err);
    return NextResponse.json({ error: "Erreur lors de la mise à jour de l'attestation" }, { status: 500 });
  }
}
