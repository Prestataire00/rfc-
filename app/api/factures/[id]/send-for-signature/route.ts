// POST /api/factures/[id]/send-for-signature
//
// Orchestration « 1-clic » pour envoyer une facture en signature
// électronique (acquittement client). Calqué sur send-for-signature
// du devis. Workflow :
//   1. Charge la facture + son devis source (lignes, contact, entreprise)
//   2. Garde-fou : nettoie les SignatureRequest draft orphelines,
//      bloque si une demande active (sent/viewed) existe déjà
//   3. Génère le PDF facture (mêmes mentions légales que /api/pdf/facture)
//   4. Crée la SignatureRequest type="facture"
//   5. Upload PDF dans signatures-original
//   6. Place 2 SignatureZone (signature client + date auto)
//   7. Crée le Signataire + token, envoie l'email avec lien /sign/[token]
//
// Quand le client signera, lib/signatures/finalize.ts produira le PDF
// stampé. Note : aucune transition de statut Facture automatique côté
// signature — l'acquittement comptable reste manuel via le bouton
// « Marquer comme payée » (la signature électronique = preuve de
// réception/acceptation, pas de paiement).

export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { render } from "@react-email/render";
import { sendEmail } from "@/lib/email";
import SignatureRequestEmail from "@/emails/SignatureRequestEmail";

import { facturePdf } from "@/lib/pdf/templates";
import { generatePdfBuffer } from "@/lib/pdf/generate";
import { getParametres } from "@/lib/parametres";
import { resolveBranding } from "@/lib/pdf/branding";
import { renderDocumentTemplate } from "@/lib/document-templates";

import { BUCKETS, uploadSignatureFile } from "@/lib/signatures/bucket";
import { sha256Hex } from "@/lib/signatures/hash";
import { validatePdfBuffer } from "@/lib/signatures/validation";
import { generateToken } from "@/lib/signatures/token";
import { appendEvent } from "@/lib/signatures/audit-chain";
import { logAction } from "@/lib/historique";

export const POST = withErrorHandlerParams<{ id: string }>(
  async (_req: NextRequest, { params }) => {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    try {
      return await handle(params.id, session.user.id);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erreur inconnue lors de l'envoi pour signature";
      console.error("[facture-send-for-signature]", { factureId: params.id, error: message, stack: e instanceof Error ? e.stack : undefined });
      return NextResponse.json({ error: `Envoi pour signature : ${message}` }, { status: 500 });
    }
  },
);

