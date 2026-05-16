// Spec §"Phase 3" + début §"Phase 4". Endpoint public (pas d'auth NextAuth).
// Rate-limit : RATE_LIMIT_PRESETS.publicToken (30/5min/IP) via lib/with-rate-limit.
// Transaction Prisma : remplit zones, transition viewed→signed, audit event.
// Sprint 4 = capture seule. Sprint 5 ajoutera la finalisation crypto async (PDF stamping,
// TSA, certificat) en background ou via le cron signature-retry-finalization.
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { verifyToken, tokenPrefix } from "@/lib/signatures/token";
import { enforceRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_PRESETS } from "@/lib/rate-limit-presets";
import { sha256Hex } from "@/lib/signatures/hash";
import { appendEvent } from "@/lib/signatures/audit-chain";
import { canTransition, type SignatureStatus } from "@/lib/signatures/workflow";

export const dynamic = "force-dynamic";

type SubmittedZone = { id: string; value: string; method: "canvas" | "text" | "image" };

export const POST = withErrorHandlerParams<{ token: string }>(async (req: NextRequest, ctx) => {
  const token = ctx.params.token;

  const verification = verifyToken(token);
  if (!verification.valid) {
    return NextResponse.json({ error: "Token invalide" }, { status: 401 });
  }

  const limited = await enforceRateLimit(
    req,
    RATE_LIMIT_PRESETS.publicToken,
    `signature-submit:${tokenPrefix(token)}`,
  );
  if (limited) return limited;

  const h = headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  const ua = h.get("user-agent") ?? "unknown";

  const body = (await req.json()) as { zones?: SubmittedZone[] };
  const zonesPayload = Array.isArray(body.zones) ? body.zones : [];
  if (zonesPayload.length === 0) {
    return NextResponse.json({ error: "Aucune zone remplie" }, { status: 400 });
  }

  // Codes d'erreur métier renvoyés par la transaction → mappés sur HTTP en sortie.
  type SubmitError =
    | "NOT_FOUND"
    | "ALREADY_SIGNED"
    | "EXPIRED"
    | "INVALID_STATE"
    | { kind: "MISSING_ZONES"; ids: string[] };

  type SubmitOk = { requestId: string };

  const result = await prisma.$transaction(async (tx): Promise<SubmitOk | { error: SubmitError }> => {
    const signataire = await tx.signataire.findUnique({
      where: { tokenHash: verification.tokenHash },
      include: { request: { include: { zones: true } } },
    });
    if (!signataire) return { error: "NOT_FOUND" };
    const reqRow = signataire.request;

    if (reqRow.statut === "completed" || signataire.statut === "signed") {
      return { error: "ALREADY_SIGNED" };
    }
    if (reqRow.expiresAt && reqRow.expiresAt < new Date()) {
      return { error: "EXPIRED" };
    }
    // viewed → signed est la transition normale. sent → signed aussi accepté si
    // l'utilisateur a sauté la page (peu probable).
    const fromStatus = reqRow.statut as SignatureStatus;
    if (!canTransition(fromStatus, "signed") && fromStatus !== "viewed") {
      return { error: "INVALID_STATE" };
    }

    const requiredIds = reqRow.zones.filter((z) => z.required).map((z) => z.id);
    const providedIds = zonesPayload.map((z) => z.id);
    const missingIds = requiredIds.filter((id) => !providedIds.includes(id));
    if (missingIds.length > 0) {
      return { error: { kind: "MISSING_ZONES", ids: missingIds } };
    }

    for (const z of zonesPayload) {
      await tx.signatureZone.update({
        where: { id: z.id },
        data: {
          filled: true,
          filledValue: z.value,
          filledMethod: z.method,
          filledAt: new Date(),
        },
      });
    }

    // Fingerprint léger : hash(IP + UA + jour ISO). Permet de détecter une signature
    // refaite depuis un device "différent" sans tomber dans le fingerprinting agressif.
    const fingerprint = sha256Hex(`${ip}|${ua}|${new Date().toISOString().slice(0, 10)}`);

    await tx.signataire.update({
      where: { id: signataire.id },
      data: {
        statut: "signed",
        signedAt: new Date(),
        signatureIp: ip,
        signatureUserAgent: ua,
        signatureFingerprint: fingerprint,
      },
    });
    await tx.signatureRequest.update({
      where: { id: reqRow.id },
      data: { statut: "signed", signedAt: new Date() },
    });

    return { requestId: reqRow.id };
  });

  if ("error" in result) {
    const e = result.error;
    if (typeof e === "string") {
      const httpStatus: Record<typeof e, number> = {
        NOT_FOUND: 404,
        ALREADY_SIGNED: 410, // Gone
        EXPIRED: 410,
        INVALID_STATE: 409,
      };
      return NextResponse.json({ error: e }, { status: httpStatus[e] });
    }
    return NextResponse.json({ error: e.kind, missing: e.ids }, { status: 400 });
  }

  // Audit event "signed" hors transaction (table indépendante).
  await appendEvent(result.requestId, {
    type: "signed",
    actorType: "signataire",
    actorId: null,
    payload: { ip, ua, zoneCount: zonesPayload.length },
  });

  // Sync Devis si la SignatureRequest est rattachée à un devis (type=devis).
  // Cahier des charges §2.2 : "Une alerte sera envoyée à l'administrateur dès la signature".
  // → On marque le devis "signe", on log la trace, on déclenche les automatisations
  // (devis_signed) et on notifie l'admin in-app.
  try {
    const reqRow = await prisma.signatureRequest.findUnique({
      where: { id: result.requestId },
      select: { devisId: true, type: true },
    });
    if (reqRow?.devisId && (reqRow.type === "devis" || reqRow.type === "custom")) {
      const { syncDevisOnSignature } = await import("@/lib/signatures/devis-sync");
      await syncDevisOnSignature(reqRow.devisId, result.requestId);
    }
  } catch (err) {
    console.error("[sign.submit] syncDevisOnSignature failed:", err);
    // Ne pas faire échouer le flow de signature pour autant — le devis pourra
    // être resynchronisé manuellement par l'admin.
  }

  // Déclenche la finalisation crypto en arrière-plan (fire-and-forget).
  // On ne await PAS : la réponse HTTP au signataire est immédiate.
  // Si la Netlify Function se termine avant la fin de l'exécution background,
  // le cron signature-retry-finalization reprendra sur les statut "signed" >5min.
  import("@/lib/signatures/finalize")
    .then(({ finalizeSignatureRequest }) =>
      finalizeSignatureRequest(result.requestId).catch((err) =>
        console.error("[finalize] échec arrière-plan:", err),
      ),
    )
    .catch((err) => console.error("[finalize] échec import:", err));

  return NextResponse.json({ ok: true });
});
