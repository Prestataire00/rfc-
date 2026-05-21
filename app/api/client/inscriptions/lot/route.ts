export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";

// POST /api/client/inscriptions/lot
// Inscription en lot : le DRH inscrit plusieurs salaries sur une session d'un coup.
// Body: { sessionId: string, contactIds: string[] }
// Note : succes partiel autorise (un contact deja inscrit est skipped, pas une erreur fatale).
// On NE wrap PAS dans une transaction — la boucle est idempotente.
export const POST = withErrorHandler(async (req: NextRequest) => {
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

  // Creer les inscriptions (skip si deja inscrit) — 2 requetes au lieu de 2N.
  // skipDuplicates s'appuie sur @@unique([contactId, sessionId]).
  const dejaInscrits = await prisma.inscription.findMany({
    where: { sessionId, contactId: { in: contactIds } },
    select: { contactId: true },
  });
  const dejaInscritsSet = new Set(dejaInscrits.map((i) => i.contactId));
  const aCreer = (contactIds as string[]).filter((id) => !dejaInscritsSet.has(id));

  const { count: enrolled } = await prisma.inscription.createMany({
    data: aCreer.map((contactId) => ({ sessionId, contactId, statut: "confirmee" })),
    skipDuplicates: true,
  });

  // Statut par contact best-effort sur l'etat avant insertion (cf. sessions/[id]/inscriptions/lot).
  const results = (contactIds as string[]).map((contactId) => ({
    contactId,
    status: dejaInscritsSet.has(contactId) ? "already_enrolled" : "enrolled",
  }));
  const skipped = contactIds.length - enrolled;

  return NextResponse.json({ enrolled, skipped, results });
});
