/**
 * Finalisation cryptographique d'une demande de signature — Sprint 5.
 *
 * Pipeline (idempotent) :
 *   1. Charge SignatureRequest + zones remplies + signataire
 *   2. Download PDF original depuis bucket SIGNATURES_ORIGINAL
 *   3. stampSignatures (embed images/textes dans les zones)
 *   4. sha256Hex du PDF signé
 *   5. Upload PDF signé dans bucket SIGNATURES_SIGNED
 *   6. requestTimestampWithRetry (FreeTSA RFC 3161) — non-bloquant si échec
 *   7. generateProofCertificate (PDF certificat avec audit + QR)
 *   8. Upload certificat dans bucket SIGNATURES_CERTIFICATES
 *   9. SignatureRequest.statut → completed + appendEvent "completed"
 *  10. Email signataire avec PDF signé + certificat en pièces jointes
 *  11. Email admin "signature complétée"
 *
 * Idempotence : peut être rappelée plusieurs fois sans corruption (le cron
 * signature-retry-finalization l'invoque si le statut reste "signed" >5min).
 * Les ré-uploads Supabase écrasent (upsert=false original mais on appelle remove
 * d'abord — voir bucket.ts). Pour simplifier en V1, on accepte que les ré-essais
 * créent des appendEvent dupliqués (toujours détectables via audit chain).
 *
 * Erreurs partielles : si TSA échoue, on continue avec tsaTimestamp=null + flag
 * "requiresTimestamp" — le job nocturne reprendra. Si stamping ou upload échoue,
 * on throw → le statut reste "signed" et le cron retry essayera plus tard.
 */
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { BUCKETS, downloadSignatureFile, uploadSignatureFile } from "./bucket";
import { stampSignatures, type SignatureFill } from "./pdf-stamper";
import { sha256Hex } from "./hash";
import { requestTimestampWithRetry } from "./tsa";
import { generateProofCertificate } from "./certificate-generator";
import { appendEvent } from "./audit-chain";

export type FinalizeResult =
  | { ok: true; requestId: string; tsaOk: boolean }
  | { ok: false; reason: string };

export async function finalizeSignatureRequest(
  requestId: string,
): Promise<FinalizeResult> {
  const r = await prisma.signatureRequest.findUnique({
    where: { id: requestId },
    include: { zones: true, signataire: true },
  });
  if (!r) return { ok: false, reason: "NOT_FOUND" };
  if (r.statut !== "signed") return { ok: false, reason: `INVALID_STATE:${r.statut}` };
  if (!r.signataire) return { ok: false, reason: "NO_SIGNATAIRE" };

  // 1. Reconstruction PDF final
  const originalBuf = await downloadSignatureFile(BUCKETS.ORIGINAL, r.originalFileUrl);
  // Inclut aussi les zones type="date" non remplies → le stamper drawText
  // automatiquement la date du jour (cas usuel : « Date : ___ » du bloc signature).
  const fills: SignatureFill[] = r.zones
    .filter((z) => (z.filled && z.filledValue && z.filledMethod) || z.type === "date")
    .map((z) => ({
      page: z.page,
      x: z.x,
      y: z.y,
      width: z.width,
      height: z.height,
      type: z.type as SignatureFill["type"],
      method: (z.filledMethod as SignatureFill["method"]) || "text",
      value: z.filledValue ?? "",
    }));
  const signedBuf = await stampSignatures(originalBuf, fills);

  // 2. Hash
  const signedHash = sha256Hex(signedBuf);

  // 3. Upload PDF signé (path stable {id}/signed.pdf — écrase si re-essai)
  const signedPath = `${r.id}/signed.pdf`;
  await uploadSignatureFile(BUCKETS.SIGNED, signedPath, signedBuf);

  // 4. Horodatage TSA (best-effort)
  const tsa = await requestTimestampWithRetry(signedHash, 3);

  // 5. Update BD + audit event tsa_stamped
  await prisma.signatureRequest.update({
    where: { id: r.id },
    data: {
      signedFileUrl: signedPath,
      signedFileSha256: signedHash,
      tsaTimestamp: tsa ? Buffer.from(tsa.timestampToken, "base64") : null,
      tsaTimestampedAt: tsa?.timestampedAt ?? null,
    },
  });
  if (tsa) {
    await appendEvent(r.id, {
      type: "tsa_stamped",
      actorType: "system",
      actorId: null,
      payload: { provider: "freetsa.org", hashSha256: signedHash },
    });
  }

  // 6. Certificat de preuve (PDF séparé)
  const certBuf = await generateProofCertificate(r.id);
  const certPath = `${r.id}/certificate.pdf`;
  await uploadSignatureFile(BUCKETS.CERTIFICATES, certPath, certBuf);

  // 7. Transition signed → completed + audit "completed"
  await prisma.signatureRequest.update({
    where: { id: r.id },
    data: { certificateUrl: certPath, statut: "completed", completedAt: new Date() },
  });
  await appendEvent(r.id, {
    type: "completed",
    actorType: "system",
    actorId: null,
    payload: { signedHash, hasTimestamp: !!tsa },
  });

  // 8. Notifications email (signataire + admin)
  const expediteur = await prisma.user.findUnique({
    where: { id: r.createdByUserId },
    select: { email: true },
  });
  await sendEmail({
    to: r.signataire.email,
    subject: `Document signé — ${r.titre}`,
    html: `<p>Bonjour ${r.signataire.nom},</p><p>Votre signature électronique a été finalisée. Vous trouverez ci-joint le document signé et le certificat de preuve.</p><p>Conservez ces fichiers : ils pourront être utilisés pour prouver l'intégrité du document signé en cas de besoin.</p>`,
    attachments: [
      { filename: `${r.titre}-signed.pdf`, content: signedBuf },
      { filename: `${r.titre}-certificat.pdf`, content: certBuf },
    ],
  });
  if (expediteur?.email) {
    await sendEmail({
      to: expediteur.email,
      subject: `Signature complétée — ${r.titre}`,
      html: `<p><b>${r.signataire.nom}</b> (${r.signataire.email}) a signé le document <b>${r.titre}</b>.</p><p><a href="${process.env.NEXTAUTH_URL ?? "https://projetrfc.netlify.app"}/signatures/${r.id}">Voir le détail dans RFC</a></p>`,
    });
  }

  return { ok: true, requestId: r.id, tsaOk: !!tsa };
}
