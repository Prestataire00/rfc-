import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Notification = {
  id: string;
  type: "warning" | "info" | "success" | "danger";
  titre: string;
  message: string;
  lien?: string;
};

export async function GET() {
  const now = new Date();
  const notifications: Notification[] = [];

  // 1. Sessions starting in the next 7 days
  const next7days = new Date(now);
  next7days.setDate(next7days.getDate() + 7);
  const sessionsProches = await prisma.session.findMany({
    where: {
      dateDebut: { gte: now, lte: next7days },
      statut: { in: ["planifiee", "confirmee"] },
    },
    include: { formation: { select: { titre: true } } },
    orderBy: { dateDebut: "asc" },
  });

  for (const s of sessionsProches) {
    const jours = Math.ceil((new Date(s.dateDebut).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    notifications.push({
      id: `session-${s.id}`,
      type: jours <= 2 ? "warning" : "info",
      titre: `Session dans ${jours} jour${jours > 1 ? "s" : ""}`,
      message: `"${s.formation.titre}" commence le ${new Date(s.dateDebut).toLocaleDateString("fr-FR")}`,
      lien: `/sessions/${s.id}`,
    });
  }

  // 2. Sessions without formateur
  const sansFormateur = await prisma.session.findMany({
    where: {
      formateurId: null,
      statut: { in: ["planifiee", "confirmee"] },
      dateDebut: { gte: now },
    },
    include: { formation: { select: { titre: true } } },
  });

  for (const s of sansFormateur) {
    notifications.push({
      id: `no-formateur-${s.id}`,
      type: "danger",
      titre: "Formateur non assigne",
      message: `"${s.formation.titre}" n'a pas de formateur`,
      lien: `/sessions/${s.id}`,
    });
  }

  // 3. Devis en attente de signature (envoyes depuis + de 7 jours)
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const devisEnAttente = await prisma.devis.findMany({
    where: {
      statut: "envoye",
      dateEmission: { lte: sevenDaysAgo },
    },
    include: { entreprise: { select: { nom: true } } },
  });

  for (const d of devisEnAttente) {
    notifications.push({
      id: `devis-${d.id}`,
      type: "warning",
      titre: "Devis en attente",
      message: `${d.numero} (${d.entreprise?.nom || "Client"}) - en attente depuis + de 7 jours`,
      lien: `/commercial`,
    });
  }

  // 4. Devis expirés
  const devisExpires = await prisma.devis.findMany({
    where: {
      statut: "envoye",
      dateValidite: { lt: now },
    },
  });

  for (const d of devisExpires) {
    notifications.push({
      id: `devis-expire-${d.id}`,
      type: "danger",
      titre: "Devis expire",
      message: `${d.numero} a depasse sa date de validite`,
      lien: `/commercial`,
    });
  }

  // 5. Evaluations incomplètes
  const evalIncompletes = await prisma.evaluation.count({
    where: { estComplete: false },
  });

  if (evalIncompletes > 0) {
    notifications.push({
      id: "eval-incomplete",
      type: "info",
      titre: "Evaluations en attente",
      message: `${evalIncompletes} evaluation(s) non completee(s)`,
      lien: `/evaluations`,
    });
  }

  // 6. Sessions without inscriptions
  const sessionsSansInscriptions = await prisma.session.findMany({
    where: {
      statut: { in: ["planifiee", "confirmee"] },
      dateDebut: { gte: now },
      inscriptions: { none: {} },
    },
    include: { formation: { select: { titre: true } } },
  });

  for (const s of sessionsSansInscriptions) {
    notifications.push({
      id: `no-inscrits-${s.id}`,
      type: "warning",
      titre: "Session sans participant",
      message: `"${s.formation.titre}" n'a aucun inscrit`,
      lien: `/sessions/${s.id}`,
    });
  }

  return NextResponse.json(notifications);
}
