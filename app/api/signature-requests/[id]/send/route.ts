// Spec §"Phase 2 — Token & envoi email".
// Sprint 3 : génère token HMAC, hashe pour BD, envoie email avec lien magique,
// passe statut ready→sent, append event sent.
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { render } from "@react-email/render";
import { sendEmail } from "@/lib/email";
import SignatureRequestEmail from "@/emails/SignatureRequestEmail";
import { generateToken } from "@/lib/signatures/token";
import { appendEvent } from "@/lib/signatures/audit-chain";
import { canTransition, type SignatureStatus } from "@/lib/signatures/workflow";

export const dynamic = "force-dynamic";

export const POST = withErrorHandlerParams<{ id: string }>(async (_req: NextRequest, ctx) => {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const request = await prisma.signatureRequest.findUnique({
    where: { id: ctx.params.id },
    include: { signataire: true, zones: true },
  });
  if (!request) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (!request.signataire) {
    return NextResponse.json({ error: "Aucun signataire défini" }, { status: 400 });
  }
  if (request.zones.length === 0) {
    return NextResponse.json({ error: "Aucune zone de signature placée" }, { status: 400 });
  }
  // FK soft : createdByUserId pas en relation, on lookup séparément.
  const expediteur = await prisma.user.findUnique({
    where: { id: request.createdByUserId },
    select: { nom: true, prenom: true, email: true },
  });
  const expediteurNom = expediteur
    ? `${expediteur.prenom ?? ""} ${expediteur.nom ?? ""}`.trim() || expediteur.email
    : "Rescue Formation Conseil";
  if (!canTransition(request.statut as SignatureStatus, "sent")) {
    return NextResponse.json(
      { error: `Impossible d'envoyer une demande en statut ${request.statut}` },
      { status: 409 },
    );
  }

  // Génère un nouveau token (remplace le provisoire stocké au PATCH).
  // Le fullToken n'est JAMAIS persisté — seul son hash l'est.
  const { fullToken, tokenHash } = generateToken();
  const expiryDays = Number(process.env.SIGNATURE_TOKEN_EXPIRY_DAYS ?? 30);
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

  await prisma.signataire.update({
    where: { id: request.signataire.id },
    data: { tokenHash, tokenSentAt: new Date(), statut: "pending" },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "https://projetrfc.netlify.app";
  const signUrl = `${baseUrl}/sign/${fullToken}`;

  const html = await render(
    SignatureRequestEmail({
      signataireNom: request.signataire.nom,
      documentTitre: request.titre,
      expediteurNom,
      signUrl,
      expiresAt,
    }),
  );

  await sendEmail({
    to: request.signataire.email,
    subject: `Document à signer — ${request.titre}`,
    html,
  });

  await prisma.signatureRequest.update({
    where: { id: ctx.params.id },
    data: { statut: "sent", sentAt: new Date(), expiresAt },
  });
  await appendEvent(ctx.params.id, {
    type: "sent",
    actorType: "admin",
    actorId: session.user.id,
    payload: {
      signataireEmail: request.signataire.email,
      expiresAt: expiresAt.toISOString(),
    },
  });

  return NextResponse.json({
    ok: true,
    sentTo: request.signataire.email,
    expiresAt,
  });
});
