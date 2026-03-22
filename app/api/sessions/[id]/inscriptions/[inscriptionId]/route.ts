export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _: NextRequest,
  { params }: { params: { id: string; inscriptionId: string } }
) {
  try {
    await prisma.inscription.delete({ where: { id: params.inscriptionId } });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Erreur DELETE inscription:", err);
    return NextResponse.json({ error: "Erreur lors de la suppression de l'inscription" }, { status: 500 });
  }
}
