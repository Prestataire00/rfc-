export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const entrepriseId = searchParams.get("entrepriseId");
    const contactId = searchParams.get("contactId");

    if (!entrepriseId && !contactId) {
      return NextResponse.json({ error: "entrepriseId ou contactId requis" }, { status: 400 });
    }

    const OR: object[] = [];
    if (entrepriseId) OR.push({ entrepriseId });
    if (contactId) OR.push({ contactId });

    const historique = await prisma.historiqueAction.findMany({
      where: { OR },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Dédupliquer par id (une action peut matcher les deux critères)
    const seen = new Set<string>();
    const unique = historique.filter((h) => {
      if (seen.has(h.id)) return false;
      seen.add(h.id);
      return true;
    });

    return NextResponse.json(unique);
  } catch (err: unknown) {
    console.error("Erreur GET historique:", err);
    return NextResponse.json({ error: "Erreur lors de la récupération de l'historique" }, { status: 500 });
  }
}
