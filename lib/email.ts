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

const FROM = process.env.SMTP_FROM || "FormaPro <noreply@formapro.fr>";

type EmailOptions = {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer | Uint8Array }[];
};

export async function sendEmail({ to, subject, html, attachments }: EmailOptions) {
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
  return result;
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
          <h1 style="margin: 0; font-size: 20px;">FormaPro</h1>
          <p style="margin: 5px 0 0; opacity: 0.9; font-size: 14px;">Convocation a une formation</p>
        </div>
        <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p>Bonjour <strong>${data.stagiaire.prenom} ${data.stagiaire.nom}</strong>,</p>
          <p>Nous avons le plaisir de vous confirmer votre inscription a la formation suivante :</p>
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
          <p>Merci de vous presenter <strong>15 minutes avant</strong> le debut de la formation.</p>
          <p>Vous trouverez en piece jointe votre convocation officielle.</p>
          <p style="color: #64748b; font-size: 12px; margin-top: 24px;">
            Cordialement,<br>L'equipe FormaPro
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
          <h1 style="margin: 0; font-size: 20px;">FormaPro</h1>
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
          <p>N'hesitez pas a nous contacter pour toute question.</p>
          <p style="color: #64748b; font-size: 12px; margin-top: 24px;">
            Cordialement,<br>L'equipe FormaPro
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
      ? "satisfaction a froid"
      : "satisfaction a chaud";
  return {
    subject: `Votre avis compte - Evaluation ${typeLabel} "${data.formation.titre}"`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 20px;">FormaPro</h1>
          <p style="margin: 5px 0 0; opacity: 0.9; font-size: 14px;">Evaluation de formation</p>
        </div>
        <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p>Bonjour <strong>${data.stagiaire.prenom} ${data.stagiaire.nom}</strong>,</p>
          <p>Suite a votre formation <strong>"${data.formation.titre}"</strong>, nous souhaitons recueillir votre avis.</p>
          <p>Merci de prendre quelques minutes pour remplir ce questionnaire de ${typeLabel} :</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${data.lien}" style="background: #2563eb; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
              Donner mon avis
            </a>
          </div>
          <p style="color: #64748b; font-size: 12px;">Ce lien est personnel et a usage unique.</p>
          <p style="color: #64748b; font-size: 12px; margin-top: 24px;">
            Cordialement,<br>L'equipe FormaPro
          </p>
        </div>
      </div>
    `,
  };
}
