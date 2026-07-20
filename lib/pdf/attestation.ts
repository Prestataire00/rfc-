/* eslint-disable @typescript-eslint/no-explicit-any */
import { COLORS, LOGO_BASE64, type PdfOpts } from "./shared";

// ==================== ATTESTATION DE FIN DE FORMATION ====================
// Mise en page fidèle au modèle RFC (art. L.6353-1) : en-tête coordonnées OF,
// titre, déclaration NDA, nom du stagiaire, corps (action FPC + formateur +
// date + entreprise cliente + lieu), tableau intitulé/objectifs/durée, phrase
// d'évaluation, tableau des compétences (Acquise / Reste à acquérir), lieu+date
// de signature, tampon, pied de page coordonnées OF.
export function attestationPdf(data: {
  stagiaire: { nom: string; prenom: string };
  // Organisme de formation (depuis les paramètres).
  organisme: {
    nom: string;
    responsable?: string;
    adresse?: string;
    codePostal?: string;
    ville?: string;
    telephone?: string;
    email?: string;
    siret?: string;
    nda?: string;
  };
  formateurNom: string; // ex. "AIT-AZZOUZ Henri"
  dateFormation: string; // "10/07/2026" (ou "du .. au ..")
  entrepriseCliente?: string; // "CEJIP SERVICE 309 Avenue des Paluds 13400 Aubagne"
  lieuFormation?: string;
  formation: {
    titre: string;
    dureeLabel: string; // ex. "03 heures 30"
    objectifs: string[]; // puces "Rappel des objectifs"
  };
  competences: { label: string; acquise: boolean }[];
  villeSignature: string; // "St JULIEN-LE-MONTAGNIER"
  dateSignature: string; // "10/07/2026"
}, opts?: PdfOpts): any {
  const branding = opts?.branding;
  const tpl = opts?.template;
  const primary = branding?.couleurPrimaire || "#2f5496"; // bleu titre du modèle
  const logo = branding?.logoBase64 || LOGO_BASE64;
  const org = data.organisme;
  const nda = org.nda || "—";

  // Bloc coordonnées OF (en-tête + pied de page), fidèle au modèle.
  const coordsLignes = [
    org.nom,
    org.responsable ? `Entreprise Individuelle Responsable ${org.responsable}` : null,
    org.adresse || null,
    [org.codePostal, org.ville].filter(Boolean).join(" ") || null,
    [org.telephone ? `tel : ${org.telephone}` : null, org.email ? `mail : ${org.email}` : null].filter(Boolean).join("   ") || null,
    [org.siret ? `Siret : ${org.siret}` : null, org.nda ? `N° Déclaration d'activité : ${org.nda}` : null].filter(Boolean).join(" - ") || null,
  ].filter(Boolean) as string[];

  const titre = (tpl?.titre || "ATTESTATION DE FIN DE FORMATION").toUpperCase();

  // ── Tableau 1 : Intitulé / Rappel des objectifs / Durée ──
  const objectifsCell =
    data.formation.objectifs.length > 0
      ? { ul: data.formation.objectifs.map((o) => ({ text: o, fontSize: 10 })), margin: [0, 2, 0, 2] as [number, number, number, number] }
      : { text: "—", fontSize: 10 };

  const table1 = {
    table: {
      widths: ["30%", "70%"],
      body: [
        [
          { text: "Intitulé", bold: true, fontSize: 10, margin: [4, 6, 4, 6] as [number, number, number, number] },
          { text: data.formation.titre, bold: true, color: primary, fontSize: 10, margin: [4, 6, 4, 6] as [number, number, number, number] },
        ],
        [
          {
            stack: [
              { text: "Rappel des objectifs", bold: true, fontSize: 10 },
              { text: "A l'issue de la formation, le stagiaire sera en capacité de :", fontSize: 8, color: COLORS.gray, margin: [0, 2, 0, 0] as [number, number, number, number] },
            ],
            margin: [4, 6, 4, 6] as [number, number, number, number],
          },
          { ...objectifsCell, margin: [4, 6, 4, 6] as [number, number, number, number] },
        ],
        [
          { text: "Durée", bold: true, fontSize: 10, margin: [4, 6, 4, 6] as [number, number, number, number] },
          { text: data.formation.dureeLabel, fontSize: 10, alignment: "center" as const, margin: [4, 6, 4, 6] as [number, number, number, number] },
        ],
      ],
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => "#999999",
      vLineColor: () => "#999999",
    },
    margin: [0, 0, 0, 14] as [number, number, number, number],
  };

  // ── Tableau 2 : Compétences visées / Résultats (Acquise · Reste à acquérir) ──
  const table2 = data.competences.length > 0
    ? {
        table: {
          headerRows: 2,
          widths: ["*", 70, 80],
          body: [
            [
              { text: "Compétences visées", bold: true, fontSize: 10, rowSpan: 2, alignment: "center" as const, margin: [4, 10, 4, 4] as [number, number, number, number] },
              { text: "Résultats à l'issue de la formation", bold: true, fontSize: 9, colSpan: 2, alignment: "center" as const, margin: [4, 4, 4, 4] as [number, number, number, number] },
              {},
            ],
            [
              {},
              { text: "Acquise", bold: true, fontSize: 9, alignment: "center" as const, margin: [2, 4, 2, 4] as [number, number, number, number] },
              { text: "Reste à acquérir", bold: true, fontSize: 9, alignment: "center" as const, margin: [2, 4, 2, 4] as [number, number, number, number] },
            ],
            ...data.competences.map((c) => [
              { text: c.label, fontSize: 9, margin: [4, 4, 4, 4] as [number, number, number, number] },
              { text: c.acquise ? "X" : "", bold: true, fontSize: 10, alignment: "center" as const, margin: [2, 4, 2, 4] as [number, number, number, number] },
              { text: c.acquise ? "" : "X", bold: true, fontSize: 10, alignment: "center" as const, margin: [2, 4, 2, 4] as [number, number, number, number] },
            ]),
          ],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => "#999999",
          vLineColor: () => "#999999",
        },
        margin: [0, 0, 0, 20] as [number, number, number, number],
      }
    : null;

  // Bloc tampon/signature (image incrustée si dispo).
  const tampon = branding?.tamponBase64 || null;
  const signatureBloc = tampon
    ? { image: tampon, height: 90, alignment: "left" as const, margin: [20, 6, 0, 0] as [number, number, number, number] }
    : { text: " ", margin: [0, 40, 0, 0] as [number, number, number, number] };

  return {
    pageMargins: [45, 40, 45, 70] as [number, number, number, number],
    content: [
      // En-tête coordonnées OF (petit, au-dessus du logo)
      { stack: coordsLignes.map((l, i) => ({ text: l, fontSize: 8, color: "#333333", bold: i === 0 })), margin: [0, 0, 0, 8] as [number, number, number, number] },

      // Logo
      { image: logo, fit: [90, 60] as [number, number], margin: [0, 0, 0, 6] as [number, number, number, number] },

      // Titre + sous-titre
      { text: titre, fontSize: 20, bold: true, color: primary, alignment: "center" as const, margin: [0, 6, 0, 2] as [number, number, number, number] },
      { text: "Article L. 6353-1 du Code du Travail", fontSize: 10, italics: true, bold: true, alignment: "center" as const, color: COLORS.dark, margin: [0, 0, 0, 16] as [number, number, number, number] },

      // Déclaration NDA
      {
        text: `${org.nom} organisme de formation déclaré sous le n° Déclaration d'activité ${nda}, atteste que :`,
        fontSize: 10,
        margin: [0, 0, 0, 12] as [number, number, number, number],
      },

      // Nom du stagiaire
      {
        text: `${data.stagiaire.prenom} ${data.stagiaire.nom}`,
        fontSize: 14,
        bold: true,
        alignment: "center" as const,
        color: COLORS.dark,
        margin: [0, 0, 0, 12] as [number, number, number, number],
      },

      // Corps
      {
        text: [
          "A suivi, dans le cadre d'une action de Formation Professionnelle Continue relevant de l'article L6313-1 du Code du Travail – action d'adaptation et développement des compétences / d'acquisition, entretien ou perfectionnement de connaissances – (1), la formation suivante dispensée par ",
          { text: data.formateurNom, bold: true },
          ` : En date du ${data.dateFormation}`,
          data.entrepriseCliente ? ` Pour : ${data.entrepriseCliente}` : "",
          data.lieuFormation ? ` - Lieu de formation : ${data.lieuFormation}` : "",
        ],
        fontSize: 10,
        alignment: "justify" as const,
        margin: [0, 0, 0, 12] as [number, number, number, number],
      },

      table1,

      // Phrase d'évaluation
      {
        ul: [
          {
            text: "A été évalué(e), au regard des objectifs de formation rappelés ci-dessus, à l'issue des épreuves certificatives mises en œuvre par l'équipe pédagogique, et a acquis les compétences suivantes :",
            fontSize: 10,
          },
        ],
        margin: [0, 0, 0, 12] as [number, number, number, number],
      },

      ...(table2 ? [table2] : []),

      // Lieu + date de signature
      { text: `Fait à ${data.villeSignature}, le ${data.dateSignature},`, fontSize: 10, margin: [0, 6, 0, 0] as [number, number, number, number] },

      // Tampon / signature
      signatureBloc,
    ],
    // Pied de page : coordonnées OF centrées (gras).
    footer: () => ({
      stack: coordsLignes.map((l, i) => ({
        text: l,
        fontSize: 7.5,
        bold: i === 0 || i === 1,
        alignment: "center" as const,
        color: COLORS.dark,
      })),
      margin: [40, 6, 40, 0] as [number, number, number, number],
    }),
    defaultStyle: { font: "Roboto" },
  };
}
