/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  COLORS,
  fmtCurrency,
  fmtDate,
  footer,
  header,
  stylesFor,
  type PdfOpts,
} from "./shared";

// ==================== ANALYSE DES BESOINS CLIENTS ====================

const BLANK_LINE = "______________________";

function checkbox(checked: boolean): string {
  return checked ? "☑" : "☐";
}

function valueOrBlank(v: string | null | undefined | number): string {
  if (v === null || v === undefined) return BLANK_LINE;
  const s = String(v);
  return s.trim().length > 0 ? s : BLANK_LINE;
}

export function analyseBesoinsPdf(data: {
  besoin: {
    titre: string; description?: string | null; createdAt: string;
    sourceContact?: string | null; nbStagiaires?: number | null;
    datesSouhaitees?: string | null; budget?: number | null;
    materielSurPlace?: string[]; observation?: string | null;
    notes?: string | null;
  };
  entreprise?: { nom: string; secteur?: string | null; effectif?: number | null;
    adresse?: string | null; codePostal?: string | null; ville?: string | null;
  } | null;
  formation?: { titre: string; tarif: number; duree: number; certifiante?: boolean } | null;
  contact?: { nom: string; prenom: string; email: string; telephone?: string | null } | null;
  dateGeneration: string;
}, opts?: PdfOpts): any {
  const branding = opts?.branding;
  const primary = branding?.couleurPrimaire || COLORS.primary;

  const b = data.besoin;
  const e = data.entreprise;
  const f = data.formation;
  const ct = data.contact;
  const materiel = new Set(b.materielSurPlace || []);

  // ─── TARIF ESTIME ───
  let tarifEstime: string;
  let tarifSousTitre: string | null = null;
  if (f && b.nbStagiaires) {
    tarifEstime = fmtCurrency(f.tarif * b.nbStagiaires);
    tarifSousTitre = `${b.nbStagiaires} × ${fmtCurrency(f.tarif)}`;
  } else if (typeof b.budget === "number") {
    tarifEstime = fmtCurrency(b.budget);
    tarifSousTitre = "Budget client";
  } else {
    tarifEstime = "À chiffrer";
  }

  // ─── BALISES ───
  const balises = {
    columns: [
      // Box 1 : ENTREPRISE
      {
        width: "*",
        table: {
          widths: ["*"],
          body: [[{
            stack: [
              { text: "ENTREPRISE", fontSize: 8, bold: true, color: primary, margin: [0, 0, 0, 4] as [number, number, number, number] },
              { text: e?.nom || "Particulier", fontSize: 12, bold: true, color: COLORS.dark },
              ...(e?.secteur ? [{ text: e.secteur, fontSize: 8, color: COLORS.gray, margin: [0, 2, 0, 0] as [number, number, number, number] }] : []),
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
              { text: f?.titre || b.titre, fontSize: 11, bold: true, color: COLORS.dark },
              ...(typeof b.nbStagiaires === "number" ? [{ text: `${b.nbStagiaires} stagiaire${b.nbStagiaires > 1 ? "s" : ""}`, fontSize: 8, color: COLORS.gray, margin: [0, 2, 0, 0] as [number, number, number, number] }] : []),
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
      // Box 3 : TARIF ESTIMÉ
      {
        width: "*",
        table: {
          widths: ["*"],
          body: [[{
            stack: [
              { text: "TARIF ESTIMÉ", fontSize: 8, bold: true, color: primary, margin: [0, 0, 0, 4] as [number, number, number, number] },
              { text: tarifEstime, fontSize: 13, bold: true, color: primary },
              ...(tarifSousTitre ? [{ text: tarifSousTitre, fontSize: 8, color: COLORS.gray, margin: [0, 2, 0, 0] as [number, number, number, number] }] : []),
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

  // ─── Source de contact (4 cases) ───
  const src = (b.sourceContact || "").toLowerCase();
  const sourceItems = [
    { key: "telephone", label: "Téléphone" },
    { key: "mail", label: "Mail" },
    { key: "agence", label: "Agence" },
    { key: "site_internet", label: "Site internet" },
  ];

  // ─── Materiel sur place ───
  const materielItems = [
    { key: "salles", label: "Salles" },
    { key: "videoprojecteur", label: "Vidéoprojecteur" },
    { key: "paperboard", label: "Paperboard" },
  ];

  // ─── Adresse complete ───
  const adresseComplete = [
    e?.adresse,
    [e?.codePostal, e?.ville].filter(Boolean).join(" "),
  ].filter(Boolean).join(", ") || BLANK_LINE;

  return {
    pageMargins: [40, 40, 40, 60] as [number, number, number, number],
    content: [
      ...header("ANALYSE DES BESOINS CLIENTS", branding),
      balises,

      // Date demande
      {
        columns: [
          { width: "auto", text: "Date de la demande :", fontSize: 10, bold: true, color: COLORS.dark },
          { width: 8, text: "" },
          { width: "*", text: fmtDate(b.createdAt), fontSize: 10, color: COLORS.dark },
        ],
        margin: [0, 0, 0, 10] as [number, number, number, number],
      },

      // Prise de contact
      { text: "Prise de contact avec l'OF", style: "sectionTitle" },
      {
        columns: sourceItems.map((s) => ({
          width: "*",
          text: `${checkbox(src === s.key)} ${s.label}`,
          fontSize: 10,
        })),
        margin: [0, 0, 0, 10] as [number, number, number, number],
      },

      // Entreprise cliente
      { text: "Entreprise cliente", style: "sectionTitle" },
      {
        table: {
          widths: ["30%", "70%"],
          body: [
            [{ text: "Nom de l'entreprise", bold: true, fontSize: 9 }, { text: valueOrBlank(e?.nom), fontSize: 9 }],
            [{ text: "Nature (secteur)", bold: true, fontSize: 9 }, { text: valueOrBlank(e?.secteur), fontSize: 9 }],
            [{ text: "Effectif total", bold: true, fontSize: 9 }, { text: valueOrBlank(e?.effectif), fontSize: 9 }],
            [{ text: "Effectif à former", bold: true, fontSize: 9 }, { text: valueOrBlank(b.nbStagiaires), fontSize: 9 }],
            [{ text: "Adresse complète", bold: true, fontSize: 9 }, { text: adresseComplete, fontSize: 9 }],
          ],
        },
        layout: "lightHorizontalLines",
        margin: [0, 0, 0, 10] as [number, number, number, number],
      },

      // Formation souhaitee
      { text: "Formation souhaitée", style: "sectionTitle" },
      {
        table: {
          widths: ["30%", "70%"],
          body: [
            [{ text: "Intitulé", bold: true, fontSize: 9 }, { text: f?.titre || b.titre, fontSize: 9 }],
            [{ text: "Date souhaitée", bold: true, fontSize: 9 }, { text: valueOrBlank(b.datesSouhaitees), fontSize: 9 }],
            [{ text: "Lieu", bold: true, fontSize: 9 }, { text: valueOrBlank(b.notes), fontSize: 9 }],
          ],
        },
        layout: "lightHorizontalLines",
        margin: [0, 0, 0, 10] as [number, number, number, number],
      },

      // Besoins particuliers
      { text: "Besoins particuliers", style: "sectionTitle" },
      {
        text: b.description && b.description.trim().length > 0 ? b.description : BLANK_LINE,
        fontSize: 9,
        color: COLORS.dark,
        margin: [0, 0, 0, 10] as [number, number, number, number],
      },

      // Observation
      { text: "Observation", style: "sectionTitle" },
      {
        text: b.observation && b.observation.trim().length > 0 ? b.observation : BLANK_LINE,
        fontSize: 9,
        color: COLORS.dark,
        margin: [0, 0, 0, 10] as [number, number, number, number],
      },

      // Materiel sur place
      { text: "Matériel sur place", style: "sectionTitle" },
      {
        columns: materielItems.map((m) => ({
          width: "*",
          text: `${checkbox(materiel.has(m.key))} ${m.label}`,
          fontSize: 10,
        })),
        margin: [0, 0, 0, 10] as [number, number, number, number],
      },

      // Contact referent
      ...(ct ? [
        { text: "Contact référent", style: "sectionTitle" },
        {
          table: {
            widths: ["30%", "70%"],
            body: [
              [{ text: "Nom", bold: true, fontSize: 9 }, { text: `${ct.prenom} ${ct.nom}`, fontSize: 9 }],
              [{ text: "E-mail", bold: true, fontSize: 9 }, { text: ct.email, fontSize: 9 }],
              [{ text: "Téléphone", bold: true, fontSize: 9 }, { text: valueOrBlank(ct.telephone), fontSize: 9 }],
            ],
          },
          layout: "lightHorizontalLines",
          margin: [0, 0, 0, 10] as [number, number, number, number],
        },
      ] : []),

      footer(branding),
    ],
    styles: stylesFor(branding),
    defaultStyle: { font: "Roboto" },
  };
}