async function handle(factureId: string, adminUserId: string): Promise<NextResponse> {
  // 1. Charger la facture + dépendances (les lignes viennent du devis source)
  const [facture, parametres] = await Promise.all([
    prisma.facture.findUnique({
      where: { id: factureId },
      include: {
        entreprise: true,
        devis: {
          include: {
            lignes: true,
            contact: true,
            sessions: { select: { dateDebut: true, dateFin: true } },
          },
        },
      },
    }),
    prisma.parametres.findUnique({ where: { id: "default" } }),
  ]);

  if (!facture) {
    return NextResponse.json({ error: "Facture introuvable" }, { status: 404 });
  }
  const contact = facture.devis?.contact;
  if (!contact?.email) {
    return NextResponse.json(
      { error: "Aucun contact avec email rattaché à cette facture (via le devis source) — impossible d'envoyer pour signature" },
      { status: 400 },
    );
  }
  const lignes = facture.devis?.lignes ?? [];
  if (lignes.length === 0) {
    return NextResponse.json(
      { error: "Facture sans lignes (devis source vide) — ajoutez des lignes avant d'envoyer" },
      { status: 400 },
    );
  }

  // 2. Garde-fou doublons
  const drafts = await prisma.signatureRequest.findMany({
    where: {
      statut: "draft",
      type: "facture",
      // FK soft entre SignatureRequest et Facture ; on tag l'id facture dans
      // le champ devisId du SignatureRequest existant n'est pas pertinent.
      // On utilise contactId + entrepriseId + titre pour identifier les drafts.
    },
    select: { id: true, titre: true },
  });
  const draftsThisFacture = drafts.filter((d) => d.titre.includes(facture.numero));
  if (draftsThisFacture.length > 0) {
    await prisma.signatureRequest.deleteMany({
      where: { id: { in: draftsThisFacture.map((d) => d.id) } },
    });
  }
  const active = await prisma.signatureRequest.findFirst({
    where: {
      type: "facture",
      titre: { contains: facture.numero },
      statut: { in: ["ready", "sent", "viewed"] },
    },
    select: { id: true, statut: true },
  });
  if (active) {
    return NextResponse.json(
      {
        error: `Une demande de signature est déjà active pour cette facture (statut: ${active.statut}). Annulez-la avant d'en créer une nouvelle.`,
        existingRequestId: active.id,
      },
      { status: 409 },
    );
  }

  // 3. Générer le PDF facture (rendu conforme — mêmes mentions que /api/pdf/facture)
  const docDef = facturePdf({
    numero: facture.numero,
    dateEmission: facture.dateEmission.toISOString(),
    dateEcheance: facture.dateEcheance.toISOString(),
    societe: parametres
      ? {
          nom: parametres.nomEntreprise,
          slogan: parametres.slogan,
          adresse: parametres.adresse,
          codePostal: parametres.codePostal,
          ville: parametres.ville,
          telephone: parametres.telephone,
          email: parametres.email,
          siret: parametres.siret,
          nda: parametres.nda,
          tvaIntracom: parametres.tvaIntracom,
          conditionsPaiement: parametres.conditionsPaiement,
          mentionsFacture: parametres.mentionsFacture,
          formeJuridique: parametres.formeJuridique,
          regimeTVA: parametres.regimeTVA,
          penalitesRetard: parametres.penalitesRetard,
          indemniteRecouvrement: parametres.indemniteRecouvrement,
        }
      : undefined,
    entreprise: facture.entreprise
      ? {
          nom: facture.entreprise.nom,
          adresse: facture.entreprise.adresse || undefined,
          ville: facture.entreprise.ville || undefined,
          codePostal: facture.entreprise.codePostal || undefined,
          siret: facture.entreprise.siret || undefined,
          email: facture.entreprise.email || undefined,
          telephone: facture.entreprise.telephone || undefined,
        }
      : undefined,
    contact: { nom: contact.nom, prenom: contact.prenom, email: contact.email },
    lignes: lignes.map((l) => ({
      designation: l.designation,
      quantite: l.quantite,
      prixUnitaire: l.prixUnitaire,
      montant: l.montant,
      tauxTVA: l.tauxTVA,
      caracteristiques: l.caracteristiques,
    })),
    montantHT: facture.montantHT,
    tauxTVA: facture.tauxTVA,
    montantTTC: facture.montantTTC,
    notes: facture.notes || undefined,
    devisNumero: facture.devis?.numero || undefined,
    sessions: (facture.devis?.sessions ?? []).map((s) => ({
      dateDebut: s.dateDebut.toISOString(),
      dateFin: s.dateFin.toISOString(),
    })),
  }, {
    branding: await resolveBranding(await getParametres()),
    template:
      (await renderDocumentTemplate("facture", {
        entreprise: {
          nomEntreprise: parametres?.nomEntreprise || "",
          adresse: parametres?.adresse || "",
          siret: parametres?.siret || "",
          nda: parametres?.nda || "",
        },
      })) || undefined,
  });
  const pdfBuffer = Buffer.from(await generatePdfBuffer(docDef));

  // 4. Validate
  let pageCount: number;
  try {
    ({ pageCount } = await validatePdfBuffer(pdfBuffer));
  } catch (e) {
    return NextResponse.json(
      { error: `PDF de la facture invalide : ${(e as Error).message}` },
      { status: 500 },
    );
  }
  const sha256 = sha256Hex(pdfBuffer);

  // 5. SignatureRequest en draft (type=facture)
  const titre = `Facture ${facture.numero}`;
  let request = await prisma.signatureRequest.create({
    data: {
      titre,
      description: `Facture ${facture.numero} pour ${facture.entreprise?.nom || contact.prenom + " " + contact.nom}`,
      type: "facture",
      contactId: contact.id,
      entrepriseId: facture.entrepriseId,
      originalFileUrl: "",
      originalFileSha256: sha256,
      originalFileSize: pdfBuffer.length,
      originalPageCount: pageCount,
      createdByUserId: adminUserId,
    },
  });

  // 6. Upload PDF
  const pdfPath = `${request.id}/original.pdf`;
  try {
    await uploadSignatureFile(BUCKETS.ORIGINAL, pdfPath, pdfBuffer);
  } catch (e) {
    await prisma.signatureRequest.delete({ where: { id: request.id } }).catch(() => {});
    const msg = e instanceof Error ? e.message : "Échec upload Supabase";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
  request = await prisma.signatureRequest.update({
    where: { id: request.id },
    data: { originalFileUrl: pdfPath },
  });

  // 7. Audit event created
  await appendEvent(request.id, {
    type: "created",
    actorType: "admin",
    actorId: adminUserId,
    payload: { originalFileSha256: sha256, originalPageCount: pageCount, sizeBytes: pdfBuffer.length, factureId },
  });

  // 8. Zones signature + date (coords identiques au devis — même signatureBlock)
  await prisma.signatureZone.create({
    data: {
      requestId: request.id,
      page: pageCount,
      x: 308,
      y: 680,
      width: 235,
      height: 65,
      type: "signature",
      label: "Signature client",
      required: true,
    },
  });
  await prisma.signatureZone.create({
    data: {
      requestId: request.id,
      page: pageCount,
      x: 340,
      y: 658,
      width: 150,
      height: 12,
      type: "date",
      label: "Date de signature",
      required: false,
    },
  });

  // 9. Signataire + token + envoi email
  const provisional = generateToken();
  const signataire = await prisma.signataire.create({
    data: {
      requestId: request.id,
      email: contact.email,
      nom: `${contact.prenom} ${contact.nom}`,
      contactId: contact.id,
      tokenHash: provisional.tokenHash,
      statut: "pending",
    },
  });

  const { fullToken, tokenHash } = generateToken();
  const expiryDays = Number(process.env.SIGNATURE_TOKEN_EXPIRY_DAYS ?? 30);
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

  await prisma.signataire.update({
    where: { id: signataire.id },
    data: { tokenHash, tokenSentAt: new Date(), statut: "pending" },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "https://projetrfc.netlify.app";
  const signUrl = `${baseUrl}/sign/${fullToken}`;

  const expediteurUser = await prisma.user.findUnique({
    where: { id: adminUserId },
    select: { nom: true, prenom: true, email: true },
  });
  const expediteurNom = expediteurUser
    ? [expediteurUser.prenom, expediteurUser.nom].filter(Boolean).join(" ") || expediteurUser.email
    : "Rescue Formation Conseil";

  const html = await render(
    SignatureRequestEmail({
      signataireNom: signataire.nom,
      documentTitre: titre,
      expediteurNom,
      signUrl,
      expiresAt,
    }),
  );

  await sendEmail({
    to: signataire.email,
    subject: `Facture à signer — ${facture.numero}`,
    html,
  });

  await prisma.signatureRequest.update({
    where: { id: request.id },
    data: { statut: "sent", sentAt: new Date(), expiresAt },
  });
  await appendEvent(request.id, {
    type: "sent",
    actorType: "admin",
    actorId: adminUserId,
    payload: { signataireEmail: signataire.email, expiresAt: expiresAt.toISOString() },
  });

  try {
    await logAction({
      action: "facture_signature_envoyee",
      label: `Facture ${facture.numero} envoyée pour signature électronique`,
      detail: `Lien envoyé à ${signataire.email}`,
      lien: `/commercial/factures/${factureId}`,
      entrepriseId: facture.entrepriseId ?? undefined,
      contactId: contact.id,
    });
  } catch {
    // log non bloquant
  }

  return NextResponse.json({
    ok: true,
    signatureRequestId: request.id,
    sentTo: signataire.email,
    expiresAt,
  });
}
