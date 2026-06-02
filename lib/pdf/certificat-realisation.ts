/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  COLORS,
  footer,
  header,
  stylesFor,
  type PdfOpts,
} from "./shared";

// ==================== CERTIFICAT DE REALISATION ====================
// Document Qualiopi obligatoire (art. L.6353-1 du Code du travail + arrêté
// du 21 déc. 2018). Diffère de l'attestation de fin de formation : il est
// destiné au FINANCEUR (entreprise, OPCO, France Travail) pour justifier
// la réalisation de l'action et déclencher le paiement, pas au stagiaire.
//
// Mentions obligatoires (vu modèle officiel) :
//   - Représentant légal de l'organisme de formation (nom + qualité)
//   - Dispensateur (raison sociale + SIRET + NDA)
//   - Stagiaire (nom)
//   - Entreprise de rattachement du salarié
//   - Intitulé de l'action
//   - Nature : action de formation / bilan compétences / VAE / apprentissage
//   - Date de réalisation
//   - Durée en heures
//   - Engagement de conservation 3 ans des justificatifs
//   - Cachet + signature du responsable
export function certificatRealisationPdf(data: {
  representant: { nom: string; prenom: string; qualite?: string }; // "Monsieur AIT-AZZOUZ Henri"
  organisme: { nom: string; siret?: string; nda?: string };
  stagiaire: { nom: string; prenom: string };
  entrepriseSalarie?: { nom: string }; // entreprise du stagiaire (null si individuel)
  formation: { titre: string; duree: number };
  dateAction: string; // JJ/MM/AAAA (date début ou date unique si formation courte)
  natureAction?: "formation" | "bilan_competences" | "vae" | "apprentissage"; // défaut "formation"
  lieuSignature: string; // ex "MANOSQUE"
  dateSignature: string; // JJ/MM/AAAA
}, opts?: PdfOpts): any {
  const branding = opts?.branding;
  const primary = branding?.couleurPrimaire || COLORS.primary;
  const nature = data.natureAction ?? "formation";

  // Render checkbox (☒ coché / ☐ non coché) pour la nature de l'action
  const cb = (key: typeof nature) => nature === key ? "☒" : "☐";

  const representantNom = `${data.representant.prenom} ${data.representant.nom}`.trim();

  return {
    content: [
      ...header("CERTIFICAT DE REALISATION", branding),
      { text: "\n" },
      {
        text: "CERTIFICAT DE REALISATION",
        fontSize: 18,
        bold: true,
        alignment: "center" as const,
        color: primary,
        margin: [0, 10, 0, 30] as [number, number, number, number],
      },

      // Je soussigné(e) — représentant légal du dispensateur
      {
        text: [
          { text: "Je soussigné(e) ", style: "value" },
          { text: representantNom, italics: true, style: "value" },
        ],
        margin: [0, 0, 0, 8] as [number, number, number, number],
      },
      {
        text: [
          { text: "représentant légal du dispensateur de l'action concourant au développement des compétences ", style: "value" },
          { text: data.organisme.nom, bold: true, style: "value" },
        ],
        margin: [0, 0, 0, 20] as [number, number, number, number],
      },

      // Stagiaire
      {
        text: `M. ${data.stagiaire.prenom} ${data.stagiaire.nom}`,
        bold: true,
        style: "value",
        margin: [0, 0, 0, 8] as [number, number, number, number],
      },

      // Entreprise de rattachement (salarié OU stagiaire individuel)
      data.entrepriseSalarie
        ? {
            text: [
              { text: "salarié(e) de l'entreprise ", style: "value" },
              { text: data.entrepriseSalarie.nom, italics: true, style: "value" },
            ],
            margin: [0, 0, 0, 8] as [number, number, number, number],
          }
        : {
            text: "agissant en tant que stagiaire à titre individuel",
            style: "value",
            italics: true,
            margin: [0, 0, 0, 8] as [number, number, number, number],
          },

      // Action suivie
      {
        text: [
          { text: "a suivi l'action ", style: "value" },
          { text: data.formation.titre, italics: true, style: "value" },
        ],
        margin: [0, 0, 0, 18] as [number, number, number, number],
      },

      // Nature de l'action — checkboxes
      {
        text: "Nature de l'action concourant au développement des compétences :",
        italics: true,
        style: "value",
        margin: [0, 0, 0, 6] as [number, number, number, number],
      },
      {
        ul: [
          { text: `${cb("formation")} action de formation`, style: "value" },
          { text: `${cb("bilan_competences")} bilan de compétences`, style: "value" },
          { text: `${cb("vae")} action de VAE`, style: "value" },
          { text: `${cb("apprentissage")} action de formation par apprentissage`, style: "value" },
        ],
        type: "none" as const,
        margin: [0, 0, 0, 18] as [number, number, number, number],
      },

      // Date et durée
      {
        text: `qui s'est déroulée le ${data.dateAction}`,
        style: "value",
        margin: [0, 0, 0, 6] as [number, number, number, number],
      },
      {
        text: `pour une durée de ${data.formation.duree} heures`,
        style: "value",
        margin: [0, 0, 0, 20] as [number, number, number, number],
      },

      // Mention conservation 3 ans (obligatoire)
      {
        text: "Sans préjudice des délais imposés par les règles fiscales, comptables ou commerciales, je m'engage à conserver l'ensemble des pièces justificatives qui ont permis d'établir le présent certificat pendant une durée de 3 ans à compter de la fin de l'année du dernier paiement. En cas de cofinancement des fonds européens la durée de conservation est étendue conformément aux obligations conventionnelles spécifiques.",
        style: "value",
        alignment: "justify" as const,
        margin: [0, 0, 0, 30] as [number, number, number, number],
      },

      // Bloc lieu/date à gauche + cachet/signature à droite
      {
        columns: [
          {
            width: "50%",
            stack: [
              { text: `Fait à : ${data.lieuSignature}`, style: "value", margin: [0, 0, 0, 4] as [number, number, number, number] },
              { text: `Le : ${data.dateSignature}`, style: "value" },
            ],
          },
          {
            width: "50%",
            stack: [
              {
                text: "Cachet et signature",
                alignment: "center" as const,
                style: "value",
                bold: true,
              },
              {
                text: "du responsable du dispensateur de formation",
                alignment: "center" as const,
                fontSize: 9,
                italics: true,
                margin: [0, 0, 0, 2] as [number, number, number, number],
              },
              {
                text: "(nom, prénom, qualité du signataire)",
                alignment: "center" as const,
                fontSize: 9,
                italics: true,
                margin: [0, 0, 0, 8] as [number, number, number, number],
              },
              // Tampon+signature scanné si configuré dans /parametres,
              // sinon espace blanc à signer à la main.
              branding?.tamponBase64
                ? {
                    image: branding.tamponBase64,
                    height: 80,
                    alignment: "center" as const,
                    margin: [0, 0, 0, 4] as [number, number, number, number],
                  }
                : { text: "\n\n\n", margin: [0, 0, 0, 22] as [number, number, number, number] },
              {
                text: representantNom,
                alignment: "center" as const,
                style: "value",
                bold: true,
              },
              data.representant.qualite
                ? { text: data.representant.qualite, alignment: "center" as const, fontSize: 9, italics: true }
                : {},
            ],
          },
        ],
        margin: [0, 0, 0, 20] as [number, number, number, number],
      },

      footer(branding),
    ],
    styles: stylesFor(branding),
    defaultStyle: { font: "Helvetica" },
  };
}
