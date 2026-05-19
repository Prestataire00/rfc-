export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_PRESETS } from "@/lib/rate-limit-presets";

/**
 * Vérifie la signature svix d'un webhook Resend.
 * Format header svix-signature : "v1,base64hash v1,base64hash2 ..."
 * Le hash signe : `${svix-id}.${svix-timestamp}.${raw_body}` avec HMAC-SHA256
 * et la clé secrète webhook (préfixée "whsec_").
 */
function verifySvixSignature(
  rawBody: string,
  svixId: string | null,
  svixTimestamp: string | null,
  svixSignature: string | null,
  secret: string,
): boolean {
  if (!svixId || !svixTimestamp || !svixSignature) return false;

  // Tolérance horloge : ±5 min pour éviter rejouer un payload signé
  const ts = Number(svixTimestamp);
  if (!Number.isFinite(ts)) return false;
  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - ts) > 300) return false;

  // Strip "whsec_" prefix → décoder base64 → clé brute pour HMAC
  const cleanSecret = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  const keyBuf = Buffer.from(cleanSecret, "base64");

  const toSign = `${svixId}.${svixTimestamp}.${rawBody}`;
  const expected = createHmac("sha256", keyBuf).update(toSign).digest("base64");

  // Header contient potentiellement plusieurs versions séparées par espace
  const versions = svixSignature.split(" ");
  for (const v of versions) {
    const [version, hash] = v.split(",");
    if (version !== "v1" || !hash) continue;
    const expectedBuf = Buffer.from(expected, "base64");
    const receivedBuf = Buffer.from(hash, "base64");
    if (expectedBuf.length === receivedBuf.length && timingSafeEqual(expectedBuf, receivedBuf)) {
      return true;
    }
  }
  return false;
}

// Resend webhook event types -> internal statut
const STATUT_MAP: Record<string, string> = {
  "email.delivered": "livre",
  "email.opened": "ouvert",
  "email.clicked": "clique",
  "email.bounced": "bounce",
  "email.complained": "plainte",
  "email.delivery_delayed": "envoye",
  "email.sent": "envoye",
};

const TYPE_MAP: Record<string, string> = {
  "email.delivered": "delivered",
  "email.opened": "open",
  "email.clicked": "click",
  "email.bounced": "bounce",
  "email.complained": "complaint",
};

// Endpoint public (whitelisté dans middleware.ts)
// Audit 2026-05-19 §2.3 : signature svix vérifiée avant écriture pour empêcher
// pollution tracking BPF / fausses preuves de delivery.
export const POST = withErrorHandler(async (req: NextRequest) => {
  // Burst large autorisé (Resend peut envoyer en masse), mais pas illimité.
  const limited = await enforceRateLimit(req, RATE_LIMIT_PRESETS.externalWebhook, "webhook:resend");
  if (limited) return limited;

  // Vérification signature svix obligatoire si secret configuré.
  // RESEND_WEBHOOK_SECRET doit être renseigné (Netlify env vars) — sans secret
  // les webhooks sont rejetés (configuration explicite required).
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    logger.warn("email_tracking.webhook_secret_missing");
    return NextResponse.json({ error: "Webhook non configuré" }, { status: 503 });
  }

  // Lire le body brut (raw) pour vérifier la signature — JSON.parse APRÈS.
  const rawBody = await req.text();
  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!verifySvixSignature(rawBody, svixId, svixTimestamp, svixSignature, secret)) {
    logger.warn("email_tracking.invalid_signature", { svixId });
    return NextResponse.json({ error: "Signature invalide" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    body = null;
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Body invalide" }, { status: 400 });
  }
  const bodyObj = body as { type?: unknown; data?: unknown };
  const type = typeof bodyObj.type === "string" ? bodyObj.type : undefined;
  const data = (bodyObj.data && typeof bodyObj.data === "object")
    ? bodyObj.data as Record<string, unknown>
    : undefined;
  const emailId = (data?.email_id as string) || (data?.id as string) || null;

  if (!type || !emailId) {
    logger.warn("email_tracking.missing_fields", { type, emailId });
    return NextResponse.json({ ok: true, ignored: true });
  }

  const log = await prisma.logEmail.findFirst({ where: { messageId: emailId } });
  if (!log) {
    logger.warn("email_tracking.log_not_found", { emailId, type });
    return NextResponse.json({ ok: true, matched: false });
  }

  await prisma.$transaction([
    prisma.emailTrackingEvent.create({
      data: {
        logEmailId: log.id,
        type: TYPE_MAP[type] ?? type,
        payload: (data ?? {}) as never,
      },
    }),
    prisma.logEmail.update({
      where: { id: log.id },
      data: { statut: STATUT_MAP[type] ?? log.statut },
    }),
  ]);

  return NextResponse.json({ ok: true, matched: true });
});
