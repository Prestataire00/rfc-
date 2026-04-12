import nodemailer from "nodemailer";

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
};

export async function sendEmail({ to, subject, html, attachments }: EmailOptions): Promise<{ skipped: boolean }> {
  // Skip if SMTP not configured
  if (!process.env.SMTP_USER) {
    console.log(`[EMAIL SKIP] SMTP non configure. To: ${to}, Subject: ${subject}`);
    return { skipped: true };
  }

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
  return { skipped: false };
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
  devis: { numero: string; objet: string; montantTTC: number };
}) {
  return {
    subject: `Devis ${data.devis.numero} - ${data.devis.objet}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 20px;">Rescue Formation Conseil</h1>
          <p style="margin: 5px 0 0; opacity: 0.9; font-size: 14px;">Nouveau devis</p>
        </div>
        <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p>Bonjour <strong>${data.contact.prenom} ${data.contact.nom}</strong>,</p>
          <p>Veuillez trouver ci-joint le devis <strong>${data.devis.numero}</strong> pour :</p>
          <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0; font-weight: bold; font-size: 16px;">${data.devis.objet}</p>
            <p style="margin: 8px 0 0; color: #2563eb; font-size: 20px; font-weight: bold;">
              ${data.devis.montantTTC.toFixed(2)} EUR TTC
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

export function factureEmail(data: {
  destinataire: { nom: string };
  entreprise: { nom: string };
  facture: { numero: string; montantTTC: number; dateEcheance: string };
}) {
  return {
    subject: `Facture ${data.facture.numero} - ${data.entreprise.nom}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 20px;">Rescue Formation Conseil</h1>
          <p style="margin: 5px 0 0; opacity: 0.9; font-size: 14px;">Nouvelle facture</p>
        </div>
        <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p>Bonjour <strong>${data.destinataire.nom}</strong>,</p>
          <p>Veuillez trouver ci-joint la facture <strong>${data.facture.numero}</strong> :</p>
          <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0; font-weight: bold; font-size: 16px;">${data.entreprise.nom}</p>
            <p style="margin: 8px 0 0; color: #2563eb; font-size: 20px; font-weight: bold;">
              ${data.facture.montantTTC.toFixed(2)} EUR TTC
            </p>
            <p style="margin: 8px 0 0; color: #64748b; font-size: 14px;">
              À régler avant le ${data.facture.dateEcheance}
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

// Fiche besoin CLIENT (envoyee au responsable entreprise)
export function ficheBesoinClientEmail(data: {
  destinataireNom: string;
  entreprise: { nom: string };
  formation: { titre: string };
  session: { dateDebut: string };
  link: string;
  optionnel?: boolean;
}) {
  const dateFmt = new Date(data.session.dateDebut).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
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
          <p>Afin de preparer au mieux la formation <strong>"${data.formation.titre}"</strong> prevue le <strong>${dateFmt}</strong>${data.entreprise.nom ? ` pour <strong>${data.entreprise.nom}</strong>` : ""}, merci de completer ce questionnaire rapide (5 minutes).</p>
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

// Fiche besoin STAGIAIRE (envoyee a chaque apprenant)
export function ficheBesoinStagiaireEmail(data: {
  stagiaire: { prenom: string; nom: string };
  formation: { titre: string };
  session: { dateDebut: string };
  link: string;
  optionnel?: boolean;
}) {
  const dateFmt = new Date(data.session.dateDebut).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
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
          <p>Vous etes inscrit(e) a la formation <strong>"${data.formation.titre}"</strong> du <strong>${dateFmt}</strong>.</p>
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
