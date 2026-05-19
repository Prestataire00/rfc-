import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyToken, tokenPrefix } from "@/lib/signatures/token";
import { enforceRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_PRESETS } from "@/lib/rate-limit-presets";
import { appendEvent } from "@/lib/signatures/audit-chain";
import { BUCKETS, getSignedUrl } from "@/lib/signatures/bucket";
import { SignViewClient } from "@/components/signatures/SignViewClient";

/**
 * Vue publique signataire — Sprint 3 = lecture seule (PDF rendu + zones surlignées).
 * La capture de signature sera ajoutée au Sprint 4.
 *
 * Auth = lien magique HMAC dans l'URL (params.token). Validation :
 *  1) HMAC signature (verifyToken) → 401 si invalide (avant DB lookup, anti-DoS)
 *  2) Rate-limit publicToken (30/5min/IP)
 *  3) Lookup Signataire par tokenHash → 404 si pas trouvé
 *  4) Vérification statut + expiration → redirection /sign/[token]/expired le cas échéant
 *  5) Si 1ère ouverture (statut = pending) : audit event "viewed" + transition statut sent→viewed
 */

export const dynamic = "force-dynamic";

interface Props {
  params: { token: string };
}

export default async function SignPage({ params }: Props) {
  const token = params.token;

  const verification = verifyToken(token);
  if (!verification.valid) {
    // HMAC invalide → page expired (on ne distingue pas "format/signature" côté UX).
    redirect(`/sign/${token}/expired`);
  }

  const h = headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown";
  const ua = h.get("user-agent") ?? "unknown";

  // Rate-limit avec preset publicToken (30/5min/IP) — réutilise l'infra du sprint C.
  // Audit 2026-05-19 §3.3 : enforceRateLimit accepte { headers: Headers } directement,
  // plus besoin du cast "as unknown as NextRequest".
  const limited = await enforceRateLimit(
    { headers: h },
    RATE_LIMIT_PRESETS.publicToken,
    `signature-sign:${tokenPrefix(token)}`,
  );
  if (limited) {
    // limited = NextResponse 429. Pour une page, on affiche un message ; on log juste.
    return (
      <div className="container mx-auto p-12 max-w-md text-center">
        <h1 className="text-xl font-bold mb-2">Trop de tentatives</h1>
        <p className="text-gray-600">Veuillez réessayer dans quelques minutes.</p>
      </div>
    );
  }

  const signataire = await prisma.signataire.findUnique({
    where: { tokenHash: verification.tokenHash },
    include: { request: { include: { zones: true } } },
  });
  if (!signataire) {
    redirect(`/sign/${token}/expired`);
  }

  const req = signataire.request;
  if (
    req.statut === "expired" ||
    req.statut === "cancelled" ||
    req.statut === "rejected"
  ) {
    redirect(`/sign/${token}/expired`);
  }
  if (req.expiresAt && req.expiresAt < new Date()) {
    redirect(`/sign/${token}/expired`);
  }
  if (req.statut === "completed" || signataire.statut === "signed") {
    return (
      <div className="container mx-auto p-12 max-w-md text-center">
        <h1 className="text-xl font-bold mb-2">Document déjà signé</h1>
        <p className="text-gray-600">Merci, votre signature a déjà été enregistrée.</p>
      </div>
    );
  }

  // Première ouverture → on log + transition sent → viewed.
  // Idempotent : si re-clic, signataire.statut == viewed et on ne re-log pas.
  if (signataire.statut === "pending") {
    await prisma.$transaction([
      prisma.signataire.update({
        where: { id: signataire.id },
        data: {
          statut: "viewed",
          viewedAt: new Date(),
          signatureIp: ip,
          signatureUserAgent: ua,
        },
      }),
      prisma.signatureRequest.update({
        where: { id: req.id },
        data: { statut: "viewed", viewedAt: new Date() },
      }),
    ]);
    await appendEvent(req.id, {
      type: "viewed",
      actorType: "signataire",
      actorId: signataire.id,
      payload: { ip, ua },
    });
  }

  // Génère une URL signée Supabase temporaire (TTL 10 min) pour que le navigateur
  // puisse fetch le PDF privé sans exposer le bucket à l'index public.
  const fileUrl = await getSignedUrl(BUCKETS.ORIGINAL, req.originalFileUrl, 600);

  return (
    <SignViewClient
      token={token}
      titre={req.titre}
      signataireNom={signataire.nom}
      fileUrl={fileUrl}
      zones={req.zones.map((z) => ({
        id: z.id,
        page: z.page,
        x: z.x,
        y: z.y,
        width: z.width,
        height: z.height,
        type: z.type,
        label: z.label,
        required: z.required,
      }))}
    />
  );
}
