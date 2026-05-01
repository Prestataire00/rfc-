/* eslint-disable @typescript-eslint/no-explicit-any */
import { LOGO_BASE64 } from "./logo-base64";
import type { PdfBranding } from "./branding";

// Re-export so callers that previously imported `PdfBranding` via templates can keep working.
export type { PdfBranding } from "./branding";

export const COLORS = {
  primary: "#C41E24",    // RFC Red (defaut — override via branding)
  dark: "#1a1a1a",       // Dark background
  gray: "#666666",
  light: "#f5f5f5",
  white: "#ffffff",
};

// Surcharge optionnelle par template (textes libres) + branding entreprise.
// Si fournis, titre/introduction/corps/mentions remplacent les valeurs codees.
export type PdfOpts = {
  branding?: PdfBranding;
  template?: {
    titre?: string;
    introduction?: string;
    corps?: string;
    mentions?: string;
  };
};

export function fmtDate(d: string): string {
  const date = new Date(d);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function fmtCurrency(n: number): string {
  return `${n.toFixed(2)} EUR`;
}

export function companyInfo(branding?: PdfBranding): string[] {
  if (branding) {
    return [
      branding.nomEntreprise,
      branding.slogan,
      branding.siteWeb,
    ].filter(Boolean);
  }
  return [
    "RFC - Rescue Formation Conseil",
    "Sécurité - Incendie - Prévention",
    "www.rescueformation83.fr",
  ];
}

export function header(title: string, branding?: PdfBranding) {
  const logo = branding?.logoBase64 || LOGO_BASE64;
  const primary = branding?.couleurPrimaire || COLORS.primary;
  const nom = branding?.nomEntreprise || "RFC - Rescue Formation Conseil";
  // Affichage texte : "RFC" + nom complet en ligne secondaire si different
  const shortName = nom.length > 6 ? nom.split(/[\s\-]/)[0].toUpperCase() : nom.toUpperCase();
  const fullLine = nom.toUpperCase();
  const slogan = branding?.slogan ?? "Sécurité - Incendie - Prévention";
  return [
    {
      columns: [
        {
          width: 60,
          image: logo,
          fit: [55, 55] as [number, number],
        },
        {
          width: "auto",
          stack: [
            { text: shortName, fontSize: 22, bold: true, color: "#000000", margin: [0, 2, 0, 0] as [number, number, number, number] },
            { text: fullLine, fontSize: 8, bold: true, color: "#000000", margin: [0, 1, 0, 0] as [number, number, number, number] },
            ...(slogan ? [{ text: slogan, fontSize: 7, color: "#333333" }] : []),
          ],
        },
        {
          text: title,
          style: "docTitle",
          alignment: "right" as const,
          width: "*",
        },
      ],
      columnGap: 10,
      margin: [0, 0, 0, 10] as [number, number, number, number],
    },
    { canvas: [{ type: "line" as const, x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 2, lineColor: primary }], margin: [0, 0, 0, 20] as [number, number, number, number] },
  ];
}

export function footer(branding?: PdfBranding) {
  const line1 = branding
    ? [branding.nomEntreprise, branding.slogan].filter(Boolean).join(" | ")
    : "RFC - Rescue Formation Conseil | Sécurité - Incendie - Prévention";
  const line2 = branding?.siteWeb || "www.rescueformation83.fr";
  return {
    stack: [
      { text: line1, fontSize: 8, color: "#333333", alignment: "center" as const },
      ...(line2 ? [{ text: line2, fontSize: 8, color: "#333333", alignment: "center" as const, margin: [0, 2, 0, 0] as [number, number, number, number] }] : []),
    ],
    margin: [0, 20, 0, 0] as [number, number, number, number],
  };
}

// Helper : genere une palette de styles avec couleur primaire surchargeable.
export function stylesFor(branding?: PdfBranding) {
  const primary = branding?.couleurPrimaire || COLORS.primary;
  return {
    brand: { fontSize: 18, bold: true, color: primary },
    docTitle: { fontSize: 14, bold: true, color: COLORS.dark },
    sectionTitle: { fontSize: 12, bold: true, color: primary, margin: [0, 15, 0, 8] as [number, number, number, number] },
    label: { fontSize: 9, color: COLORS.gray, margin: [0, 2, 0, 0] as [number, number, number, number] },
    value: { fontSize: 10, color: COLORS.dark },
    footer: { fontSize: 8, color: COLORS.gray },
    tableHeader: { fontSize: 9, bold: true, color: "#ffffff", fillColor: primary },
  };
}

// Rend le corps libre d'un template (texte avec \n) en array de paragraphes pdfmake.
export function renderTemplateBody(text: string | undefined) {
  if (!text) return null;
  const lines = text.split("\n");
  return lines.map((line) => ({
    text: line.length ? line : " ",
    style: "value",
    margin: [0, 0, 0, line.length ? 4 : 0] as [number, number, number, number],
  }));
}

/**
 * Bloc signature réutilisable.
 * @param left  { titre, nom } — signataire gauche (ex. RFC / Le Directeur)
 * @param right { titre, nom } — signataire droit (ex. Client / Bon pour accord) — optionnel
 */
export function signatureBlock(
  left: { titre: string; nom?: string },
  right?: { titre: string; nom?: string }
) {
  const bloc = (s: { titre: string; nom?: string }) => ({
    stack: [
      { text: s.titre, fontSize: 9, bold: true, color: COLORS.dark },
      ...(s.nom ? [{ text: s.nom, fontSize: 9, color: COLORS.gray, margin: [0, 1, 0, 0] as [number, number, number, number] }] : []),
      { text: "Date : ___________________________", fontSize: 9, color: COLORS.gray, margin: [0, 12, 0, 0] as [number, number, number, number] },
      {
        table: {
          widths: ["*"],
          heights: [55],
          body: [[{
            text: "Signature",
            fontSize: 8,
            color: "#aaaaaa",
            margin: [4, 4, 0, 0] as [number, number, number, number],
          }]],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => "#cccccc",
          vLineColor: () => "#cccccc",
        },
        margin: [0, 6, 0, 0] as [number, number, number, number],
      },
    ],
  });

  if (!right) {
    return {
      columns: [bloc(left), { width: "*", text: "" }],
      margin: [0, 25, 0, 0] as [number, number, number, number],
    };
  }

  return {
    columns: [
      { width: "48%", ...bloc(left) },
      { width: "4%", text: "" },
      { width: "48%", ...bloc(right) },
    ],
    margin: [0, 25, 0, 0] as [number, number, number, number],
  };
}

export const defaultStyles = {
  brand: { fontSize: 18, bold: true, color: COLORS.primary },
  docTitle: { fontSize: 14, bold: true, color: COLORS.dark },
  sectionTitle: { fontSize: 12, bold: true, color: COLORS.primary, margin: [0, 15, 0, 8] as [number, number, number, number] },
  label: { fontSize: 9, color: COLORS.gray, margin: [0, 2, 0, 0] as [number, number, number, number] },
  value: { fontSize: 10, color: COLORS.dark },
  footer: { fontSize: 8, color: COLORS.gray },
  tableHeader: { fontSize: 9, bold: true, color: "#ffffff", fillColor: COLORS.primary },
};

// Re-export LOGO_BASE64 for templates that need it directly (devis, facture).
export { LOGO_BASE64 } from "./logo-base64";
