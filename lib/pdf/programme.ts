/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  footer,
  header,
  renderTemplateBody,
  stylesFor,
  type PdfOpts,
} from "./shared";

// ==================== PROGRAMME DE FORMATION ====================
// Document Qualiopi remis au client : détaille le contenu pédagogique de la
// formation (objectifs, programme, méthodes, moyens, accessibilité, résultats).
// Généré à partir des champs du modèle Formation.
export function programmePdf(data: {
  titre: string;
  duree: number;
  description?: string;
  publicCible?: string;
  prerequis?: string;
  objectifs?: string;
  contenuProgramme?: string;
  methodesPedagogiques?: string;
  methodesEvaluation?: string;
  moyensTechniques?: string;
  accessibilite?: string;
  indicateursResultats?: string;
  informationsComplementaires?: string;
  modalite?: string;
}, opts?: PdfOpts): any {
  const branding = opts?.branding;
  const tpl = opts?.template;
  const headerTitle = (tpl?.titre || "PROGRAMME DE FORMATION").toUpperCase();
  const introBody = renderTemplateBody(tpl?.introduction);
  const mentionsBody = renderTemplateBody(tpl?.mentions);

  // Section libre : titre + corps multi-lignes. Omise si le champ est vide.
  const section = (label: string, text?: string | null): any[] => {
    if (!text || !text.trim()) return [];
    return [
      { text: label, style: "sectionTitle" },
      { stack: renderTemplateBody(text) ?? [], margin: [0, 0, 0, 8] as [number, number, number, number] },
    ];
  };

  const modaliteLabel = (m?: string) => {
    switch (m) {
      case "distanciel": return "À distance";
      case "mixte": return "Mixte (présentiel + distanciel)";
      case "presentiel": return "Présentiel";
      default: return m || "Présentiel";
    }
  };

  return {
    content: [
      ...header(headerTitle, branding),
      ...(introBody ? [{ stack: introBody, margin: [0, 0, 0, 10] as [number, number, number, number] }] : []),

      { text: data.titre, style: "sectionTitle", fontSize: 14 },

      // Bloc synthèse (durée / modalité)
      {
        table: {
          widths: ["30%", "70%"],
          body: [
            [{ text: "Durée", style: "label" }, { text: `${data.duree} heures`, style: "value", bold: true }],
            [{ text: "Modalité", style: "label" }, { text: modaliteLabel(data.modalite), style: "value" }],
          ],
        },
        layout: "lightHorizontalLines",
        margin: [0, 0, 0, 10] as [number, number, number, number],
      },

      ...section("PRÉSENTATION", data.description),
      ...section("PUBLIC CIBLE", data.publicCible),
      ...section("PRÉREQUIS", data.prerequis),
      ...section("OBJECTIFS PÉDAGOGIQUES", data.objectifs),
      ...section("CONTENU DU PROGRAMME", data.contenuProgramme),
      ...section("MÉTHODES PÉDAGOGIQUES", data.methodesPedagogiques),
      ...section("MODALITÉS D'ÉVALUATION", data.methodesEvaluation),
      ...section("MOYENS TECHNIQUES", data.moyensTechniques),
      ...section("ACCESSIBILITÉ", data.accessibilite),
      ...section("INDICATEURS DE RÉSULTATS", data.indicateursResultats),
      ...section("INFORMATIONS COMPLÉMENTAIRES", data.informationsComplementaires),

      ...(mentionsBody ? [{ stack: mentionsBody, margin: [0, 15, 0, 0] as [number, number, number, number], fontSize: 8 }] : []),
      footer(branding),
    ],
    styles: stylesFor(branding),
    defaultStyle: { font: "Helvetica" },
  };
}
