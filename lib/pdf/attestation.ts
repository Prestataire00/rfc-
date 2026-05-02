/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  COLORS,
  footer,
  header,
  renderTemplateBody,
  signatureBlock,
  stylesFor,
  type PdfOpts,
} from "./shared";

// ==================== ATTESTATION DE FIN DE FORMATION ====================
export function attestationPdf(data: {
  stagiaire: { nom: string; prenom: string };
  formation: { titre: string; duree: number; objectifs?: string };
  session: { dateDebut: string; dateFin: string; lieu?: string };
  formateur?: { nom: string; prenom: string };
  dateGeneration: string;
}, opts?: PdfOpts): any {
  const branding = opts?.branding;
  const tpl = opts?.template;
  const primary = branding?.couleurPrimaire || COLORS.primary;
  const nomOrg = branding?.nomEntreprise || "RFC - Rescue Formation Conseil";
  const headerTitle = (tpl?.titre || "ATTESTATION DE FIN DE FORMATION").toUpperCase();
  const introText = tpl?.introduction || `Nous soussignés, ${nomOrg}, organisme de formation, attestons que :`;
  const corpsBody = renderTemplateBody(tpl?.corps);
  const mentionsBody = renderTemplateBody(tpl?.mentions);
  return {
    content: [
      ...header(headerTitle, branding),
      { text: "\n" },
      {
        text: tpl?.titre ? tpl.titre : "ATTESTATION DE FORMATION",
        fontSize: 16,
        bold: true,
        alignment: "center" as const,
        color: primary,
        margin: [0, 20, 0, 30] as [number, number, number, number],
      },
      {
        text: introText,
        style: "value",
        margin: [0, 0, 0, 15] as [number, number, number, number],
      },
      {
        text: `${data.stagiaire.prenom} ${data.stagiaire.nom}`,
        fontSize: 14,
        bold: true,
        alignment: "center" as const,
        color: COLORS.dark,
        margin: [0, 0, 0, 15] as [number, number, number, number],
      },
      {
        text: "a suivi avec assiduité la formation suivante :",
        style: "value",
        margin: [0, 0, 0, 15] as [number, number, number, number],
      },
      {
        table: {
          widths: ["35%", "65%"],
          body: [
            [{ text: "Formation", bold: true, style: "value" }, { text: data.formation.titre, style: "value" }],
            [{ text: "Durée", bold: true, style: "value" }, { text: `${data.formation.duree} heures`, style: "value" }],
            [{ text: "Dates", bold: true, style: "value" }, { text: `Du ${data.session.dateDebut} au ${data.session.dateFin}`, style: "value" }],
            [{ text: "Lieu", bold: true, style: "value" }, { text: data.session.lieu || "—", style: "value" }],
            ...(data.formateur ? [[{ text: "Formateur", bold: true, style: "value" }, { text: `${data.formateur.prenom} ${data.formateur.nom}`, style: "value" }]] : []),
          ],
        },
        layout: "lightHorizontalLines",
        margin: [0, 0, 0, 30] as [number, number, number, number],
      },
      data.formation.objectifs
        ? {
            stack: [
              { text: "Objectifs atteints :", style: "sectionTitle" },
              { text: data.formation.objectifs, style: "value", margin: [0, 0, 0, 20] as [number, number, number, number] },
            ],
          }
        : {},
      ...(corpsBody ? [{ stack: corpsBody, margin: [0, 10, 0, 10] as [number, number, number, number] }] : []),
      { text: `Fait à Toulon, le ${data.dateGeneration}`, style: "value", margin: [0, 20, 0, 0] as [number, number, number, number] },
      signatureBlock(
        { titre: `Pour ${nomOrg}`, nom: "Le Directeur" },
        { titre: "Signature du stagiaire", nom: `${data.stagiaire.prenom} ${data.stagiaire.nom}` }
      ),
      ...(mentionsBody ? [{ stack: mentionsBody, margin: [0, 15, 0, 0] as [number, number, number, number], fontSize: 8 }] : []),
      footer(branding),
    ],
    styles: stylesFor(branding),
    defaultStyle: { font: "Helvetica" },
  };
}
