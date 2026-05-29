// Renvoi de l'email de signature pour les demandes déjà envoyées (statut
// sent / viewed) — typiquement quand le signataire n'a pas reçu le mail
// ou l'a perdu. Régénère un nouveau token : l'ancien lien est invalidé,
// ce qui évite qu'un lien intercepté/transmis reste utilisable
// indéfiniment. expiresAt repart à zéro (30 jours par défaut).

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

export const dynamic = "force-dynamic";

const RESEND_ALLOWED_STATUTS = ["sent", "viewed"] as const;

export const POST = withErrorHandlerParams<{ id: string }>(async (_req: NextRequest, ctx) => {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const request = await prisma.signatureRequest.findUnique({
    where: { id: ctx.params.id },
    include: { signataire: true },
  });
  if (!request) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (!request.signataire) {
    return NextResponse.json({ error: "Aucun signataire défini" }, { status: 400 });
  }
  if (!RESEND_ALLOWED_STATUTS.includes(request.statut as (typeof RESEND_ALLOWED_STATUTS)[number])) {
    return NextResponse.json(
      { error: `Renvoi impossible depuis le statut "${request.statut}". Statuts autorisés : sent, viewed.` },
      { status: 409 },
    );
  }

  const expediteur = await prisma.user.findUnique({
    where: { id: request.createdByUserId },
    select: { nom: true, prenom: true, email: true },
  });
  const expediteurNom = expediteur
    ? [expediteur.prenom, expediteur.nom].filter(Boolean).join(" ") || expediteur.email
    : "Rescue Formation Conseil";

  // Régénère un token frais — l'ancien hash est écrasé, donc l'ancien lien
  // ne pourra plus authentifier le signataire.
  const { fullToken, tokenHash } = generateToken();
  const expiryDays = Number(process.env.SIGNATURE_TOKEN_EXPIRY_DAYS ?? 30);
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

  await prisma.signataire.update({
    where: { id: request.signataire.id },
    data: { tokenHash, tokenSentAt: new Date() },
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
    subject: `Rappel — document à signer : ${request.titre}`,
    html,
  });

  // expiresAt rafraîchi pour reset le timer ; statut reste inchangé (sent / viewed).
  await prisma.signatureRequest.update({
    where: { id: ctx.params.id },
    data: { expiresAt },
  });

  await appendEvent(ctx.params.id, {
    type: "resent",
    actorType: "admin",
    actorId: session.user.id,
    payload: {
      signataireEmail: request.signataire.email,
      expiresAt: expiresAt.toISOString(),
    },
  });

  return NextResponse.json({ ok: true, sentTo: request.signataire.email, expiresAt });
});
