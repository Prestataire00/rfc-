export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";
import {
  DEFAULT_POLICY,
  selectSessionsToConvoke,
  type ConvocationPolicy,
  type SessionRow,
} from "@/lib/convocations/schedule";
import { sendConvocationsForSession } from "@/lib/convocations/send";

/**
 * Cron : convocations stagiaires automatiques J-X.
 *
 * Politique par défaut : envoyer les convocations à J-7 (±1j de tolérance
 * pour absorber les décalages d'exécution du cron). Configurable via les
 * env vars CONVOCATIONS_DAYS_BEFORE_SESSION et CONVOCATIONS_WINDOW_DAYS.
 *
 * Skip
 *   - Sessions déjà convoquées (convocationsEnvoyeesAt != null)
 *   - Mode express (< 48h, envoi se fait à la création de la session)
 *   - Statuts annulee / en_cours / terminee
 *   - Sessions hors fenêtre temporelle
 *
 * Auth : Bearer CRON_SECRET. Réutilise la route batch existante pour
 * l'envoi effectif des emails (DRY — pas de duplication de la logique
 * PDF + SMTP + historique).
 */
export const GET = withErrorHandler(async (req: NextRequest) => {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET non configuré" },
      { status: 401 },
    );
  }
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const policy = readPolicyFromEnv();

  // On charge largement (fenêtre +/- 30j autour de J-X) puis on filtre en
  // mémoire avec la politique stricte. Évite une logique de range complexe
  // en SQL pour quelques centaines de lignes.
  const upper = new Date(now);
  upper.setDate(upper.getDate() + policy.daysBeforeSession + 30);
  const lower = new Date(now);
  lower.setDate(lower.getDate() + policy.daysBeforeSession - 30);

  const rows = await prisma.session.findMany({
    where: {
      dateDebut: { gte: lower, lte: upper },
      convocationsEnvoyeesAt: null,
    },
    select: {
      id: true,
      dateDebut: true,
      statut: true,
      modeExpress: true,
      convocationsEnvoyeesAt: true,
    },
  });

  const { toSend, skipped } = selectSessionsToConvoke(rows as SessionRow[], now, policy);

  const stats = { scanned: rows.length, sent: 0, failed: 0, skipped: skipped.length };
  const errors: Array<{ sessionId: string; error: string }> = [];

  for (const session of toSend) {
    try {
      const result = await sendConvocationsForSession(session.id);

      if (result.failed > 0 && result.sent === 0) {
        stats.failed++;
        errors.push({
          sessionId: session.id,
          error: `Tous les envois ont échoué (${result.failed})`,
        });
        continue;
      }

      await prisma.session.update({
        where: { id: session.id },
        data: { convocationsEnvoyeesAt: now },
      });
      stats.sent++;
    } catch (err) {
      stats.failed++;
      errors.push({
        sessionId: session.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({
    ...stats,
    errors: errors.length ? errors : undefined,
    timestamp: now.toISOString(),
    policy,
  });
});

function readPolicyFromEnv(): ConvocationPolicy {
  const days = Number(process.env.CONVOCATIONS_DAYS_BEFORE_SESSION);
  const window = Number(process.env.CONVOCATIONS_WINDOW_DAYS);
  return {
    daysBeforeSession: Number.isFinite(days) && days > 0
      ? days
      : DEFAULT_POLICY.daysBeforeSession,
    windowDays: Number.isFinite(window) && window >= 0
      ? window
      : DEFAULT_POLICY.windowDays,
    eligibleStatuts: DEFAULT_POLICY.eligibleStatuts,
  };
}
