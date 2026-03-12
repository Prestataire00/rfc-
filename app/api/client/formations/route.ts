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

  // Get contacts of this enterprise that are stagiaires
  const contacts = await prisma.contact.findMany({
    where: { entrepriseId },
    select: { id: true },
  });

  const contactIds = contacts.map((c) => c.id);

  const sessions = await prisma.session.findMany({
    where: {
      inscriptions: { some: { contactId: { in: contactIds } } },
    },
    include: {
      formation: { select: { titre: true, duree: true, categorie: true } },
      formateur: { select: { nom: true, prenom: true } },
      inscriptions: {
        where: { contactId: { in: contactIds } },
        include: { contact: { select: { id: true, nom: true, prenom: true } } },
      },
      _count: { select: { inscriptions: true } },
    },
    orderBy: { dateDebut: "desc" },
  });

  return NextResponse.json(sessions);
}
