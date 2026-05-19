// Cron */5 min — reprend les SignatureRequest bloquées en statut "signed" non "completed".
// Tente le retry de la finalisation Phase 4 (PDF stamp + TSA + certif + emails).
// Spec §"Phase 4" + §"Cas d'erreur" (FreeTSA injoignable, fire-and-forget tué).
// Auth via Bearer CRON_SECRET — appelé par .github/workflows/cron.yml.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { finalizeSignatureRequest } from "@/lib/signatures/finalize";
import { withErrorHandler } from "@/lib/api-wrapper";

export const dynamic = "force-dynamic";

const MAX_PER_RUN = 10;
const MIN_AGE_MS = 5 * 60_000; // 5 minutes — laisse une chance au fire-and-forget

async function authCheck(req: Request): Promise<NextResponse | null> {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

async function processStuckRequests(): Promise<{
  processed: number;
  results: Array<{ id: string; ok: boolean; reason?: string }>;
}> {
  const stuckAt = new Date(Date.now() - MIN_AGE_MS);
  const stuck = await prisma.signatureRequest.findMany({
    where: { statut: "signed", signedAt: { lt: stuckAt } },
    take: MAX_PER_RUN,
    select: { id: true },
  });

  const results: Array<{ id: string; ok: boolean; reason?: string }> = [];
  for (const r of stuck) {
    try {
      const out = await finalizeSignatureRequest(r.id);
      if (out.ok) {
        results.push({ id: r.id, ok: true });
      } else {
        results.push({ id: r.id, ok: false, reason: out.reason });
      }
    } catch (e) {
      results.push({ id: r.id, ok: false, reason: (e as Error).message });
      console.error(`[cron retry-finalization] ${r.id}:`, e);
    }
  }
  return { processed: results.length, results };
}

// Accept GET (manual debug) et POST (GitHub Actions Scheduled standard).
export const GET = withErrorHandler(async (req: NextRequest) => {
  const unauthorized = await authCheck(req);
  if (unauthorized) return unauthorized;
  return NextResponse.json(await processStuckRequests());
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const unauthorized = await authCheck(req);
  if (unauthorized) return unauthorized;
  return NextResponse.json(await processStuckRequests());
});
