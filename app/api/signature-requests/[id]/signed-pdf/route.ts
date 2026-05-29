// Télécharge le PDF signé final d'une SignatureRequest depuis le bucket
// signatures-signed. Admin uniquement. Renvoie 404 si pas encore signé.
//
// Le signataire lui-même récupère son exemplaire via le flow /sign/[token].

export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { BUCKETS, downloadSignatureFile } from "@/lib/signatures/bucket";
import { pdfResponse } from "@/lib/pdf/response";

export const GET = withErrorHandlerParams<{ id: string }>(async (_req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const sig = await prisma.signatureRequest.findUnique({
    where: { id: params.id },
    select: { titre: true, signedFileUrl: true, statut: true },
  });
  if (!sig) return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
  if (!sig.signedFileUrl) {
    return NextResponse.json({ error: "PDF signé pas encore disponible" }, { status: 404 });
  }

  const buffer = await downloadSignatureFile(BUCKETS.SIGNED, sig.signedFileUrl);
  const safeName = sig.titre.replace(/[^\w-]+/g, "_").slice(0, 80);
  return pdfResponse(buffer, `signe-${safeName}`);
});
