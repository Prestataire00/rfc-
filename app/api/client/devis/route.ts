export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "client") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const entrepriseId = session.user.entrepriseId;
    if (!entrepriseId) return NextResponse.json([]);

    const devis = await prisma.devis.findMany({
      where: { entrepriseId },
      include: { lignes: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(devis);
  } catch (err: unknown) {
    console.error("Erreur GET client devis:", err);
    return NextResponse.json({ error: "Erreur lors de la récupération des devis" }, { status: 500 });
  }
}
