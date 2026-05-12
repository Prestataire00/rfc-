export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { enforceRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_PRESETS } from "@/lib/rate-limit-presets";

// Endpoint public (whitelisté dans middleware.ts) — pas d'auth requise
export const GET = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { token: string } }) => {
  const limited = await enforceRateLimit(req, RATE_LIMIT_PRESETS.publicToken, "public:qualite");
  if (limited) return limited;

  const partage = await prisma.partageQualiopi.findUnique({ where: { token: params.token } });
  if (!partage) return NextResponse.json({ error: "Token invalide" }, { status: 404 });
  if (!partage.actif) return NextResponse.json({ error: "Partage desactive" }, { status: 403 });
  if (partage.expireAt && partage.expireAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "Partage expire" }, { status: 403 });
  }

  // KPIs reels a calculer en Phase 3
  return NextResponse.json({
    token: partage.token,
    nom: partage.nom,
    valid: true,
    kpis: {
      // TODO Phase 3 : agreger taux satisfaction, NPS, incidents ouverts/clos, actions correctives, etc.
    },
  });
});
