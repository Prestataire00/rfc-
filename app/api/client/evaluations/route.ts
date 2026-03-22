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

    const entrepriseId = (session.user as any).entrepriseId;
    if (!entrepriseId) return NextResponse.json([]);

    const contacts = await prisma.contact.findMany({
      where: { entrepriseId },
      select: { id: true },
    });
    const contactIds = contacts.map((c) => c.id);

    const evaluations = await prisma.evaluation.findMany({
      where: {
        contactId: { in: contactIds },
        estComplete: true,
      },
      include: {
        session: { include: { formation: { select: { titre: true } } } },
        contact: { select: { nom: true, prenom: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(evaluations);
  } catch (err: unknown) {
    console.error("Erreur lors de la récupération des évaluations:", err);
    return NextResponse.json({ error: "Erreur lors de la récupération des évaluations" }, { status: 500 });
  }
}
