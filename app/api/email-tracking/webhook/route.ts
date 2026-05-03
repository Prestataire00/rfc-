export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";
import { logger } from "@/lib/logger";

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
// TODO Phase 3 : verifier la signature Resend (header svix-signature)
export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Body invalide" }, { status: 400 });
  }

  const type = body.type as string | undefined;
  const data = body.data as Record<string, unknown> | undefined;
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
