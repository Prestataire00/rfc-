/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  footer,
  header,
  renderTemplateBody,
  stylesFor,
  type PdfOpts,
} from "./shared";

// ==================== FEUILLE DE PRESENCE ====================
export function feuillePresencePdf(data: {
  formation: { titre: string; duree: number };
  session: { dateDebut: string; dateFin: string; lieu?: string };
  formateur?: { nom: string; prenom: string };
  stagiaires: { nom: string; prenom: string; id?: string }[];
  dates: string[];
  signatures?: Record<string, { signatureMatin?: string; signatureApresMidi?: string; statutMatin?: string; statutApresMidi?: string }>;
}, opts?: PdfOpts): any {
  const branding = opts?.branding;
  const tpl = opts?.template;
  const headerTitle = (tpl?.titre || "FEUILLE DE PRÉSENCE").toUpperCase();
  const introBody = renderTemplateBody(tpl?.introduction);
  const mentionsBody = renderTemplateBody(tpl?.mentions);
  const headerRow = [
    { text: "Nom Prénom", style: "tableHeader" },
    ...data.dates.flatMap((d) => [
      { text: `${d}\nMatin`, style: "tableHeader", alignment: "center" as const },
      { text: `${d}\nAprès-midi`, style: "tableHeader", alignment: "center" as const },
    ]),
  ];

  const sigData = data.signatures || {};

  const bodyRows = data.stagiaires.map((s) => [
    { text: `${s.prenom} ${s.nom}`, style: "value", margin: [2, 5, 2, 5] as [number, number, number, number] },
    ...data.dates.flatMap((d) => {
      const key = s.id ? `${s.id}_${d}` : "";
      const sig = key ? sigData[key] : undefined;
      const matinCell = sig?.signatureMatin
        ? { image: sig.signatureMatin, fit: [50, 20] as [number, number], margin: [2, 2, 2, 2] as [number, number, number, number] }
        : { text: sig?.statutMatin || "", fontSize: 7, color: "#666666", alignment: "center" as const, margin: [2, 5, 2, 5] as [number, number, number, number] };
      const amCell = sig?.signatureApresMidi
        ? { image: sig.signatureApresMidi, fit: [50, 20] as [number, number], margin: [2, 2, 2, 2] as [number, number, number, number] }
        : { text: sig?.statutApresMidi || "", fontSize: 7, color: "#666666", alignment: "center" as const, margin: [2, 5, 2, 5] as [number, number, number, number] };
      return [matinCell, amCell];
    }),
  ]);

  const colWidths = ["auto", ...data.dates.flatMap(() => ["*", "*"])];

  return {
    pageOrientation: "landscape" as const,
    content: [
      ...header(headerTitle, branding),
      ...(introBody ? [{ stack: introBody, margin: [0, 0, 0, 10] as [number, number, number, number] }] : []),
      {
        table: {
          widths: ["30%", "70%"],
          body: [
            [{ text: "Formation", bold: true, style: "value" }, { text: data.formation.titre, style: "value" }],
            [{ text: "Dates", bold: true, style: "value" }, { text: `Du ${data.session.dateDebut} au ${data.session.dateFin}`, style: "value" }],
            [{ text: "Lieu", bold: true, style: "value" }, { text: data.session.lieu || "—", style: "value" }],
            ...(data.formateur ? [[{ text: "Formateur", bold: true, style: "value" }, { text: `${data.formateur.prenom} ${data.formateur.nom}`, style: "value" }]] : []),
          ],
        },
        layout: "noBorders",
        margin: [0, 0, 0, 15] as [number, number, number, number],
      },
      {
        text: "Émargement (signature obligatoire)",
        style: "sectionTitle",
      },
      {
        table: {
          headerRows: 1,
          widths: colWidths,
          body: [headerRow, ...bodyRows],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => "#cbd5e1",
          vLineColor: () => "#cbd5e1",
        },
      },
      {
        columns: [
          { text: "Signature du formateur :", style: "label", margin: [0, 30, 0, 0] as [number, number, number, number], width: "50%" },
          { text: "Signature du responsable :", style: "label", margin: [0, 30, 0, 0] as [number, number, number, number], width: "50%" },
        ],
      },
      ...(mentionsBody ? [{ stack: mentionsBody, margin: [0, 15, 0, 0] as [number, number, number, number], fontSize: 8 }] : []),
      footer(branding),
    ],
    styles: stylesFor(branding),
    defaultStyle: { font: "Helvetica" },
  };
}
