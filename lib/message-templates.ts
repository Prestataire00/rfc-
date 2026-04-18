// Templates par defaut pour les emails/documents envoyes par le CRM.
// Chaque template est seede en base a la premiere lecture ; l'admin peut
// ensuite le modifier via /parametres/templates-messages.

import { prisma } from "@/lib/prisma";

export type MessageTemplateDefault = {
  id: string;
  type: string;
  nom: string;
  description: string;
  objet: string;
  contenu: string;
  variables: { nom: string; description: string }[];
};

// Shell HTML commun
function wrap(title: string, body: string): string {
  return `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 20px;">Rescue Formation Conseil</h1>
    <p style="margin: 5px 0 0; opacity: 0.9; font-size: 14px;">${title}</p>
  </div>
  <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; color: #111827; background: #ffffff;">
    ${body}
    <p style="color: #64748b; font-size: 12px; margin-top: 24px;">Cordialement,<br>L'equipe RFC</p>
  </div>
</div>`;
}

const VAR_STAGIAIRE = [
  { nom: "stagiaire.prenom", description: "Prenom du stagiaire" },
  { nom: "stagiaire.nom", description: "Nom du stagiaire" },
];
const VAR_FORMATION = [
  { nom: "formation.titre", description: "Titre de la formation" },
];
const VAR_SESSION = [
  { nom: "session.dateDebut", description: "Date de debut (formatee FR)" },
  { nom: "session.dateFin", description: "Date de fin (formatee FR)" },
  { nom: "session.lieu", description: "Lieu de la session" },
];
const VAR_LIEN = [
  { nom: "lien", description: "URL du formulaire / document" },
];

