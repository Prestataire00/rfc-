export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";
import {
  aggregateRoi,
  coutHoraire,
  coutParStagiaire,
} from "@/lib/client/roi-calc";

/**
 * GET /api/client/roi
 *
 * KPI agrégés pour l'entreprise du user connecté (rôle "client"). Le
 * middleware autorise déjà admin + client sur /api/client/*. On scope
 * sur entrepriseId du user pour empêcher un client de voir les KPI d'un
 * autre.
 *
 * Query param :
 *   ?since=2026-01-01  filtre les sessions à partir de cette date
 */
export const GET = withErrorHandler(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const role = (session.user as { role?: string }).role;
  const entrepriseId =
    (session.user as { entrepriseId?: string | null }).entrepriseId ?? null;

  // Le client doit avoir une entrepriseId — sinon il n'y a rien à montrer.
  // Un admin peut passer ?entrepriseId=... pour consulter un autre client.
  const url = new URL(req.url);
  const targetEntrepriseId =
    role === "admin" ? url.searchParams.get("entrepriseId") ?? entrepriseId : entrepriseId;

  if (!targetEntrepriseId) {
    return NextResponse.json(
      { error: "Aucune entreprise associée à ce compte" },
      { status: 400 },
    );
  }

  const sinceParam = url.searchParams.get("since");
  const since = sinceParam ? new Date(sinceParam) : undefined;

  const [inscriptions, evaluations, factures] = await Promise.all([
    prisma.inscription.findMany({
      where: {
        contact: { entrepriseId: targetEntrepriseId },
      },
      select: {
        contactId: true,
        statut: true,
        session: {
          select: {
            formationId: true,
            dateDebut: true,
            formation: { select: { duree: true } },
          },
        },
      },
    }),
    prisma.evaluation.findMany({
      where: {
        contact: { entrepriseId: targetEntrepriseId },
      },
      select: {
        noteGlobale: true,
        estComplete: true,
        type: true,
        cible: true,
      },
    }),
    prisma.facture.findMany({
      where: { entrepriseId: targetEntrepriseId },
      select: { montantTTC: true, statut: true },
    }),
  ]);

  const kpis = aggregateRoi({ inscriptions, evaluations, factures, since });

  return NextResponse.json({
    ...kpis,
    coutParStagiaire: coutParStagiaire(kpis),
    coutHoraire: coutHoraire(kpis),
    entrepriseId: targetEntrepriseId,
    since: since?.toISOString() ?? null,
  });
});
