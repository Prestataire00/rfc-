import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "formateur") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formateurId = (session.user as any).formateurId;
  if (!formateurId) return NextResponse.json([]);

  const sessions = await prisma.session.findMany({
    where: { formateurId },
    include: {
      formation: { select: { titre: true, duree: true } },
      _count: { select: { inscriptions: true } },
      inscriptions: {
        include: { contact: { select: { id: true, nom: true, prenom: true, email: true } } },
      },
    },
    orderBy: { dateDebut: "desc" },
  });

  return NextResponse.json(sessions);
}
