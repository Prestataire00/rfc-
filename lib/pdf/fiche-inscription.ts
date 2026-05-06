/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  COLORS,
  footer,
  header,
  signatureBlock,
  stylesFor,
  type PdfOpts,
} from "./shared";

// ==================== FICHE D'INSCRIPTION INDIVIDUELLE ====================

// Liste canonique des 7 categories RFC pour la pre-cocher dans la formation souhaitee.
const RFC_CATEGORIES = [
  "SST",
  "MAC SST",
  "TFP APS",
  "MAC APS",
  "SSIAP1",
  "SSIAP2",
  "SSIAP3",
];

// Liste des documents possibles (cle interne -> libelle imprime).
const DOCUMENTS = [
  { key: "piece_identite", label: "Pièce d'identité" },
  { key: "casier_b3", label: "Casier Judiciaire B3" },
  { key: "test_b1", label: "Test B1" },
  { key: "diplome_ssiap", label: "Diplôme SSIAP" },
  { key: "diplome", label: "Diplôme" },
  { key: "photos", label: "2 Photos" },
  { key: "cnaps_preal", label: "CNAPS : Autorisation préalable" },
  { key: "cnaps_car", label: "CNAPS : CAR" },
  { key: "cv", label: "CV" },
  { key: "titre_sejour", label: "B1 / Titre de séjour" },
  { key: "justif_domicile", label: "Justificatif de domicile" },
];

const BLANK_LINE = "______________________";

function checkbox(checked: boolean): string {
  return checked ? "☑" : "☐";
}

function valueOrBlank(v: string | null | undefined): string {
  return v && String(v).trim().length > 0 ? String(v) : BLANK_LINE;
}

