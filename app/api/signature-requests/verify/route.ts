// Spec §"Phase 5 — Distribution" : route publique de vérification d'intégrité.
// POST avec PDF en multipart → recalcule SHA-256, cherche dans BD, vérifie chaîne audit.
// Endpoint public (pas d'auth NextAuth), rate-limit publicAnon (100/min/IP).
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";
import { sha256Hex } from "@/lib/signatures/hash";
import { verifyAuditChain } from "@/lib/signatures/audit-chain";
import { enforceRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_PRESETS } from "@/lib/rate-limit-presets";

export const dynamic = "force-dynamic";

const MAX_VERIFY_SIZE_BYTES = 30 * 1024 * 1024; // 30 Mo : un peu plus large que upload (25 Mo)

export const POST = withErrorHandler(async (req: NextRequest) => {
  const limited = await enforceRateLimit(
    req,
    RATE_LIMIT_PRESETS.publicAnon,
    "signature-verify",
  );
  if (limited) return limited;

  const form = await req.formData();
  const file = form.get("file");
  const requestId = (form.get("requestId") as string | null) ?? null;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Paramètre `file` (PDF) requis" }, { status: 400 });
  }
  if (file.size > MAX_VERIFY_SIZE_BYTES) {
    return NextResponse.json(
      { error: `Fichier trop volumineux (max ${MAX_VERIFY_SIZE_BYTES / 1024 / 1024} Mo)` },
      { status: 400 },
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const hash = sha256Hex(buf);

  // Stratégie de lookup :
  //  - si requestId fourni (depuis QR code du certificat) → check direct par id
  //  - sinon → fuzzy par hash (peut matcher 1 ou plusieurs requests)
  let match: {
    id: string;
    titre: string;
    signedAt: Date | null;
    completedAt: Date | null;
    hasTimestamp: boolean;
    auditValid: boolean;
    auditBrokenAt?: string;
  } | null = null;

  const candidates = requestId
    ? await prisma.signatureRequest.findMany({
        where: { id: requestId },
        select: { id: true, titre: true, signedAt: true, completedAt: true, signedFileSha256: true, tsaTimestamp: true },
      })
    : await prisma.signatureRequest.findMany({
        where: { signedFileSha256: hash, statut: "completed" },
        select: { id: true, titre: true, signedAt: true, completedAt: true, signedFileSha256: true, tsaTimestamp: true },
        take: 5,
      });

  // En mode requestId, on vérifie aussi que le hash correspond.
  const matched = candidates.find((c) => c.signedFileSha256 === hash);
  if (matched) {
    const audit = await verifyAuditChain(matched.id);
    match = {
      id: matched.id,
      titre: matched.titre,
      signedAt: matched.signedAt,
      completedAt: matched.completedAt,
      hasTimestamp: !!matched.tsaTimestamp,
      auditValid: audit.valid,
      auditBrokenAt: audit.brokenAt,
    };
  }

  return NextResponse.json({
    fileHash: hash,
    fileSize: buf.length,
    matchFound: !!match,
    match,
  });
});
