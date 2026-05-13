// Cron quotidien 2h UTC — marque comme "expired" les SignatureRequest dont
// expiresAt < now et statut ∈ (sent, viewed). Append event "expired".
// Purge SignatureTokenAttempt > 30 jours.
// Spec §"Cas d'erreur" (Expiration). Auth Bearer CRON_SECRET.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { appendEvent } from "@/lib/signatures/audit-chain";

export const dynamic = "force-dynamic";

const MAX_PER_RUN = 500;
const TOKEN_ATTEMPT_RETENTION_DAYS = 30;

async function authCheck(req: Request): Promise<NextResponse | null> {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

async function run() {
  const now = new Date();

  // 1. Expirations
  const candidates = await prisma.signatureRequest.findMany({
    where: {
      statut: { in: ["sent", "viewed"] },
      expiresAt: { lt: now, not: null },
    },
    select: { id: true },
    take: MAX_PER_RUN,
  });

  for (const r of candidates) {
    await prisma.signatureRequest.update({
      where: { id: r.id },
      data: { statut: "expired" },
    });
    await appendEvent(r.id, {
      type: "expired",
      actorType: "system",
      actorId: null,
      payload: { expiredAt: now.toISOString() },
    });
  }

  // 2. Purge SignatureTokenAttempt > 30 jours
  const purgeBefore = new Date(now.getTime() - TOKEN_ATTEMPT_RETENTION_DAYS * 24 * 60 * 60_000);
  const purged = await prisma.signatureTokenAttempt.deleteMany({
    where: { createdAt: { lt: purgeBefore } },
  });

  return {
    expired: candidates.length,
    tokenAttemptsPurged: purged.count,
  };
}

export async function GET(req: Request) {
  const u = await authCheck(req);
  if (u) return u;
  return NextResponse.json(await run());
}

export async function POST(req: Request) {
  const u = await authCheck(req);
  if (u) return u;
  return NextResponse.json(await run());
}
