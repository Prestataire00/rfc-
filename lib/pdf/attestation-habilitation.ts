/* eslint-disable @typescript-eslint/no-explicit-any */
import { COLORS, LOGO_BASE64, RGPD_MENTION, type PdfOpts } from "./shared";

// ==================== ATTESTATION DE FORMATION (habilitation électrique) ====================
// Reproduit le modèle RFC "ATTESTATION DE FORMATION" (BS-BE / H0B0) : en-tête
// organisme, "Je soussigné … certifie que", stagiaire, intitulé, formateur +
// date + durée + lieu, objectifs, cases "Type d'action de formation", tableau
// des acquis (Acquise / Reste à acquérir), formule, lieu+date, tampon, pied.
const TITLE_BLUE = "#2f5496";

const TYPES_ACTION: { key: string; label: string }[] = [
  { key: "adaptation", label: "Adaptation" },
  { key: "promotion", label: "Promotion" },
  { key: "prevention", label: "Prévention" },
  { key: "acquisition", label: "Acquisition" },
  { key: "entretien", label: "Entretien ou Perfectionnement" },
];

export function attestationHabilitationPdf(data: {
  stagiaire: { civilite?: string; nom: string; prenom: string };
  organisme: {
    nom: string;
    representant?: string;
    adresse?: string;
    codePostal?: string;
    ville?: string;
    telephone?: string;
    email?: string;
    siret?: string;
    nda?: string;
    numeroCnaps?: string;
  };
  formationTitre: string;
  formateurNom: string;
  dateFormation: string;
  dureeLabel: string; // ex "14h00"
  lieu?: string;
  objectifs?: string;
  typeActionKey?: string; // formation.typeActionBpf
  competences: { label: string; acquise: boolean }[];
  villeSignature: string;
  dateSignature: string;
}, opts?: PdfOpts): any {
  const branding = opts?.branding;
  const logo = branding?.logoBase64 || LOGO_BASE64;
  const org = data.organisme;

  const coordsFooter = [
    org.nom,
    [org.adresse, [org.codePostal, org.ville].filter(Boolean).join(" ")].filter(Boolean).join(", "),
    [org.telephone ? `${org.telephone}` : null, org.email].filter(Boolean).join(" - "),
    [org.siret ? `SIRET : ${org.siret}` : null, org.nda ? `Déclaration d'activité : ${org.nda}` : null, org.numeroCnaps ? `CNAPS : ${org.numeroCnaps}` : null].filter(Boolean).join(" - "),
  ].filter(Boolean) as string[];

  const civ = data.stagiaire.civilite ? `${data.stagiaire.civilite} ` : "";
  const tampon = branding?.tamponBase64 || null;

  // Cases "Type d'action de formation" (une cochée selon le type BPF).
  // Case dessinée (petite table bordée) — évite les glyphes ☐/☒ absents de Roboto.
  const checkbox = (checked: boolean) => ({
    width: 12,
    table: { widths: [8], heights: [8], body: [[{ text: checked ? "X" : "", fontSize: 7, bold: true, alignment: "center" as const, margin: [0, 0, 0, 0] as [number, number, number, number] }]] },
    layout: { hLineWidth: () => 0.7, vLineWidth: () => 0.7, hLineColor: () => "#444444", vLineColor: () => "#444444" },
    margin: [0, 1, 0, 0] as [number, number, number, number],
  });
  const typeActionRow = {
    columns: TYPES_ACTION.map((t) => ({
      width: "auto",
      columns: [checkbox(t.key === data.typeActionKey), { width: "auto", text: t.label, fontSize: 9, color: COLORS.dark, margin: [3, 1, 10, 0] as [number, number, number, number] }],
      columnGap: 0,
    })),
    columnGap: 4,
    margin: [0, 0, 0, 14] as [number, number, number, number],
  };

  // Tableau des acquis (Acquise / Reste à acquérir).
  const competenceTable = data.competences.length > 0
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
        margin: [0, 0, 0, 16] as [number, number, number, number],
      }
    : null;

  return {
    pageMargins: [45, 40, 45, 70] as [number, number, number, number],
    content: [
      // En-tête : logo + nom organisme centré
      {
        columns: [
          { width: 70, image: logo, fit: [60, 55] as [number, number] },
          { width: "*", text: org.nom, alignment: "center" as const, fontSize: 15, bold: true, color: COLORS.dark, margin: [0, 14, 0, 0] as [number, number, number, number] },
          { width: 70, text: "" },
        ],
        margin: [0, 0, 0, 16] as [number, number, number, number],
      },

      // Titre
      { text: "ATTESTATION DE FORMATION", fontSize: 16, bold: true, color: TITLE_BLUE, alignment: "center" as const, margin: [0, 0, 0, 16] as [number, number, number, number] },

      // Déclaration
      {
        text: `Je soussigné ${org.representant || "le Dirigeant"}, Dirigeant de l'organisme de formation ${org.nom} certifie que :`,
        fontSize: 10,
        margin: [0, 0, 0, 10] as [number, number, number, number],
      },

      // Stagiaire
      { text: `${civ}${data.stagiaire.nom} ${data.stagiaire.prenom}`, fontSize: 14, bold: true, color: TITLE_BLUE, alignment: "center" as const, margin: [0, 0, 0, 8] as [number, number, number, number] },

      { text: "A suivi la formation de :", fontSize: 10, margin: [0, 0, 0, 8] as [number, number, number, number] },

      // Intitulé formation
      { text: data.formationTitre, fontSize: 13, bold: true, color: TITLE_BLUE, alignment: "center" as const, margin: [0, 0, 0, 6] as [number, number, number, number] },

      { text: `Animé par ${data.formateurNom}, en date du : ${data.dateFormation} pour une durée de ${data.dureeLabel}`, fontSize: 10, alignment: "center" as const, margin: [0, 0, 0, 8] as [number, number, number, number] },

      ...(data.lieu ? [{ text: `Lieu : ${data.lieu}`, fontSize: 10, margin: [0, 0, 0, 10] as [number, number, number, number] }] : []),

      // Objectifs
      { text: "Objectifs de la formation :", fontSize: 10, bold: true, margin: [0, 0, 0, 4] as [number, number, number, number] },
      ...(data.objectifs ? [{ text: data.objectifs, fontSize: 10, margin: [0, 0, 0, 10] as [number, number, number, number] }] : []),

      // Type d'action
      { text: "Type d'action de formation :", fontSize: 10, bold: true, margin: [0, 0, 0, 1] as [number, number, number, number] },
      { text: "(au sens de l'Article L.6313 du Code du travail)", fontSize: 8, italics: true, color: COLORS.gray, margin: [0, 0, 0, 6] as [number, number, number, number] },
      typeActionRow,

      // Acquis
      { text: "Résultats de l'évaluation des acquis", fontSize: 10, bold: true, decoration: "underline" as const, margin: [0, 0, 0, 6] as [number, number, number, number] },
      ...(competenceTable ? [competenceTable] : []),

      { text: "La présente attestation est délivrée pour servir et valoir ce que de droit.", fontSize: 10, margin: [0, 8, 0, 10] as [number, number, number, number] },

      { text: `Fait à ${data.villeSignature}, le ${data.dateSignature}`, fontSize: 10, margin: [0, 0, 0, 0] as [number, number, number, number] },

      // Tampon
      ...(tampon ? [{ image: tampon, height: 90, alignment: "left" as const, margin: [20, 6, 0, 0] as [number, number, number, number] }] : []),
    ],
    footer: () => ({
      stack: coordsFooter.map((l, i) => ({ text: l, fontSize: 7.5, bold: i === 0, alignment: "center" as const, color: COLORS.dark })).concat([
        { text: RGPD_MENTION, fontSize: 6, bold: false, alignment: "center" as const, color: "#888888" } as any,
      ]),
      margin: [40, 6, 40, 0] as [number, number, number, number],
    }),
    defaultStyle: { font: "Roboto" },
  };
}
