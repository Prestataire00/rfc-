// POST /api/devis/[id]/send-for-signature
//
// Orchestration "1-click" pour envoi devis en signature électronique :
//  1. Génère le PDF du devis en mémoire
//  2. Crée la SignatureRequest (type=devis, devisId rattaché)
//  3. Upload le PDF dans signatures-original
//  4. Crée le Signataire (email du contact du devis)
//  5. Place une zone signature par défaut (bas dernière page)
//  6. Transition statut draft → ready → sent
//  7. Génère token + envoie email avec lien /sign/[token]
//  8. Passe Devis.statut à "envoye" (sync auto Demande via PATCH workflow)
//
// Quand le client signera via /sign/[token], lib/signatures/devis-sync.ts
// re-synchronise Devis → "signe" + Demande → "accepte" + Contact → "client".

export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { render } from "@react-email/render";
import { sendEmail } from "@/lib/email";
import SignatureRequestEmail from "@/emails/SignatureRequestEmail";

import { devisPdf } from "@/lib/pdf/templates";
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

    // Route admin only → on expose le message d'erreur au lieu de laisser
    // le wrapper le masquer en "Erreur serveur" générique. Le log structuré
    // garde la stack trace côté serveur pour les logs Netlify.
    try {
      return await handle(params.id, session.user.id);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erreur inconnue lors de l'envoi pour signature";
      console.error("[send-for-signature]", { devisId: params.id, error: message, stack: e instanceof Error ? e.stack : undefined });
      return NextResponse.json({ error: `Envoi pour signature : ${message}` }, { status: 500 });
    }
  },
);

