/* eslint-disable @typescript-eslint/no-explicit-any */
// Template PDF generique pour un "modele de document" libre (genere par IA).
// Structure simple : entete brande + titre + introduction + corps + mentions.
// Le corps respecte les sauts de ligne (\n) via renderTemplateBody().

import {
  COLORS,
  defaultStyles,
  footer,
  header,
  renderTemplateBody,
  type PdfBranding,
} from "./shared";

export function documentLibrePdf(
  data: {
    titre: string;
    introduction?: string;
    corps: string;
    mentions?: string;
  },
  opts?: { branding?: PdfBranding },
): any {
  const corpsBlocks = renderTemplateBody(data.corps) ?? [];

  return {
    content: [
      ...header(data.titre, opts?.branding),
      { text: data.titre, style: "sectionTitle" },
      ...(data.introduction
        ? [
            {
              text: data.introduction,
              style: "value",
              italics: true,
              margin: [0, 0, 0, 14] as [number, number, number, number],
            },
          ]
        : []),
      ...corpsBlocks,
      ...(data.mentions
        ? [
            {
              canvas: [
                { type: "line" as const, x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: "#cccccc" },
              ],
              margin: [0, 18, 0, 8] as [number, number, number, number],
            },
            {
              text: data.mentions,
              fontSize: 8,
              color: COLORS.gray,
            },
          ]
        : []),
      footer(opts?.branding),
    ],
    styles: defaultStyles,
    defaultStyle: { font: "Helvetica" },
  };
}
