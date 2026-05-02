export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyAllAdmins } from "@/lib/notifications";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { withErrorHandler } from "@/lib/api-wrapper";

export const GET = withErrorHandler(async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "client") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessions = await prisma.session.findMany({
    where: {
      statut: { in: ["planifiee", "confirmee"] },
      dateDebut: { gt: new Date() },
    },
    include: {
      formation: { select: { titre: true, duree: true } },
      _count: { select: { inscriptions: true } },
    },
    orderBy: { dateDebut: "asc" },
  });

  const disponibles = sessions.filter(
    (s) => s._count.inscriptions < s.capaciteMax
  );

  return NextResponse.json(disponibles);
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const authSession = await getServerSession(authOptions);
  if (!authSession?.user || authSession.user.role !== "client") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entrepriseId = authSession.user.entrepriseId;
  if (!entrepriseId) {
    return NextResponse.json({ error: "Aucune entreprise associée à ce compte" }, { status: 403 });
  }

  const { sessionId, contactId } = await req.json();
  if (!sessionId || !contactId) {
    return NextResponse.json({ error: "sessionId et contactId requis" }, { status: 400 });
  }

  // Vérifie que le contact appartient à l'entreprise du client
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, entrepriseId },
  });
  if (!contact) {
    return NextResponse.json({ error: "Stagiaire introuvable ou non autorisé" }, { status: 403 });
  }

  // Vérifie la session et les places restantes
  const sessionData = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      formation: { select: { titre: true } },
      _count: { select: { inscriptions: true } },
    },
  });
  if (!sessionData) {
    return NextResponse.json({ error: "Session introuvable" }, { status: 404 });
  }
  if (!["planifiee", "confirmee"].includes(sessionData.statut)) {
    return NextResponse.json({ error: "Cette session n'est plus disponible" }, { status: 400 });
  }
  if (sessionData._count.inscriptions >= sessionData.capaciteMax) {
    return NextResponse.json({ error: "Cette session est complète" }, { status: 400 });
  }

  // Vérifie que le contact n'est pas déjà inscrit
  const existing = await prisma.inscription.findUnique({
    where: { contactId_sessionId: { contactId, sessionId } },
  });
  if (existing) {
    return NextResponse.json({ error: "Ce stagiaire est déjà inscrit à cette session" }, { status: 409 });
  }

  // Crée l'inscription
  const inscription = await prisma.inscription.create({
    data: { contactId, sessionId, statut: "en_attente" },
  });

  // Notification admins
  const dateStr = format(new Date(sessionData.dateDebut), "dd/MM/yyyy", { locale: fr });
  await notifyAllAdmins({
    titre: "Nouvelle demande d'inscription",
    message: `${authSession.user.name} souhaite inscrire ${contact.prenom} ${contact.nom} à la session "${sessionData.formation.titre}" du ${dateStr}`,
    type: "info",
    lien: `/sessions/${sessionId}`,
  });

  return NextResponse.json(inscription, { status: 201 });
});
