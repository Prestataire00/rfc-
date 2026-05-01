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

// ==================== CONVOCATION ====================
export function convocationPdf(data: {
  stagiaire: { nom: string; prenom: string; email: string };
  formation: { titre: string; duree: number };
  session: { dateDebut: string; dateFin: string; lieu?: string };
  formateur?: { nom: string; prenom: string };
}, opts?: PdfOpts): any {
  const branding = opts?.branding;
  const tpl = opts?.template;
  const nomOrg = branding?.nomEntreprise || "RFC - Rescue Formation Conseil";
  const headerTitle = (tpl?.titre || "CONVOCATION").toUpperCase();
  const introText = tpl?.introduction || `Madame, Monsieur,\n\nNous avons le plaisir de vous confirmer votre inscription à la formation mentionnée ci-dessous :`;
  const corpsText = tpl?.corps;
  const mentionsBody = renderTemplateBody(tpl?.mentions);
  return {
    content: [
      ...header(headerTitle, branding),
      { text: "\n" },
      {
        text: `${data.stagiaire.prenom} ${data.stagiaire.nom}`,
        fontSize: 12,
        bold: true,
        color: COLORS.dark,
        margin: [0, 0, 0, 5] as [number, number, number, number],
      },
      { text: data.stagiaire.email, style: "value", margin: [0, 0, 0, 20] as [number, number, number, number] },
      {
        text: `Objet : Convocation à la formation "${data.formation.titre}"`,
        style: "value",
        bold: true,
        margin: [0, 0, 0, 15] as [number, number, number, number],
      },
      {
        text: introText,
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
            [{ text: "Lieu", bold: true, style: "value" }, { text: data.session.lieu || "À confirmer", style: "value" }],
            ...(data.formateur ? [[{ text: "Formateur", bold: true, style: "value" }, { text: `${data.formateur.prenom} ${data.formateur.nom}`, style: "value" }]] : []),
            [{ text: "Horaires", bold: true, style: "value" }, { text: "9h00 - 12h30 / 14h00 - 17h30", style: "value" }],
          ],
        },
        layout: "lightHorizontalLines",
        margin: [0, 0, 0, 20] as [number, number, number, number],
      },
      {
        text: corpsText || "Nous vous prions de bien vouloir vous présenter 15 minutes avant le début de la formation muni(e) de cette convocation.\n\nNous restons à votre disposition pour toute information complémentaire.",
        style: "value",
        margin: [0, 0, 0, 20] as [number, number, number, number],
      },
      { text: "Cordialement,", style: "value" },
      { text: `L'équipe ${nomOrg}`, style: "value", bold: true, margin: [0, 5, 0, 0] as [number, number, number, number] },
      signatureBlock(
        { titre: `Pour ${nomOrg}` },
        { titre: "Accusé de réception du stagiaire", nom: `${data.stagiaire.prenom} ${data.stagiaire.nom}` }
      ),
      ...(mentionsBody ? [{ stack: mentionsBody, margin: [0, 15, 0, 0] as [number, number, number, number], fontSize: 8 }] : []),
      footer(branding),
    ],
    styles: stylesFor(branding),
    defaultStyle: { font: "Helvetica" },
  };
}
