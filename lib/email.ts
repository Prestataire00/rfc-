import nodemailer from "nodemailer";
import { escapeHtml } from "@/lib/html-escape";
import { prisma } from "@/lib/prisma";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = process.env.SMTP_FROM || "RFC <noreply@rfc-formation.fr>";

type EmailOptions = {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer | Uint8Array }[];
  // Métadonnées optionnelles pour enrichir l'entrée LogEmail (rattachement
  // aux fiches contact / session / template d'origine).
  log?: {
    templateId?: string | null;
    sessionId?: string | null;
    contactId?: string | null;
  };
};

export async function sendEmail({ to, subject, html, attachments, log }: EmailOptions): Promise<{ skipped: boolean }> {
  const meta = log ?? {};

  // Skip if SMTP not configured — on logge quand même un essai pour traçabilité
  // ("envoye" avec erreur explicite), sinon l'historique resterait vide en dev.
  if (!process.env.SMTP_USER) {
    console.log(`[EMAIL SKIP] SMTP non configure. To: ${to}, Subject: ${subject}`);
    await logEmailEntry({
      destinataire: to,
      sujet: subject,
      statut: "envoye",
      messageId: null,
      erreur: "SMTP non configuré (skip dev)",
      ...meta,
    });
    return { skipped: true };
  }

  try {
    const result = await transporter.sendMail({
      from: FROM,
      to,
      subject,
      html,
      attachments: attachments?.map((a) => ({
        filename: a.filename,
        content: Buffer.from(a.content),
      })),
    });

    console.log(`[EMAIL SENT] To: ${to}, Subject: ${subject}, MessageId: ${result.messageId}`);
    await logEmailEntry({
      destinataire: to,
      sujet: subject,
      statut: "envoye",
      messageId: result.messageId ?? null,
      erreur: null,
      ...meta,
    });
    return { skipped: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur SMTP inconnue";
    console.error(`[EMAIL ERROR] To: ${to}, Subject: ${subject}, Error: ${message}`);
    await logEmailEntry({
      destinataire: to,
      sujet: subject,
      statut: "bounce",
      messageId: null,
      erreur: message,
      ...meta,
    });
    throw err;
  }
}

// Helper interne : crée une entrée LogEmail sans casser le flow d'envoi
// si Prisma est indisponible. Le statut final peut être mis à jour
// ultérieurement par le webhook Resend (livre / ouvert / clique / bounce).
async function logEmailEntry(data: {
  destinataire: string;
  sujet: string;
  statut: string;
  messageId: string | null;
  erreur: string | null;
  templateId?: string | null;
  sessionId?: string | null;
  contactId?: string | null;
}): Promise<void> {
  try {
    await prisma.logEmail.create({ data });
  } catch (err) {
    // Logging défensif : un échec d'écriture LogEmail ne doit jamais
    // empêcher l'envoi de l'email.
    console.warn("[EMAIL LOG WARN] Impossible d'écrire LogEmail :", err);
  }
}

// ==================== EMAIL TEMPLATES ====================

export function convocationEmail(data: {
  stagiaire: { prenom: string; nom: string };
  formation: { titre: string };
  session: { dateDebut: string; dateFin: string; lieu?: string };
}) {
  return {
    subject: `Convocation - Formation "${data.formation.titre}"`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 20px;">Rescue Formation Conseil</h1>
          <p style="margin: 5px 0 0; opacity: 0.9; font-size: 14px;">Convocation à une formation</p>
        </div>
        <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p>Bonjour <strong>${data.stagiaire.prenom} ${data.stagiaire.nom}</strong>,</p>
          <p>Nous avons le plaisir de vous confirmer votre inscription à la formation suivante :</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 8px; font-weight: bold; color: #64748b;">Formation</td>
              <td style="padding: 8px;">${data.formation.titre}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 8px; font-weight: bold; color: #64748b;">Dates</td>
              <td style="padding: 8px;">Du ${data.session.dateDebut} au ${data.session.dateFin}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 8px; font-weight: bold; color: #64748b;">Lieu</td>
              <td style="padding: 8px;">${data.session.lieu || "A confirmer"}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold; color: #64748b;">Horaires</td>
              <td style="padding: 8px;">9h00 - 12h30 / 14h00 - 17h30</td>
            </tr>
          </table>
          <p>Merci de vous présenter <strong>15 minutes avant</strong> le début de la formation.</p>
          <p>Vous trouverez en pièce jointe votre convocation officielle.</p>
          <p style="color: #64748b; font-size: 12px; margin-top: 24px;">
            Cordialement,<br>L'équipe RFC
          </p>
        </div>
      </div>
    `,
  };
}

export function devisEmail(data: {
  contact: { prenom: string; nom: string };
  entreprise: { nom: string };
  devis: { numero: string; objet: string; montantTTC: number; dateValidite?: string };
  pdfUrl: string;
  retourEmail?: string;
}) {
  // Audit 2026-05-19 §P2 : escape HTML pour toutes les interpolations
  // de données (nom/prénom/objet peuvent contenir < > & " '). URL et
  // montant restent en raw (URL maîtrisée par notre code, montant = number).
  const prenom = escapeHtml(data.contact.prenom);
  const nom = escapeHtml(data.contact.nom);
  const numero = escapeHtml(data.devis.numero);
  const objet = escapeHtml(data.devis.objet);
  const dateValidite = data.devis.dateValidite ? escapeHtml(data.devis.dateValidite) : "";
  const retourEmail = data.retourEmail ? escapeHtml(data.retourEmail) : "";

  const validiteText = dateValidite ? ` Ce devis est valable jusqu'au ${dateValidite}.` : "";
  const retourText = retourEmail
    ? `Une fois signé, vous pouvez nous le retourner à <a href="mailto:${retourEmail}" style="color: #dc2626;">${retourEmail}</a>.`
    : "Une fois signé, vous pouvez nous le retourner par email en réponse.";

  return {
    subject: `Devis ${data.devis.numero} à signer — ${data.devis.objet}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 20px;">Rescue Formation Conseil</h1>
          <p style="margin: 5px 0 0; opacity: 0.9; font-size: 14px;">Devis à examiner</p>
        </div>
        <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p>Bonjour <strong>${prenom} ${nom}</strong>,</p>
          <p>Veuillez trouver ci-dessous notre devis <strong>${numero}</strong> pour :</p>
          <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0; font-weight: bold; font-size: 16px;">${objet}</p>
            <p style="margin: 8px 0 0; color: #dc2626; font-size: 20px; font-weight: bold;">
              ${data.devis.montantTTC.toFixed(2)} EUR TTC
            </p>
          </div>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${data.pdfUrl}"
               style="display: inline-block; background: #dc2626; color: white; text-decoration: none;
                      padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 14px;">
              📄 Examiner le devis (PDF)
            </a>
          </div>
          <p style="color: #475569; font-size: 13px; line-height: 1.5;">
            Merci d'examiner ce devis attentivement.${validiteText}<br><br>
            <strong>Pour l'accepter</strong> : imprimez-le, datez et signez à l'endroit prévu, puis retournez-le par email.
            ${retourText}
          </p>
          <p>N'hésitez pas à nous contacter pour toute question ou demande de modification.</p>
          <p style="color: #64748b; font-size: 12px; margin-top: 24px;">
            Cordialement,<br>L'équipe RFC
          </p>
        </div>
      </div>
    `,
  };
}

export function factureEmail(data: {
  destinataire: { nom: string };
  entreprise: { nom: string };
  facture: { numero: string; montantTTC: number; dateEcheance: string };
}) {
  // Audit 2026-05-19 §P2 : escape HTML interpolations
  const destinataire = escapeHtml(data.destinataire.nom);
  const entreprise = escapeHtml(data.entreprise.nom);
  const numero = escapeHtml(data.facture.numero);
  const dateEcheance = escapeHtml(data.facture.dateEcheance);

  return {
    subject: `Facture ${data.facture.numero} - ${data.entreprise.nom}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 20px;">Rescue Formation Conseil</h1>
          <p style="margin: 5px 0 0; opacity: 0.9; font-size: 14px;">Nouvelle facture</p>
        </div>
        <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p>Bonjour <strong>${destinataire}</strong>,</p>
          <p>Veuillez trouver ci-joint la facture <strong>${numero}</strong> :</p>
          <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0; font-weight: bold; font-size: 16px;">${entreprise}</p>
            <p style="margin: 8px 0 0; color: #2563eb; font-size: 20px; font-weight: bold;">
              ${data.facture.montantTTC.toFixed(2)} EUR TTC
            </p>
            <p style="margin: 8px 0 0; color: #64748b; font-size: 14px;">
              À régler avant le ${dateEcheance}
            </p>
          </div>
          <p>N'hésitez pas à nous contacter pour toute question.</p>
          <p style="color: #64748b; font-size: 12px; margin-top: 24px;">
            Cordialement,<br>L'équipe RFC
          </p>
        </div>
      </div>
    `,
  };
}

// Convention de formation : envoyée auto au stagiaire lors de l'inscription
// à une session. PDF en pièce jointe (généré côté caller via lib/pdf).
export function conventionEmail(data: {
  destinataireNom: string;
  entrepriseNom: string | null;
  formationTitre: string;
  dateDebut: string; // déjà formaté JJ/MM/AAAA
  dateFin: string;
  lieu: string | null;
  numero: string;
}) {
  const destinataire = escapeHtml(data.destinataireNom);
  const entreprise = data.entrepriseNom ? escapeHtml(data.entrepriseNom) : null;
  const formation = escapeHtml(data.formationTitre);
  const dateDebut = escapeHtml(data.dateDebut);
  const dateFin = escapeHtml(data.dateFin);
  const lieu = data.lieu ? escapeHtml(data.lieu) : null;
  const numero = escapeHtml(data.numero);
  return {
    subject: `Convention de formation ${data.numero} — ${data.formationTitre}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 20px;">Rescue Formation Conseil</h1>
          <p style="margin: 5px 0 0; opacity: 0.9; font-size: 14px;">Convention de formation</p>
        </div>
        <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p>Bonjour <strong>${destinataire}</strong>,</p>
          <p>Suite à votre inscription, vous trouverez ci-joint la convention de formation <strong>${numero}</strong> pour la session <strong>"${formation}"</strong>${entreprise ? ` (${entreprise})` : ""}.</p>
          <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
            <p style="margin: 0 0 6px;"><strong>Dates :</strong> du ${dateDebut} au ${dateFin}</p>
            ${lieu ? `<p style="margin: 0;"><strong>Lieu :</strong> ${lieu}</p>` : ""}
          </div>
          <p>Merci de prendre connaissance du document et de nous le retourner signé avant le début de la formation.</p>
          <p style="color: #64748b; font-size: 12px; margin-top: 24px;">Cordialement,<br>L'équipe RFC</p>
        </div>
      </div>
    `,
  };
}

// Attestation de fin de formation : envoyée auto à la clôture de session
// (statut "terminee") + sur action manuelle depuis /sessions/[id].
// PDF en pièce jointe construit côté caller.
export function attestationEmail(data: {
  stagiaireNom: string; // ex "Jean Dupont"
  formationTitre: string;
  dateDebut: string; // déjà formaté JJ/MM/AAAA
  dateFin: string;
}) {
  const stagiaire = escapeHtml(data.stagiaireNom);
  const formation = escapeHtml(data.formationTitre);
  const dateDebut = escapeHtml(data.dateDebut);
  const dateFin = escapeHtml(data.dateFin);
  return {
    subject: `Attestation de fin de formation — ${data.formationTitre}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #059669; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 20px;">Rescue Formation Conseil</h1>
          <p style="margin: 5px 0 0; opacity: 0.9; font-size: 14px;">Attestation de fin de formation</p>
        </div>
        <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p>Bonjour <strong>${stagiaire}</strong>,</p>
          <p>Félicitations pour avoir suivi avec succès la formation <strong>"${formation}"</strong> du ${dateDebut} au ${dateFin}.</p>
          <p>Vous trouverez ci-joint votre <strong>attestation de fin de formation</strong>, à conserver précieusement.</p>
          <div style="background: #ecfdf5; border-left: 4px solid #059669; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
            Cette attestation atteste de votre participation et des compétences acquises lors de la formation.
          </div>
          <p>Pour toute question, n'hésitez pas à nous contacter.</p>
          <p style="color: #64748b; font-size: 12px; margin-top: 24px;">Cordialement,<br>L'équipe RFC</p>
        </div>
      </div>
    `,
  };
}

export function evaluationEmail(data: {
  stagiaire: { prenom: string; nom: string };
  formation: { titre: string };
  type: string;
  lien: string;
}) {
  const typeLabel =
    data.type === "satisfaction_froid"
      ? "satisfaction à froid"
      : "satisfaction à chaud";
  return {
    subject: `Votre avis compte - Evaluation ${typeLabel} "${data.formation.titre}"`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 20px;">Rescue Formation Conseil</h1>
          <p style="margin: 5px 0 0; opacity: 0.9; font-size: 14px;">Évaluation de formation</p>
        </div>
        <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p>Bonjour <strong>${data.stagiaire.prenom} ${data.stagiaire.nom}</strong>,</p>
          <p>Suite à votre formation <strong>"${data.formation.titre}"</strong>, nous souhaitons recueillir votre avis.</p>
          <p>Merci de prendre quelques minutes pour remplir ce questionnaire de ${typeLabel} :</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${data.lien}" style="background: #2563eb; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
              Donner mon avis
            </a>
          </div>
          <p style="color: #64748b; font-size: 12px;">Ce lien est personnel et à usage unique.</p>
          <p style="color: #64748b; font-size: 12px; margin-top: 24px;">
            Cordialement,<br>L'équipe RFC
          </p>
        </div>
      </div>
    `,
  };
}

// Fiche pre-formation ENTREPRISE (envoyee au responsable entreprise)
export function fichePreFormationEntrepriseEmail(data: {
  destinataireNom: string;
  entreprise: { nom: string };
  formation: { titre: string };
  // session optionnelle : la fiche peut être envoyée pré-session (création prospect),
  // auquel cas on adapte le texte (pas de date connue à mentionner).
  session?: { dateDebut: string } | null;
  link: string;
  optionnel?: boolean;
}) {
  const dateFmt = data.session?.dateDebut
    ? new Date(data.session.dateDebut).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : null;
  const intro = dateFmt
    ? `Afin de preparer au mieux la formation <strong>"${data.formation.titre}"</strong> prevue le <strong>${dateFmt}</strong>${data.entreprise.nom ? ` pour <strong>${data.entreprise.nom}</strong>` : ""}, merci de completer ce questionnaire rapide (5 minutes).`
    : `Merci de l'interet que vous portez a notre formation <strong>"${data.formation.titre}"</strong>${data.entreprise.nom ? ` pour <strong>${data.entreprise.nom}</strong>` : ""}. Pour vous proposer un devis adapte a votre contexte, merci de completer ce questionnaire rapide (5 minutes).`;
  const optLabel = data.optionnel
    ? `<p style="background:#fef3c7;border:1px solid #fde68a;color:#92400e;padding:10px;border-radius:6px;font-size:13px;">Formation en mode express : ce questionnaire est <strong>optionnel</strong>. Vous pouvez le completer apres la formation si vous manquez de temps.</p>`
    : "";
  return {
    subject: `Fiche d'analyse du besoin - ${data.formation.titre}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 20px;">Rescue Formation Conseil</h1>
          <p style="margin: 5px 0 0; opacity: 0.9; font-size: 14px;">Fiche d'analyse du besoin</p>
        </div>
        <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p>Bonjour <strong>${data.destinataireNom}</strong>,</p>
          <p>${intro}</p>
          <p>Vos reponses nous permettront d'adapter le programme pedagogique (cas pratiques, contraintes terrain, amenagements).</p>
          ${optLabel}
          <div style="text-align: center; margin: 24px 0;">
            <a href="${data.link}" style="background: #dc2626; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
              Completer la fiche
            </a>
          </div>
          <p style="color: #64748b; font-size: 12px;">Lien personnel et a usage unique.</p>
          <p style="color: #64748b; font-size: 12px; margin-top: 24px;">Cordialement,<br>L'equipe RFC</p>
        </div>
      </div>
    `,
  };
}

// Fiche pre-formation STAGIAIRE (envoyee a chaque apprenant)
export function fichePreFormationStagiaireEmail(data: {
  stagiaire: { prenom: string; nom: string };
  formation: { titre: string };
  // session optionnelle (cas fiche pré-session)
  session?: { dateDebut: string } | null;
  link: string;
  optionnel?: boolean;
}) {
  const dateFmt = data.session?.dateDebut
    ? new Date(data.session.dateDebut).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : "";
  const optLabel = data.optionnel
    ? `<p style="background:#fef3c7;border:1px solid #fde68a;color:#92400e;padding:10px;border-radius:6px;font-size:13px;">Formation en mode express : ce questionnaire est <strong>optionnel</strong>. Vous pourrez le completer apres la formation.</p>`
    : "";
  return {
    subject: `Fiche individuelle de besoin - ${data.formation.titre}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 20px;">Rescue Formation Conseil</h1>
          <p style="margin: 5px 0 0; opacity: 0.9; font-size: 14px;">Fiche individuelle</p>
        </div>
        <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p>Bonjour <strong>${data.stagiaire.prenom} ${data.stagiaire.nom}</strong>,</p>
          <p>Vous etes inscrit(e) a la formation <strong>"${data.formation.titre}"</strong>${dateFmt ? ` du <strong>${dateFmt}</strong>` : ""}.</p>
          <p>Merci de completer ce questionnaire individuel (3 minutes) afin que nous puissions adapter la formation a vos besoins (prerequis, contraintes, accessibilite).</p>
          ${optLabel}
          <div style="text-align: center; margin: 24px 0;">
            <a href="${data.link}" style="background: #dc2626; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
              Completer ma fiche
            </a>
          </div>
          <p style="color: #64748b; font-size: 12px;">Lien personnel. Vos donnees sont protegees conformement au RGPD.</p>
          <p style="color: #64748b; font-size: 12px; margin-top: 24px;">Cordialement,<br>L'equipe RFC</p>
        </div>
      </div>
    `,
  };
}