async function handle(devisId: string, adminUserId: string): Promise<NextResponse> {
    // Note : la fonction handle() conserve la logique d'origine — seule la
    // récupération de adminUserId est passée en paramètre adminUserId.

    // 1. Charger le devis + ses dépendances
    const [devis, parametres] = await Promise.all([
      prisma.devis.findUnique({
        where: { id: devisId },
        include: {
          lignes: true,
          entreprise: true,
          contact: true,
          sessions: { select: { dateDebut: true, dateFin: true } },
        },
      }),
      prisma.parametres.findUnique({ where: { id: "default" } }),
    ]);

    if (!devis) {
      return NextResponse.json({ error: "Devis introuvable" }, { status: 404 });
    }
    if (!devis.contact?.email) {
      return NextResponse.json(
        { error: "Le contact du devis n'a pas d'email — impossible d'envoyer pour signature" },
        { status: 400 },
      );
    }
    if (devis.lignes.length === 0) {
      return NextResponse.json(
        { error: "Devis vide (aucune ligne) — ajoutez des lignes avant d'envoyer" },
        { status: 400 },
      );
    }

    // Garde-fou : on bloque uniquement si une SignatureRequest ACTIVE existe
    // (envoyée au client, vue, etc.) — on ne veut pas créer un doublon en
    // attente côté signataire. Les "draft" sont des orphelines d'essais
    // n'ayant pas abouti à un upload : on les nettoie automatiquement.
    const drafts = await prisma.signatureRequest.findMany({
      where: { devisId, statut: "draft" },
      select: { id: true },
    });
    if (drafts.length > 0) {
      await prisma.signatureRequest.deleteMany({
        where: { id: { in: drafts.map((d) => d.id) } },
      });
    }
    const active = await prisma.signatureRequest.findFirst({
      where: {
        devisId,
        statut: { in: ["ready", "sent", "viewed"] },
      },
      select: { id: true, statut: true },
    });
    if (active) {
      return NextResponse.json(
        {
          error: `Une demande de signature est déjà active pour ce devis (statut: ${active.statut}). Annulez-la avant d'en créer une nouvelle.`,
          existingRequestId: active.id,
        },
        { status: 409 },
      );
    }

    // 2. Générer le PDF du devis en mémoire (même rendu que /api/pdf/devis/[id])
    const docDef = devisPdf(
      {
        numero: devis.numero,
        objet: devis.objet,
        dateEmission: devis.dateEmission.toISOString(),
        dateValidite: devis.dateValidite.toISOString(),
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
              mentionsDevis: parametres.mentionsDevis,
              formeJuridique: parametres.formeJuridique,
              regimeTVA: parametres.regimeTVA,
              penalitesRetard: parametres.penalitesRetard,
              indemniteRecouvrement: parametres.indemniteRecouvrement,
            }
          : undefined,
        entreprise: devis.entreprise
          ? {
              nom: devis.entreprise.nom,
              adresse: devis.entreprise.adresse || undefined,
              ville: devis.entreprise.ville || undefined,
              codePostal: devis.entreprise.codePostal || undefined,
              siret: devis.entreprise.siret || undefined,
              email: devis.entreprise.email || undefined,
              telephone: devis.entreprise.telephone || undefined,
            }
          : undefined,
        contact: { nom: devis.contact.nom, prenom: devis.contact.prenom, email: devis.contact.email },
        sessions: devis.sessions.map((s) => ({
          dateDebut: s.dateDebut.toISOString(),
          dateFin: s.dateFin.toISOString(),
        })),
        isB2C: !devis.entrepriseId,
        lignes: devis.lignes.map((l) => ({
          tauxTVA: l.tauxTVA,
          designation: l.designation,
          quantite: l.quantite,
          prixUnitaire: l.prixUnitaire,
          montant: l.montant,
        })),
        montantHT: devis.montantHT,
        tauxTVA: devis.tauxTVA,
        montantTTC: devis.montantTTC,
        notes: devis.notes || undefined,
      },
      {
        branding: await resolveBranding(await getParametres()),
        template:
          (await renderDocumentTemplate("devis", {
            entreprise: {
              nomEntreprise: parametres?.nomEntreprise || "",
              adresse: parametres?.adresse || "",
              siret: parametres?.siret || "",
              nda: parametres?.nda || "",
            },
          })) || undefined,
      },
    );
    const pdfBuffer = Buffer.from(await generatePdfBuffer(docDef));

    // 3. Valider le PDF (anti-corruption + page count)
    let pageCount: number;
    try {
      ({ pageCount } = await validatePdfBuffer(pdfBuffer));
    } catch (e) {
      return NextResponse.json(
        { error: `PDF du devis invalide : ${(e as Error).message}` },
        { status: 500 },
      );
    }
    const sha256 = sha256Hex(pdfBuffer);

    // 4. Créer la SignatureRequest en draft
    const titre = `Devis ${devis.numero} — ${devis.objet}`;
    let request = await prisma.signatureRequest.create({
      data: {
        titre,
        description: `Devis ${devis.numero} pour ${devis.entreprise?.nom || devis.contact.prenom + " " + devis.contact.nom}`,
        type: "devis",
        devisId,
        contactId: devis.contactId,
        entrepriseId: devis.entrepriseId,
        originalFileUrl: "",
        originalFileSha256: sha256,
        originalFileSize: pdfBuffer.length,
        originalPageCount: pageCount,
        createdByUserId: adminUserId,
      },
    });

    // 5. Upload le PDF dans le bucket — catché explicitement pour exposer
    // le message en prod (le wrapper masque sinon en « Erreur serveur »).
    // Si l'upload échoue, on nettoie la SignatureRequest orpheline créée à l'étape 4.
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

    // 6. Audit chain : event "created"
    await appendEvent(request.id, {
      type: "created",
      actorType: "admin",
      actorId: adminUserId,
      payload: { originalFileSha256: sha256, originalPageCount: pageCount, sizeBytes: pdfBuffer.length },
    });

    // 7. Zone signature par défaut : bas droite de la dernière page.
    //    A4 portrait = 595×842 points (72 dpi). Zone 200×60 points.
    //    Coords stockées en TOP-LEFT (cf. lib/signatures/zones.ts) :
    //    y = pageHeight (842) − marge bas (60) − hauteur zone (60) = 722
    //    → zone à 60 pts du bas, hors zone d'entête « DEVIS / Numéro / Date ».
    await prisma.signatureZone.create({
      data: {
        requestId: request.id,
        page: pageCount,
        x: 350,
        y: 722,
        width: 200,
        height: 60,
        type: "signature",
        label: "Signature client",
        required: true,
      },
    });

    // 8. Créer le Signataire (= contact du devis) avec token provisoire
    //    Le tokenHash sera remplacé juste après par le vrai token envoyé.
    const provisional = generateToken();
    const signataire = await prisma.signataire.create({
      data: {
        requestId: request.id,
        email: devis.contact.email,
        nom: `${devis.contact.prenom} ${devis.contact.nom}`,
        contactId: devis.contactId,
        tokenHash: provisional.tokenHash,
        statut: "pending",
      },
    });

    // 9. Générer le vrai token + update Signataire + statut → "sent"
    const { fullToken, tokenHash } = generateToken();
    const expiryDays = Number(process.env.SIGNATURE_TOKEN_EXPIRY_DAYS ?? 30);
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

    await prisma.signataire.update({
      where: { id: signataire.id },
      data: { tokenHash, tokenSentAt: new Date(), statut: "pending" },
    });

    const baseUrl = process.env.NEXTAUTH_URL ?? "https://projetrfc.netlify.app";
    const signUrl = `${baseUrl}/sign/${fullToken}`;

    // Résout les prénom/nom complets via la DB pour l'affichage expéditeur ;
    // fallback sur l'email puis sur le nom de l'organisation.
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
      subject: `Devis à signer — ${devis.numero}`,
      html,
    });

    // 10. Statut SignatureRequest → "sent" + audit event
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

    // 11. Sync Devis.statut → "envoye" (déclenche aussi la sync Demande)
    if (devis.statut === "brouillon") {
      await prisma.devis.update({
        where: { id: devisId },
        data: { statut: "envoye" },
      });
      // Sync Demande liée
      const demandesLiees = await prisma.demande.findMany({
        where: { devisId, statut: { not: "devis_envoye" } },
        select: { id: true },
      });
      for (const d of demandesLiees) {
        await prisma.demande.update({ where: { id: d.id }, data: { statut: "devis_envoye" } });
      }
    }

    // 12. Historique applicatif (séparé de la chaîne audit signature)
    try {
      await logAction({
        action: "devis_signature_envoyee",
        label: `Devis ${devis.numero} envoyé pour signature électronique`,
        detail: `Lien envoyé à ${signataire.email}`,
        lien: `/commercial/devis/${devisId}`,
        entrepriseId: devis.entrepriseId ?? undefined,
        contactId: devis.contactId ?? undefined,
        devisId,
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
