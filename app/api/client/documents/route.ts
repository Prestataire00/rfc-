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

    const documents = await prisma.document.findMany({
      where: { entrepriseId },
      include: {
        session: { include: { formation: { select: { titre: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(documents);
  } catch (err: unknown) {
    console.error("Erreur GET client documents:", err);
    return NextResponse.json({ error: "Erreur lors de la récupération des documents" }, { status: 500 });
  }
}
