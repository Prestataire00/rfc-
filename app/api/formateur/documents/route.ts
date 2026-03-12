import { NextResponse } from "next/server";
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

  const documents = await prisma.document.findMany({
    where: { formateurId },
    include: {
      session: { include: { formation: { select: { titre: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(documents);
}
