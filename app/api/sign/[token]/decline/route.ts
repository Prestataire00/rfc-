// Spec §"Cas d'erreur" — signataire refuse. POST avec declineReason.
// Endpoint public, rate-limit RATE_LIMIT_PRESETS.publicToken (30/5min/IP).
// Transition viewed/sent → rejected, audit event, email admin.
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { verifyToken, tokenPrefix } from "@/lib/signatures/token";
import { enforceRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_PRESETS } from "@/lib/rate-limit-presets";
import { appendEvent } from "@/lib/signatures/audit-chain";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const MAX_REASON_LEN = 500;

export const POST = withErrorHandlerParams<{ token: string }>(async (req: NextRequest, ctx) => {
  const token = ctx.params.token;

  const verification = verifyToken(token);
  if (!verification.valid) {
    return NextResponse.json({ error: "Token invalide" }, { status: 401 });
  }

  const limited = await enforceRateLimit(
    req,
    RATE_LIMIT_PRESETS.publicToken,
    `signature-decline:${tokenPrefix(token)}`,
  );
  if (limited) return limited;

  const body = (await req.json().catch(() => ({}))) as { reason?: string };
  const reason = (body.reason ?? "").toString().slice(0, MAX_REASON_LEN).trim();

  const h = headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";

  const signataire = await prisma.signataire.findUnique({
    where: { tokenHash: verification.tokenHash },
    include: { request: true },
  });
  if (!signataire) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (signataire.statut === "signed" || signataire.statut === "declined") {
    return NextResponse.json({ error: "Action déjà effectuée" }, { status: 409 });
  }
  if (signataire.request.statut === "completed") {
    return NextResponse.json({ error: "Document déjà finalisé" }, { status: 409 });
  }

  await prisma.$transaction([
    prisma.signataire.update({
      where: { id: signataire.id },
      data: { statut: "declined", declinedAt: new Date(), declineReason: reason || null },
    }),
    prisma.signatureRequest.update({
      where: { id: signataire.requestId },
      data: { statut: "rejected" },
    }),
  ]);
  await appendEvent(signataire.requestId, {
    type: "rejected",
    actorType: "signataire",
    actorId: signataire.id,
    payload: { reason: reason || null, ip },
  });

  // Notification admin (créateur de la demande). Lookup séparé car createdBy n'est
  // pas en relation Prisma (FK soft).
  const expediteur = await prisma.user.findUnique({
    where: { id: signataire.request.createdByUserId },
    select: { email: true },
  });
  if (expediteur?.email) {
    await sendEmail({
      to: expediteur.email,
      subject: `Signature refusée — ${signataire.request.titre}`,
      html: `<p>${signataire.nom} (${signataire.email}) a refusé de signer le document <b>${signataire.request.titre}</b>.</p><p>Motif : ${reason || "non précisé"}</p>`,
    });
  }

  return NextResponse.json({ ok: true });
});