function fmtDateOrBlank(s: string | null | undefined): string {
  if (!s) return BLANK_LINE;
  const d = new Date(s);
  if (isNaN(d.getTime())) return BLANK_LINE;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function fmtCurrencyShort(n: number): string {
  return `${n.toFixed(2)} EUR`;
}

export function ficheInscriptionPdf(data: {
  contact: {
    nom: string; prenom: string; sexe?: string | null; email: string;
    telephone?: string | null;
    dateNaissance?: string | null; lieuNaissance?: string | null; pays?: string | null;
    numeroSecuriteSociale?: string | null;
    adressePerso?: string | null; codePostalPerso?: string | null; villePerso?: string | null;
    numeroCartePro?: string | null; numeroFranceTravail?: string | null;
    niveauFormation?: string | null; diplomeObtenu?: string | null;
  };
  formation?: { titre: string; categorie?: string | null; duree: number; tarif: number; certifiante?: boolean } | null;
  session?: { dateDebut: string; dateFin: string; lieu?: string | null } | null;
  documentsRemis?: string[];
  dateGeneration: string;
}, opts?: PdfOpts): any {
  const branding = opts?.branding;
  const primary = branding?.couleurPrimaire || COLORS.primary;

  const c = data.contact;
  const f = data.formation;
  const docsRemis = new Set(data.documentsRemis || []);

  // Match canonical RFC category from formation title (case-insensitive).
  const formationTitre = f?.titre || "";
  const matchedCategory = f
    ? RFC_CATEGORIES.find((cat) => formationTitre.toUpperCase().includes(cat.toUpperCase()))
    : null;

  // Sexe icone simple (M/F).
  const sexeLabel = c.sexe === "M" ? "Homme" : c.sexe === "F" ? "Femme" : "";

  // ─── BALISES (3 colonnes) ───
  const balises = {
    columns: [
      // Box 1 : APPRENANT
      {
        width: "*",
        table: {
          widths: ["*"],
          body: [[{
            stack: [
              { text: "APPRENANT", fontSize: 8, bold: true, color: primary, margin: [0, 0, 0, 4] as [number, number, number, number] },
              { text: `${c.prenom} ${c.nom}`, fontSize: 13, bold: true, color: COLORS.dark },
              ...(sexeLabel ? [{ text: sexeLabel, fontSize: 8, color: COLORS.gray, margin: [0, 2, 0, 0] as [number, number, number, number] }] : []),
            ],
            border: [true, true, true, true],
            margin: [8, 8, 8, 8] as [number, number, number, number],
          }]],
        },
        layout: {
          hLineWidth: () => 1.5,
          vLineWidth: () => 1.5,
          hLineColor: () => primary,
          vLineColor: () => primary,
        },
      },
      { width: 8, text: "" },
      // Box 2 : FORMATION
      {
        width: "*",
        table: {
          widths: ["*"],
          body: [[{
            stack: [
              { text: "FORMATION", fontSize: 8, bold: true, color: primary, margin: [0, 0, 0, 4] as [number, number, number, number] },
              { text: f?.titre || "(non renseignee)", fontSize: 11, bold: true, color: COLORS.dark },
              ...(f?.categorie ? [{ text: f.categorie, fontSize: 8, color: COLORS.gray, margin: [0, 2, 0, 0] as [number, number, number, number] }] : []),
              ...(f?.certifiante ? [{ text: "CERTIFIANTE", fontSize: 8, bold: true, color: primary, margin: [0, 2, 0, 0] as [number, number, number, number] }] : []),
            ],
            border: [true, true, true, true],
            margin: [8, 8, 8, 8] as [number, number, number, number],
          }]],
        },
        layout: {
          hLineWidth: () => 1.5,
          vLineWidth: () => 1.5,
          hLineColor: () => primary,
          vLineColor: () => primary,
        },
      },
      { width: 8, text: "" },
      // Box 3 : TARIF
      {
        width: "*",
        table: {
          widths: ["*"],
          body: [[{
            stack: [
              { text: "TARIF", fontSize: 8, bold: true, color: primary, margin: [0, 0, 0, 4] as [number, number, number, number] },
              { text: f ? fmtCurrencyShort(f.tarif) : "—", fontSize: 13, bold: true, color: primary },
              ...(f ? [{ text: `${f.duree} h`, fontSize: 8, color: COLORS.gray, margin: [0, 2, 0, 0] as [number, number, number, number] }] : []),
            ],
            border: [true, true, true, true],
            margin: [8, 8, 8, 8] as [number, number, number, number],
          }]],
        },
        layout: {
          hLineWidth: () => 1.5,
          vLineWidth: () => 1.5,
          hLineColor: () => primary,
          vLineColor: () => primary,
        },
      },
    ],
    margin: [0, 0, 0, 15] as [number, number, number, number],
  };

  // ─── Renseignement personnel ───
  const renseignementsRows = [
    [{ text: "Nom", bold: true, fontSize: 9 }, { text: valueOrBlank(c.nom), fontSize: 9 }, { text: "Prénom", bold: true, fontSize: 9 }, { text: valueOrBlank(c.prenom), fontSize: 9 }],
    [{ text: "Sexe", bold: true, fontSize: 9 }, { text: `${checkbox(c.sexe === "M")} M    ${checkbox(c.sexe === "F")} F`, fontSize: 9 }, { text: "Date de naissance", bold: true, fontSize: 9 }, { text: fmtDateOrBlank(c.dateNaissance), fontSize: 9 }],
    [{ text: "Lieu de naissance", bold: true, fontSize: 9 }, { text: valueOrBlank(c.lieuNaissance), fontSize: 9 }, { text: "Pays", bold: true, fontSize: 9 }, { text: valueOrBlank(c.pays), fontSize: 9 }],
    [{ text: "N° Sécurité Sociale", bold: true, fontSize: 9 }, { text: valueOrBlank(c.numeroSecuriteSociale), fontSize: 9, colSpan: 3 }, {}, {}],
    [{ text: "Adresse", bold: true, fontSize: 9 }, { text: valueOrBlank(c.adressePerso), fontSize: 9, colSpan: 3 }, {}, {}],
    [{ text: "Code postal", bold: true, fontSize: 9 }, { text: valueOrBlank(c.codePostalPerso), fontSize: 9 }, { text: "Ville", bold: true, fontSize: 9 }, { text: valueOrBlank(c.villePerso), fontSize: 9 }],
    [{ text: "Téléphone", bold: true, fontSize: 9 }, { text: valueOrBlank(c.telephone), fontSize: 9 }, { text: "E-mail", bold: true, fontSize: 9 }, { text: valueOrBlank(c.email), fontSize: 9 }],
    [{ text: "N° Carte Pro / Préalable", bold: true, fontSize: 9 }, { text: valueOrBlank(c.numeroCartePro), fontSize: 9 }, { text: "N° allocataire France Travail", bold: true, fontSize: 9 }, { text: valueOrBlank(c.numeroFranceTravail), fontSize: 9 }],
  ];

  // ─── Diplome / Experience ───
  const diplomeRows = [
    [{ text: "Niveau scolaire", bold: true, fontSize: 9 }, { text: valueOrBlank(c.niveauFormation), fontSize: 9 }],
    [{ text: "Diplôme obtenu", bold: true, fontSize: 9 }, { text: valueOrBlank(c.diplomeObtenu), fontSize: 9 }],
  ];

  // ─── Formation souhaitee ───
  const formationsCheckboxes = RFC_CATEGORIES.map((cat) => ({
    text: `${checkbox(matchedCategory === cat)} ${cat}`,
    fontSize: 9,
    margin: [0, 2, 0, 2] as [number, number, number, number],
  }));
  const autresFormation = f && !matchedCategory
    ? { text: `${checkbox(true)} Autres formation : ${f.titre}`, fontSize: 9, margin: [0, 4, 0, 0] as [number, number, number, number] }
    : { text: `${checkbox(false)} Autres formation : ${BLANK_LINE}`, fontSize: 9, margin: [0, 4, 0, 0] as [number, number, number, number] };

  // ─── Documents remis (3 colonnes) ───
  const docsItems = DOCUMENTS.map((d) => ({
    text: `${checkbox(docsRemis.has(d.key))} ${d.label}`,
    fontSize: 9,
    margin: [0, 2, 0, 2] as [number, number, number, number],
  }));
  // Repartition en 3 colonnes (ceil(11/3)=4).
  const col1 = docsItems.slice(0, 4);
  const col2 = docsItems.slice(4, 8);
  const col3 = docsItems.slice(8, 11);

  return {
    pageMargins: [40, 40, 40, 60] as [number, number, number, number],
    content: [
      ...header("FICHE D'INSCRIPTION INDIVIDUELLE FORMATION", branding),
      balises,

      // Renseignement personnel
      { text: "Renseignement personnel", style: "sectionTitle" },
      {
        table: {
          widths: ["22%", "28%", "22%", "28%"],
          body: renseignementsRows,
        },
        layout: "lightHorizontalLines",
        margin: [0, 0, 0, 10] as [number, number, number, number],
      },

      // Diplome / Experience
      { text: "Diplôme / Expérience", style: "sectionTitle" },
      {
        table: {
          widths: ["30%", "70%"],
          body: diplomeRows,
        },
        layout: "lightHorizontalLines",
        margin: [0, 0, 0, 10] as [number, number, number, number],
      },

      // Formation souhaitee
      { text: "Formation souhaitée", style: "sectionTitle" },
      {
        columns: [
          { width: "*", stack: formationsCheckboxes.slice(0, 4) },
          { width: "*", stack: formationsCheckboxes.slice(4, 7) },
        ],
        margin: [0, 0, 0, 4] as [number, number, number, number],
      },
      autresFormation,

      // Documents remis
      { text: "Documents remis (case réservée à l'organisme de formation)", style: "sectionTitle" },
      {
        columns: [
          { width: "*", stack: col1 },
          { width: "*", stack: col2 },
          { width: "*", stack: col3 },
        ],
        margin: [0, 0, 0, 10] as [number, number, number, number],
      },

      // Signature
      signatureBlock({ titre: "Signature du demandeur", nom: `${c.prenom} ${c.nom}` }),

      footer(branding),
    ],
    styles: stylesFor(branding),
    defaultStyle: { font: "Roboto" },
  };
}
