/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  companyInfo,
  footer,
  header,
  renderTemplateBody,
  signatureBlock,
  stylesFor,
  type PdfOpts,
} from "./shared";

// ==================== CONVENTION DE FORMATION ====================
export function conventionPdf(data: {
  entreprise: { nom: string; adresse?: string; ville?: string; codePostal?: string; siret?: string };
  formation: { titre: string; duree: number; objectifs?: string };
  session: { dateDebut: string; dateFin: string; lieu?: string };
  montantHT: number;
  montantTTC: number;
  numero: string;
}, opts?: PdfOpts): any {
  const branding = opts?.branding;
  const tpl = opts?.template;
  const info = companyInfo(branding);
  const headerTitle = (tpl?.titre || "CONVENTION DE FORMATION").toUpperCase();
  const introBody = renderTemplateBody(tpl?.introduction);
  const corpsBody = renderTemplateBody(tpl?.corps);
  const mentionsBody = renderTemplateBody(tpl?.mentions);
  return {
    content: [
      ...header(headerTitle, branding),
      ...(introBody ? [{ stack: introBody, margin: [0, 0, 0, 10] as [number, number, number, number] }] : []),
      { text: `Convention N° ${data.numero}`, style: "sectionTitle" },
      {
        columns: [
          {
            width: "50%",
            stack: [
              { text: "ORGANISME DE FORMATION", style: "label" },
              { text: info[0], style: "value", bold: true },
              { text: info[1], style: "value" },
              { text: info[2], style: "value" },
            ],
          },
          {
            width: "50%",
            stack: [
              { text: "CLIENT", style: "label" },
              { text: data.entreprise.nom, style: "value", bold: true },
              { text: [data.entreprise.adresse, data.entreprise.codePostal, data.entreprise.ville].filter(Boolean).join(", "), style: "value" },
              data.entreprise.siret ? { text: `SIRET: ${data.entreprise.siret}`, style: "value" } : {},
            ],
          },
        ],
        margin: [0, 0, 0, 15] as [number, number, number, number],
      },
      { text: "OBJET DE LA FORMATION", style: "sectionTitle" },
      {
        table: {
          widths: ["30%", "70%"],
          body: [
            [{ text: "Intitulé", style: "label" }, { text: data.formation.titre, style: "value", bold: true }],
            [{ text: "Durée", style: "label" }, { text: `${data.formation.duree} heures`, style: "value" }],
            [{ text: "Dates", style: "label" }, { text: `Du ${data.session.dateDebut} au ${data.session.dateFin}`, style: "value" }],
            [{ text: "Lieu", style: "label" }, { text: data.session.lieu || "À définir", style: "value" }],
          ],
        },
        layout: "lightHorizontalLines",
        margin: [0, 0, 0, 15] as [number, number, number, number],
      },
      data.formation.objectifs ? { text: "OBJECTIFS", style: "sectionTitle" } : {},
      data.formation.objectifs ? { text: data.formation.objectifs, style: "value", margin: [0, 0, 0, 15] as [number, number, number, number] } : {},
      { text: "CONDITIONS FINANCIÈRES", style: "sectionTitle" },
      {
        table: {
          widths: ["50%", "50%"],
          body: [
            [{ text: "Montant HT", style: "value" }, { text: `${data.montantHT.toFixed(2)} EUR`, style: "value", alignment: "right" }],
            [{ text: "TVA (20%)", style: "value" }, { text: `${(data.montantTTC - data.montantHT).toFixed(2)} EUR`, style: "value", alignment: "right" }],
            [{ text: "Montant TTC", style: "value", bold: true }, { text: `${data.montantTTC.toFixed(2)} EUR`, style: "value", bold: true, alignment: "right" }],
          ],
        },
        layout: "lightHorizontalLines",
        margin: [0, 0, 0, 30] as [number, number, number, number],
      },
      ...(corpsBody ? [{ stack: corpsBody, margin: [0, 10, 0, 10] as [number, number, number, number] }] : []),
      signatureBlock(
        { titre: "Pour l'organisme de formation", nom: info[0] },
        { titre: "Pour le client", nom: data.entreprise.nom }
      ),
      ...(mentionsBody ? [{ stack: mentionsBody, margin: [0, 15, 0, 0] as [number, number, number, number], fontSize: 8 }] : []),
      footer(branding),
    ],
    styles: stylesFor(branding),
    defaultStyle: { font: "Helvetica" },
  };
}