export const MESSAGE_TEMPLATE_DEFAULTS: MessageTemplateDefault[] = [
  {
    id: "tpl_convocation",
    type: "convocation",
    nom: "Convocation a la formation",
    description: "Envoye J-2 aux stagiaires confirmes.",
    objet: "Convocation - Formation \"{{formation.titre}}\"",
    contenu: wrap("Convocation a une formation", `
      <p>Bonjour <strong>{{stagiaire.prenom}} {{stagiaire.nom}}</strong>,</p>
      <p>Nous avons le plaisir de confirmer votre participation a la formation <strong>&quot;{{formation.titre}}&quot;</strong>.</p>
      <div style="background: #f1f5f9; border-left: 4px solid #dc2626; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
        <p style="margin: 4px 0;"><strong>Dates :</strong> du {{session.dateDebut}} au {{session.dateFin}}</p>
        <p style="margin: 4px 0;"><strong>Lieu :</strong> {{session.lieu}}</p>
      </div>
      <p>Merci de vous presenter 10 minutes avant le debut de la session. En cas d'empechement, contactez-nous au plus vite.</p>
    `),
    variables: [...VAR_STAGIAIRE, ...VAR_FORMATION, ...VAR_SESSION],
  },
  {
    id: "tpl_fiche_besoin_client",
    type: "fiche_besoin_client",
    nom: "Fiche besoin - Client",
    description: "Envoyee au responsable entreprise pour adapter la formation.",
    objet: "Fiche d'analyse du besoin - {{formation.titre}}",
    contenu: wrap("Fiche d'analyse du besoin", `
      <p>Bonjour <strong>{{destinataire.nom}}</strong>,</p>
      <p>Afin de preparer au mieux la formation <strong>&quot;{{formation.titre}}&quot;</strong> prevue le <strong>{{session.dateDebut}}</strong>, merci de completer ce questionnaire (5 minutes).</p>
      <p>Vos reponses nous permettront d'adapter le programme pedagogique (cas pratiques, contraintes terrain, amenagements).</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="{{lien}}" style="background: #dc2626; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Completer la fiche</a>
      </div>
      <p style="color: #64748b; font-size: 12px;">Lien personnel et a usage unique.</p>
    `),
    variables: [
      { nom: "destinataire.nom", description: "Nom du destinataire (contact ou entreprise)" },
      ...VAR_FORMATION, ...VAR_SESSION, ...VAR_LIEN,
    ],
  },
  {
    id: "tpl_fiche_besoin_stagiaire",
    type: "fiche_besoin_stagiaire",
    nom: "Fiche besoin - Stagiaire",
    description: "Questionnaire individuel envoye a chaque stagiaire.",
    objet: "Fiche individuelle de besoin - {{formation.titre}}",
    contenu: wrap("Fiche individuelle", `
      <p>Bonjour <strong>{{stagiaire.prenom}} {{stagiaire.nom}}</strong>,</p>
      <p>Vous etes inscrit(e) a la formation <strong>&quot;{{formation.titre}}&quot;</strong> du <strong>{{session.dateDebut}}</strong>.</p>
      <p>Merci de completer ce questionnaire individuel (3 minutes) afin que nous puissions adapter la formation a vos besoins (prerequis, contraintes, accessibilite).</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="{{lien}}" style="background: #dc2626; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Completer ma fiche</a>
      </div>
      <p style="color: #64748b; font-size: 12px;">Vos donnees sont protegees conformement au RGPD.</p>
    `),
    variables: [...VAR_STAGIAIRE, ...VAR_FORMATION, ...VAR_SESSION, ...VAR_LIEN],
  },
  {
    id: "tpl_evaluation_chaud",
    type: "evaluation_chaud",
    nom: "Evaluation a chaud (J+1)",
    description: "Questionnaire de satisfaction envoye le lendemain.",
    objet: "Votre avis sur la formation \"{{formation.titre}}\"",
    contenu: wrap("Evaluation a chaud", `
      <p>Bonjour <strong>{{stagiaire.prenom}} {{stagiaire.nom}}</strong>,</p>
      <p>Merci d'avoir suivi notre formation <strong>&quot;{{formation.titre}}&quot;</strong>. Votre retour nous est precieux pour ameliorer nos prestations.</p>
      <p>Merci de prendre 3 minutes pour repondre au questionnaire de satisfaction :</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="{{lien}}" style="background: #dc2626; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Donner mon avis</a>
      </div>
    `),
    variables: [...VAR_STAGIAIRE, ...VAR_FORMATION, ...VAR_LIEN],
  },
  {
    id: "tpl_evaluation_froid",
    type: "evaluation_froid",
    nom: "Evaluation a froid (J+21)",
    description: "Questionnaire envoye 3 semaines apres la formation pour mesurer la mise en pratique.",
    objet: "3 semaines apres - Votre retour sur \"{{formation.titre}}\"",
    contenu: wrap("Evaluation a froid", `
      <p>Bonjour <strong>{{stagiaire.prenom}} {{stagiaire.nom}}</strong>,</p>
      <p>Vous avez suivi la formation <strong>&quot;{{formation.titre}}&quot;</strong> il y a quelques semaines. Avec le recul de la pratique, votre avis nous interesse.</p>
      <p>Ce court questionnaire (2 minutes) nous aide a mesurer l'impact reel de la formation :</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="{{lien}}" style="background: #dc2626; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Repondre au questionnaire</a>
      </div>
    `),
    variables: [...VAR_STAGIAIRE, ...VAR_FORMATION, ...VAR_LIEN],
  },
  {
    id: "tpl_positionnement",
    type: "positionnement",
    nom: "Test de positionnement",
    description: "Envoye avant la formation pour evaluer le niveau initial.",
    objet: "Avant votre formation \"{{formation.titre}}\" - Test de positionnement",
    contenu: wrap("Test de positionnement", `
      <p>Bonjour <strong>{{stagiaire.prenom}} {{stagiaire.nom}}</strong>,</p>
      <p>Votre formation <strong>&quot;{{formation.titre}}&quot;</strong> commence bientot. Pour nous permettre d'adapter le contenu a votre niveau, merci de completer ce questionnaire de positionnement :</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="{{lien}}" style="background: #dc2626; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Faire le test</a>
      </div>
      <p style="color: #64748b; font-size: 12px;">Ce test dure environ 3 minutes et n'est pas note.</p>
    `),
    variables: [...VAR_STAGIAIRE, ...VAR_FORMATION, ...VAR_LIEN],
  },
  {
    id: "tpl_attestation",
    type: "attestation",
    nom: "Attestation de fin de formation",
    description: "Envoyee avec l'attestation en piece jointe apres la session.",
    objet: "Votre attestation de formation - \"{{formation.titre}}\"",
    contenu: wrap("Attestation de formation", `
      <p>Bonjour <strong>{{stagiaire.prenom}} {{stagiaire.nom}}</strong>,</p>
      <p>Vous trouverez ci-joint votre attestation de suivi pour la formation <strong>&quot;{{formation.titre}}&quot;</strong>.</p>
      <p>Felicitations pour votre engagement !</p>
    `),
    variables: [...VAR_STAGIAIRE, ...VAR_FORMATION],
  },
  {
    id: "tpl_rappel_presence",
    type: "rappel_presence",
    nom: "Rappel feuille de presence",
    description: "Envoye le jour de la formation avec le lien de signature.",
    objet: "Votre lien de signature - \"{{formation.titre}}\"",
    contenu: wrap("Feuille de presence", `
      <p>Bonjour <strong>{{stagiaire.prenom}} {{stagiaire.nom}}</strong>,</p>
      <p>La formation <strong>&quot;{{formation.titre}}&quot;</strong> debute aujourd'hui. Voici votre lien personnel pour signer electroniquement la feuille de presence :</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="{{lien}}" style="background: #dc2626; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Signer la presence</a>
      </div>
      <p style="color: #64748b; font-size: 12px;">Un lien sera envoye au demarrage de chaque demi-journee.</p>
    `),
    variables: [...VAR_STAGIAIRE, ...VAR_FORMATION, ...VAR_LIEN],
  },
  {
    id: "tpl_convention",
    type: "convention",
    nom: "Convention de formation",
    description: "Envoyee au client avec la convention en piece jointe.",
    objet: "Convention de formation - \"{{formation.titre}}\"",
    contenu: wrap("Convention de formation", `
      <p>Bonjour,</p>
      <p>Veuillez trouver ci-joint la convention de formation pour <strong>&quot;{{formation.titre}}&quot;</strong> prevue du {{session.dateDebut}} au {{session.dateFin}}.</p>
      <p>Merci de nous retourner un exemplaire signe avant le demarrage.</p>
    `),
    variables: [...VAR_FORMATION, ...VAR_SESSION],
  },
  {
    id: "tpl_emargement_otp",
    type: "emargement_otp",
    nom: "Lien de signature individuel (OTP)",
    description: "Envoye a un stagiaire pour qu'il signe sa presence a distance.",
    objet: "Signez votre presence - \"{{formation.titre}}\"",
    contenu: wrap("Signature de presence", `
      <p>Bonjour <strong>{{stagiaire.prenom}} {{stagiaire.nom}}</strong>,</p>
      <p>Merci de signer electroniquement votre feuille de presence pour la formation <strong>&quot;{{formation.titre}}&quot;</strong>.</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="{{lien}}" style="background: #dc2626; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Signer ma presence</a>
      </div>
      <p style="color: #64748b; font-size: 12px;">Ce lien est personnel et valable 24 heures.</p>
    `),
    variables: [...VAR_STAGIAIRE, ...VAR_FORMATION, ...VAR_LIEN],
  },
];

