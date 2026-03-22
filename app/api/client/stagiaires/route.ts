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

    const entrepriseId = (session.user as any).entrepriseId;
    if (!entrepriseId) return NextResponse.json([]);

    const contacts = await prisma.contact.findMany({
      where: { entrepriseId },
      include: {
        inscriptions: {
          include: {
            session: {
              include: { formation: { select: { titre: true } } },
            },
          },
        },
      },
      orderBy: { nom: "asc" },
    });

    return NextResponse.json(contacts);
  } catch (err: unknown) {
    console.error("Erreur lors de la récupération des stagiaires:", err);
    return NextResponse.json({ error: "Erreur lors de la récupération des stagiaires" }, { status: 500 });
  }
}
