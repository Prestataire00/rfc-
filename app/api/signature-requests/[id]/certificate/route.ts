// Spec §"Phase 4 — Finalisation" étape 4 : téléchargement du certificat de preuve.
// Le certificat est généré et stocké dans le bucket SIGNATURES_CERTIFICATES par
// finalize.ts (Sprint 5). Cette route streame le PDF depuis le bucket privé.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { BUCKETS, downloadSignatureFile } from "@/lib/signatures/bucket";

export const dynamic = "force-dynamic";

export const GET = withErrorHandlerParams<{ id: string }>(async (_req, ctx) => {
  // Auth : admin OU le signataire lui-même (via signedToken ?), ou client de l'entreprise.
  // V1 simple : admin uniquement. À étendre en V2 selon besoins.
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const r = await prisma.signatureRequest.findUnique({
    where: { id: ctx.params.id },
    select: { certificateUrl: true, titre: true },
  });
  if (!r) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (!r.certificateUrl) {
    return NextResponse.json(
      { error: "Certificat pas encore généré (en attente de finalisation)" },
      { status: 425 }, // 425 Too Early
    );
  }

  const buf = await downloadSignatureFile(BUCKETS.CERTIFICATES, r.certificateUrl);
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${r.titre.replace(/[^a-z0-9-_]/gi, "_")}-certificat.pdf"`,
    },
  });
});
