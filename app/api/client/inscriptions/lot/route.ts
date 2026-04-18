export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/client/inscriptions/lot
// Inscription en lot : le DRH inscrit plusieurs salaries sur une session d'un coup.
// Body: { sessionId: string, contactIds: string[] }
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== "client" && session.user.role !== "admin")) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const { sessionId, contactIds } = await req.json();
    if (!sessionId || !Array.isArray(contactIds) || contactIds.length === 0) {
      return NextResponse.json({ error: "sessionId et contactIds requis" }, { status: 400 });
    }

    const entrepriseId = session.user.entrepriseId;

    // Verifier que tous les contacts appartiennent a l'entreprise du DRH
    if (entrepriseId) {
      const contacts = await prisma.contact.findMany({
        where: { id: { in: contactIds }, entrepriseId },
        select: { id: true },
      });
      const validIds = contacts.map((c) => c.id);
      const invalid = contactIds.filter((id: string) => !validIds.includes(id));
      if (invalid.length > 0) {
        return NextResponse.json({ error: `${invalid.length} contact(s) n'appartiennent pas a votre entreprise` }, { status: 403 });
      }
    }

    // Verifier que la session existe et a de la capacite
    const targetSession = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { _count: { select: { inscriptions: true } } },
    });
    if (!targetSession) return NextResponse.json({ error: "Session introuvable" }, { status: 404 });

    const capaciteRestante = targetSession.capaciteMax - targetSession._count.inscriptions;
    if (contactIds.length > capaciteRestante) {
      return NextResponse.json({ error: `Capacite insuffisante : ${capaciteRestante} places restantes` }, { status: 400 });
    }

    // Creer les inscriptions (skip si deja inscrit)
    const results = await Promise.all(
      contactIds.map(async (contactId: string) => {
        const existing = await prisma.inscription.findFirst({
          where: { sessionId, contactId },
        });
        if (existing) return { contactId, status: "already_enrolled" };

        await prisma.inscription.create({
          data: { sessionId, contactId, statut: "confirmee" },
        });
        return { contactId, status: "enrolled" };
      })
    );

    const enrolled = results.filter((r) => r.status === "enrolled").length;
    const skipped = results.filter((r) => r.status === "already_enrolled").length;

    return NextResponse.json({ enrolled, skipped, results });
  } catch (err) {
    console.error("POST client/inscriptions/lot:", err);
    return NextResponse.json({ error: "Erreur inscription en lot" }, { status: 500 });
  }
}
