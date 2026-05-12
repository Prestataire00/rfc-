// Spec: docs/superpowers/specs/2026-05-12-signature-electronique-self-hosted-design.md
// Sprint 2 : POST upload PDF (multipart) + créer SignatureRequest draft.
// Sprint 6 : GET liste paginée pour /signatures (admin).
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";
import { sha256Hex } from "@/lib/signatures/hash";
import { BUCKETS, uploadSignatureFile } from "@/lib/signatures/bucket";
import { validatePdfBuffer } from "@/lib/signatures/validation";
import { appendEvent } from "@/lib/signatures/audit-chain";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async () => {
  return NextResponse.json({ error: "Not implemented (sprint 6)" }, { status: 501 });
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const titre = form.get("titre");

  if (!(file instanceof File) || typeof titre !== "string" || !titre.trim()) {
    return NextResponse.json(
      { error: "Paramètres manquants : `file` (PDF) et `titre` (string non vide) requis" },
      { status: 400 },
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  let pageCount: number;
  try {
    ({ pageCount } = await validatePdfBuffer(buf));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  const hash = sha256Hex(buf);
  const type = (form.get("type") as string) || "custom";
  const description = (form.get("description") as string | null) ?? null;
  const devisId = (form.get("devisId") as string | null) ?? null;
  const sessionId = (form.get("sessionId") as string | null) ?? null;
  const contactId = (form.get("contactId") as string | null) ?? null;
  const entrepriseId = (form.get("entrepriseId") as string | null) ?? null;

  // 1. Crée la SignatureRequest avec un originalFileUrl provisoire (rempli juste après).
  const request = await prisma.signatureRequest.create({
    data: {
      titre: titre.trim(),
      description,
      type,
      devisId,
      sessionId,
      contactId,
      entrepriseId,
      originalFileUrl: "",
      originalFileSha256: hash,
      originalFileSize: buf.length,
      originalPageCount: pageCount,
      createdByUserId: session.user.id,
    },
  });

  // 2. Upload dans le bucket BUCKETS.ORIGINAL avec path = `{requestId}/original.pdf`.
  //    (path stable, permet le retelechargement et la traçabilité)
  const path = `${request.id}/original.pdf`;
  await uploadSignatureFile(BUCKETS.ORIGINAL, path, buf);

  // 3. Met à jour le path stocké, puis ouvre la chaîne audit avec l'event "created".
  const updated = await prisma.signatureRequest.update({
    where: { id: request.id },
    data: { originalFileUrl: path },
  });
  await appendEvent(request.id, {
    type: "created",
    actorType: "admin",
    actorId: session.user.id,
    payload: { originalFileSha256: hash, originalPageCount: pageCount, sizeBytes: buf.length },
  });

  return NextResponse.json(updated, { status: 201 });
});
