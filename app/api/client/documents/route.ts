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
    if (!entrepriseId) return NextResponse.json({ sessions: [], devis: [], factures: [] });

    // Sessions avec inscriptions des contacts de l'entreprise
    const contacts = await prisma.contact.findMany({
      where: { entrepriseId },
      select: { id: true, nom: true, prenom: true },
    });
    const contactIds = contacts.map((c) => c.id);

    const sessions = await prisma.session.findMany({
      where: { inscriptions: { some: { contactId: { in: contactIds } } } },
      include: {
        formation: { select: { titre: true } },
        inscriptions: {
          where: { contactId: { in: contactIds } },
          include: { contact: { select: { id: true, nom: true, prenom: true } } },
        },
      },
      orderBy: { dateDebut: "desc" },
    });

    const devis = await prisma.devis.findMany({
      where: { entrepriseId },
      select: { id: true, numero: true, statut: true, montantTTC: true, dateEmission: true },
      orderBy: { createdAt: "desc" },
    });

    const factures = await prisma.facture.findMany({
      where: { entrepriseId },
      select: { id: true, numero: true, statut: true, montantTTC: true, dateEmission: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ sessions, devis, factures });
  } catch (err: unknown) {
    console.error("Erreur GET client documents:", err);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}
