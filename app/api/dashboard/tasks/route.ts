export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";

export const GET = withErrorHandler(async () => {
  const now = new Date();
  const j15 = new Date(now); j15.setDate(j15.getDate() - 15);
  const j3 = new Date(now); j3.setDate(j3.getDate() - 3);
  const in60days = new Date(now); in60days.setDate(in60days.getDate() + 60);
  const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now); endOfDay.setHours(23, 59, 59, 999);

  try {
    const [sessionsJour, devisARelancer, facturesEnRetard, besoinsAQualifier, inscriptionsAValider, recyclagesRaw] = await Promise.all([
      prisma.session.findMany({
        where: { dateDebut: { gte: startOfDay, lte: endOfDay } },
        select: { id: true, dateDebut: true, lieu: true, formation: { select: { titre: true } }, formateur: { select: { nom: true, prenom: true } }, _count: { select: { inscriptions: true } } },
        orderBy: { dateDebut: "asc" },
      }),
      prisma.devis.findMany({
        where: { statut: "envoye", updatedAt: { lt: j15 } },
        select: { id: true, numero: true, montantTTC: true, updatedAt: true, entreprise: { select: { nom: true } } },
        orderBy: { updatedAt: "asc" },
        take: 10,
      }),
      prisma.facture.findMany({
        where: { statut: { in: ["en_attente", "en_retard"] }, dateEcheance: { lt: now } },
        select: { id: true, numero: true, montantTTC: true, dateEcheance: true, entreprise: { select: { nom: true } } },
        orderBy: { dateEcheance: "asc" },
        take: 10,
      }),
      prisma.besoinFormation.findMany({
        where: { statut: "nouveau", createdAt: { lt: j3 } },
        select: { id: true, titre: true, createdAt: true, entreprise: { select: { nom: true } }, contact: { select: { prenom: true, nom: true } } },
        orderBy: { createdAt: "asc" },
        take: 10,
      }),
      prisma.inscription.findMany({
        where: { statut: "en_attente" },
        select: { id: true, contact: { select: { prenom: true, nom: true } }, session: { select: { id: true, dateDebut: true, formation: { select: { titre: true } } } } },
        take: 10,
      }),
      prisma.certificationStagiaire.findMany({
        where: { statut: "valide", dateExpiration: { lte: in60days, gte: now } },
        select: { id: true, dateExpiration: true, formation: { select: { titre: true } }, contact: { select: { id: true, prenom: true, nom: true, entreprise: { select: { nom: true } } } } },
        orderBy: { dateExpiration: "asc" },
        take: 10,
      }).catch(() => []),
    ]);

    return NextResponse.json({
      sessionsJour,
      devisARelancer,
      facturesEnRetard,
      besoinsAQualifier,
      inscriptionsAValider,
      recyclages: recyclagesRaw.map((r) => ({ ...r, label: r.formation?.titre || "Certification", expireLe: r.dateExpiration })),
    });
  } catch {
    // Fallback gracieux : on renvoie des listes vides plutôt qu'une erreur 500
    return NextResponse.json({ sessionsJour: [], devisARelancer: [], facturesEnRetard: [], besoinsAQualifier: [], inscriptionsAValider: [], recyclages: [] });
  }
});
