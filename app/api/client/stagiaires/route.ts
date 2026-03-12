import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
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
}
