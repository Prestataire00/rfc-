/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  COLORS,
  defaultStyles,
  fmtCurrency,
  fmtDate,
  footer,
  header,
} from "./shared";

// ==================== BILAN PEDAGOGIQUE ET FINANCIER ====================
export function bpfPdf(data: {
  annee: number;
  nbSessions: number;
  nbStagiaires: number;
  nbHeures: number;
  caTotal: number;
  sessions: {
    formation: string;
    dateDebut: string;
    dateFin: string;
    lieu: string;
    formateur: string;
    nbInscrits: number;
    duree: number;
    ca: number;
  }[];
  parCategorie: { categorie: string; sessions: number; stagiaires: number }[];
}): any {
  return {
    content: [
      ...header(`BPF ${data.annee}`),
      { text: `Bilan Pédagogique et Financier - Année ${data.annee}`, style: "sectionTitle" },
      {
        columns: [
          { width: "25%", stack: [{ text: "Sessions", style: "label" }, { text: String(data.nbSessions), fontSize: 20, bold: true, color: COLORS.dark }] },
          { width: "25%", stack: [{ text: "Stagiaires", style: "label" }, { text: String(data.nbStagiaires), fontSize: 20, bold: true, color: COLORS.dark }] },
          { width: "25%", stack: [{ text: "Heures-stag.", style: "label" }, { text: String(data.nbHeures), fontSize: 20, bold: true, color: COLORS.dark }] },
          { width: "25%", stack: [{ text: "CA HT", style: "label" }, { text: fmtCurrency(data.caTotal), fontSize: 20, bold: true, color: COLORS.primary }] },
        ],
        margin: [0, 0, 0, 20] as [number, number, number, number],
      },
      { text: "DÉTAIL DES SESSIONS", style: "sectionTitle" },
      {
        table: {
          headerRows: 1,
          widths: ["*", 55, 55, 30, 40, 55],
          body: [
            [
              { text: "Formation", style: "tableHeader" },
              { text: "Début", style: "tableHeader" },
              { text: "Fin", style: "tableHeader" },
              { text: "Stag.", style: "tableHeader", alignment: "center" as const },
              { text: "Heures", style: "tableHeader", alignment: "center" as const },
              { text: "CA HT", style: "tableHeader", alignment: "right" as const },
            ],
            ...data.sessions.map((s) => [
              { text: s.formation, style: "value" },
              { text: fmtDate(s.dateDebut), style: "value" },
              { text: fmtDate(s.dateFin), style: "value" },
              { text: String(s.nbInscrits), style: "value", alignment: "center" as const },
              { text: String(s.duree), style: "value", alignment: "center" as const },
              { text: fmtCurrency(s.ca), style: "value", alignment: "right" as const },
            ]),
          ],
        },
        layout: "lightHorizontalLines",
        margin: [0, 0, 0, 20] as [number, number, number, number],
      },
      data.parCategorie.length > 0 ? { text: "PAR CATÉGORIE", style: "sectionTitle" } : {},
      data.parCategorie.length > 0 ? {
        table: {
          headerRows: 1,
          widths: ["*", 80, 80],
          body: [
            [{ text: "Catégorie", style: "tableHeader" }, { text: "Sessions", style: "tableHeader", alignment: "center" as const }, { text: "Stagiaires", style: "tableHeader", alignment: "center" as const }],
            ...data.parCategorie.map((c) => [
              { text: c.categorie, style: "value" },
              { text: String(c.sessions), style: "value", alignment: "center" as const },
              { text: String(c.stagiaires), style: "value", alignment: "center" as const },
            ]),
          ],
        },
        layout: "lightHorizontalLines",
      } : {},
      footer(),
    ],
    styles: defaultStyles,
    defaultStyle: { font: "Helvetica" },
  };
}
