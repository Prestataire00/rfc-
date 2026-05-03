export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";

const FRESHNESS_HOURS = 6;

async function computeSnapshot() {
  const [
    totalContacts,
    totalEntreprises,
    totalFormations,
    totalSessions,
    totalInscriptions,
    totalDevis,
    totalFactures,
    totalProspects,
  ] = await Promise.all([
    prisma.contact.count(),
    prisma.entreprise.count(),
    prisma.formation.count(),
    prisma.session.count(),
    prisma.inscription.count(),
    prisma.devis.count(),
    prisma.facture.count(),
    prisma.prospect.count(),
  ]);

  return {
    totalContacts,
    totalEntreprises,
    totalFormations,
    totalSessions,
    totalInscriptions,
    totalDevis,
    totalFactures,
    totalProspects,
    computedAt: new Date().toISOString(),
  };
}

export const GET = withErrorHandler(async () => {
  const since = new Date(Date.now() - FRESHNESS_HOURS * 3600 * 1000);
  const recent = await prisma.kpiHistory.findFirst({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
  });
  if (recent) return NextResponse.json({ source: "cache", snapshot: recent });

  const kpis = await computeSnapshot();
  return NextResponse.json({ source: "live", snapshot: { kpis, dateSnapshot: new Date() } });
});

export const POST = withErrorHandler(async (_req: NextRequest) => {
  const kpis = await computeSnapshot();
  const item = await prisma.kpiHistory.create({
    data: {
      dateSnapshot: new Date(),
      kpis: kpis as never,
      source: "manual",
    },
  });
  return NextResponse.json(item, { status: 201 });
});