// ─────────────────────────────────────────────────────────────────
// Renderer : remplace les {{xxx.yyy}} par les valeurs du contexte
// ─────────────────────────────────────────────────────────────────
export function applyVariables(text: string, vars: Record<string, unknown>): string {
  return text.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_, key: string) => {
    const parts = key.split(".");
    let val: unknown = vars;
    for (const p of parts) {
      if (val && typeof val === "object" && p in (val as Record<string, unknown>)) {
        val = (val as Record<string, unknown>)[p];
      } else {
        return "";
      }
    }
    if (val === null || val === undefined) return "";
    return String(val);
  });
}

// Charge un template par type depuis la base (ou fallback sur le defaut)
export async function loadMessageTemplate(type: string): Promise<{ objet: string; contenu: string } | null> {
  try {
    const tpl = await prisma.messageTemplate.findUnique({ where: { type } });
    if (tpl && tpl.actif) return { objet: tpl.objet, contenu: tpl.contenu };
  } catch { /* ignore */ }
  const def = MESSAGE_TEMPLATE_DEFAULTS.find((d) => d.type === type);
  if (def) return { objet: def.objet, contenu: def.contenu };
  return null;
}

// Rend un template avec des variables
export async function renderMessageTemplate(type: string, vars: Record<string, unknown>): Promise<{ subject: string; html: string } | null> {
  const tpl = await loadMessageTemplate(type);
  if (!tpl) return null;
  return {
    subject: applyVariables(tpl.objet, vars),
    html: applyVariables(tpl.contenu, vars),
  };
}

// Formate une date FR pour insertion dans un template
export function formatDateFR(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}
