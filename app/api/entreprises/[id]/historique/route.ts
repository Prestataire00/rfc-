export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const historique = await prisma.historiqueAction.findMany({
      where: { entrepriseId: params.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json(historique);
  } catch (err: unknown) {
    console.error("Erreur GET historique:", err);
    return NextResponse.json({ error: "Erreur lors de la récupération de l'historique" }, { status: 500 });
  }
}
