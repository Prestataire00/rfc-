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
  if (!entrepriseId) return NextResponse.json({});

  const contacts = await prisma.contact.findMany({
    where: { entrepriseId },
    select: { id: true },
  });
  const contactIds = contacts.map((c) => c.id);

  const [nbStagiaires, nbSessionsAVenir, nbSessionsTerminees, nbDocuments, nbDevis] = await Promise.all([
    prisma.contact.count({ where: { entrepriseId } }),
    prisma.session.count({
      where: {
        dateDebut: { gte: new Date() },
        inscriptions: { some: { contactId: { in: contactIds } } },
      },
    }),
    prisma.session.count({
      where: {
        statut: "terminee",
        inscriptions: { some: { contactId: { in: contactIds } } },
      },
    }),
    prisma.document.count({ where: { entrepriseId } }),
    prisma.devis.count({ where: { entrepriseId } }),
  ]);

  return NextResponse.json({ nbStagiaires, nbSessionsAVenir, nbSessionsTerminees, nbDocuments, nbDevis });
}
