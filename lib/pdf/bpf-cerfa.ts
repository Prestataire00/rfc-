/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Bilan Pédagogique et Financier — format Cerfa 10443*17
 *
 * Reproduit la structure officielle du formulaire BPF (cadres A à D) en PDF.
 * Auto-remplit les sections où nous avons les données en base ; laisse les
 * autres avec mention "à compléter" pour saisie manuelle par l'utilisateur
 * avant télédéclaration sur Démarches Simplifiées.
 *
 * Réf : https://www.formulaires.service-public.fr/gf/cerfa_10443.do
 */

import { COLORS, defaultStyles, fmtCurrency, footer, header, type PdfBranding } from "./shared";

export type BpfCerfaProduits = {
  // Cadre B (recettes) — montants HT
  b1_entreprises: number; // Entreprises pour formation salariés
  b2_opco: number; // Organismes paritaires (OPCO)
  b3_etat: number; // Pouvoirs publics — État
  b3_regions: number; // Pouvoirs publics — Régions
  b3_franceTravail: number; // France Travail (ex Pôle emploi)
  b3_autres: number; // Autres pouvoirs publics
  b4_particuliers: number; // Personnes individuelles à leurs frais
  b5_autresOF: number; // Sous-traitance / co-traitance reçue
  b6_annexes: number; // Produits annexes (ventes outils, etc.)
  b7_total: number; // Total produits HT
};

export type BpfCerfaCharges = {
  c1_achats: number;
  c2_services: number;
  c3_autresCharges: number;
  c4_impots: number;
  c5_salaires: number;
  c6_autres: number;
  c7_total: number;
};

export type BpfCerfaPedagogique = {
  // Nombre de stagiaires par catégorie
  d_salaries: number;
  d_demandeursEmploi: number;
  d_particuliers: number;
  d_autres: number;
  // Heures-stagiaires par catégorie
  d_hSalaries: number;
  d_hDemandeursEmploi: number;
  d_hParticuliers: number;
  d_hAutres: number;
  // Par type d'action (heures-stagiaires)
  typeActions: {
    adaptation: number; // 1
    promotion: number; // 2
    prevention: number; // 3
    conversion: number; // 4
    acquisition: number; // 5
    qualification: number; // 6
    apprentissage: number; // 7
    professionnalisation: number; // 8
    cpf: number; // 9
    vae: number; // 10
    bilanCompetences: number; // 11
  };
};

export type BpfCerfaInput = {
  annee: number;
  // Cadre A — Identification de l'OF
  raisonSociale: string;
  adresse: string;
  codePostal: string;
  ville: string;
  telephone: string;
  email: string;
  siret: string;
  nda: string;
  natureJuridique?: string;
  // Cadres B, C, D
  produits: BpfCerfaProduits;
  charges: BpfCerfaCharges;
  pedagogique: BpfCerfaPedagogique;
};

const CASE_STYLE = {
  border: [true, true, true, true] as [boolean, boolean, boolean, boolean],
  fillColor: "#f9f9f9",
  margin: [4, 4, 4, 4] as [number, number, number, number],
};

function box(label: string, value: string | number, span?: number) {
  return {
    border: CASE_STYLE.border,
    fillColor: "#ffffff",
    margin: CASE_STYLE.margin,
    stack: [
      { text: label, fontSize: 7, color: "#666666" },
      { text: String(value ?? "—"), fontSize: 10, bold: true, margin: [0, 2, 0, 0] },
    ],
    ...(span ? { colSpan: span } : {}),
  };
}

function moneyRow(num: string, label: string, montant: number) {
  return [
    { text: num, fontSize: 9, bold: true, color: COLORS.primary, alignment: "center" },
    { text: label, fontSize: 9 },
    {
      text: montant > 0 ? fmtCurrency(montant) : "—",
      fontSize: 9,
      alignment: "right",
      bold: montant > 0,
    },
  ];
}

function pedRow(label: string, hStag: number) {
  return [
    { text: label, fontSize: 8.5 },
    {
      text: hStag > 0 ? hStag.toLocaleString("fr-FR") : "—",
      fontSize: 8.5,
      alignment: "right",
      bold: hStag > 0,
    },
  ];
}

export function bpfCerfaPdf(data: BpfCerfaInput, opts?: { branding?: PdfBranding }): any {
  return {
    content: [
      ...header(`Cerfa 10443*17 — Année ${data.annee}`, opts?.branding),

      {
        text: "Bilan Pédagogique et Financier",
        style: "sectionTitle",
        fontSize: 16,
        alignment: "center",
        margin: [0, 0, 0, 4],
      },
      {
        text: "Formulaire Cerfa 10443*17 — données pré-remplies par le système",
        fontSize: 8,
        italics: true,
        color: "#888888",
        alignment: "center",
        margin: [0, 0, 0, 12],
      },

      // ============ CADRE A ============
      {
        text: "Cadre A — Identification du dispensateur de formation",
        style: "subheader",
        fillColor: COLORS.primary,
        color: "#ffffff",
        padding: 4,
        margin: [0, 0, 0, 4],
      },
      {
        table: {
          widths: ["35%", "65%"],
          body: [
            [
              { text: "1. Raison sociale", fontSize: 9, bold: true },
              { text: data.raisonSociale || "—", fontSize: 9 },
            ],
            [
              { text: "2. Adresse", fontSize: 9, bold: true },
              { text: data.adresse || "—", fontSize: 9 },
            ],
            [
              { text: "3. Code postal — Ville", fontSize: 9, bold: true },
              {
                text: `${data.codePostal || ""} ${data.ville || ""}`.trim() || "—",
                fontSize: 9,
              },
            ],
            [
              { text: "4. Téléphone / Courriel", fontSize: 9, bold: true },
              {
                text: `${data.telephone || "—"} / ${data.email || "—"}`,
                fontSize: 9,
              },
            ],
            [
              { text: "5. N° SIRET", fontSize: 9, bold: true },
              { text: data.siret || "—", fontSize: 9, fontFamily: "Courier" },
            ],
            [
              { text: "6. N° de déclaration d'activité (NDA)", fontSize: 9, bold: true },
              { text: data.nda || "—", fontSize: 9, fontFamily: "Courier" },
            ],
            [
              { text: "7. Nature juridique", fontSize: 9, bold: true },
              { text: data.natureJuridique || "À compléter", fontSize: 9, color: "#999999" },
            ],
          ],
        },
        layout: "lightHorizontalLines",
        margin: [0, 0, 0, 14],
      },

      // ============ CADRE B ============
      {
        text: "Cadre B — Bilan financier (produits)",
        style: "subheader",
        fillColor: COLORS.primary,
        color: "#ffffff",
        padding: 4,
        margin: [0, 0, 0, 4],
      },
      {
        table: {
          widths: [40, "*", 100],
          body: [
            [
              { text: "N°", fontSize: 8, bold: true, alignment: "center" },
              { text: "Origine du produit", fontSize: 8, bold: true },
              { text: "Montant HT", fontSize: 8, bold: true, alignment: "right" },
            ],
            moneyRow(
              "B1",
              "Entreprises pour la formation de leurs salariés",
              data.produits.b1_entreprises,
            ),
            moneyRow(
              "B2",
              "Organismes paritaires agréés (OPCO)",
              data.produits.b2_opco,
            ),
            moneyRow("B3a", "Pouvoirs publics — État", data.produits.b3_etat),
            moneyRow("B3b", "Pouvoirs publics — Régions", data.produits.b3_regions),
            moneyRow(
              "B3c",
              "France Travail (ex Pôle emploi)",
              data.produits.b3_franceTravail,
            ),
            moneyRow("B3d", "Autres pouvoirs publics", data.produits.b3_autres),
            moneyRow(
              "B4",
              "Personnes individuelles à leurs frais",
              data.produits.b4_particuliers,
            ),
            moneyRow(
              "B5",
              "Sous-traitance / co-traitance reçue d'autres OF",
              data.produits.b5_autresOF,
            ),
            moneyRow(
              "B6",
              "Produits annexes (ventes outils pédagogiques, etc.)",
              data.produits.b6_annexes,
            ),
            [
              {
                text: "B7",
                fontSize: 9,
                bold: true,
                color: "#ffffff",
                fillColor: COLORS.primary,
                alignment: "center",
              },
              {
                text: "TOTAL PRODUITS HT",
                fontSize: 9,
                bold: true,
                fillColor: COLORS.primary,
                color: "#ffffff",
              },
              {
                text: fmtCurrency(data.produits.b7_total),
                fontSize: 10,
                bold: true,
                alignment: "right",
                fillColor: COLORS.primary,
                color: "#ffffff",
              },
            ],
          ],
        },
        layout: "lightHorizontalLines",
        margin: [0, 0, 0, 14],
      },

      // ============ CADRE C — Charges ============
      {
        text: "Cadre C — Bilan financier (charges)",
        style: "subheader",
        fillColor: COLORS.primary,
        color: "#ffffff",
        padding: 4,
        margin: [0, 0, 0, 4],
      },
      {
        text:
          "⚠ Les charges détaillées ne sont pas suivies en base — à compléter manuellement avant télédéclaration.",
        fontSize: 8,
        italics: true,
        color: "#c97a00",
        margin: [0, 0, 0, 4],
      },
      {
        table: {
          widths: [40, "*", 100],
          body: [
            [
              { text: "N°", fontSize: 8, bold: true, alignment: "center" },
              { text: "Nature des charges", fontSize: 8, bold: true },
              { text: "Montant HT", fontSize: 8, bold: true, alignment: "right" },
            ],
            moneyRow("C1", "Achats consommables et fournitures", data.charges.c1_achats),
            moneyRow(
              "C2",
              "Services extérieurs (loyers, transport, formateurs)",
              data.charges.c2_services,
            ),
            moneyRow("C3", "Autres charges externes", data.charges.c3_autresCharges),
            moneyRow("C4", "Impôts et taxes", data.charges.c4_impots),
            moneyRow("C5", "Salaires et charges sociales", data.charges.c5_salaires),
            moneyRow("C6", "Autres charges", data.charges.c6_autres),
            [
              {
                text: "C7",
                fontSize: 9,
                bold: true,
                color: "#ffffff",
                fillColor: COLORS.primary,
                alignment: "center",
              },
              {
                text: "TOTAL CHARGES",
                fontSize: 9,
                bold: true,
                fillColor: COLORS.primary,
                color: "#ffffff",
              },
              {
                text: fmtCurrency(data.charges.c7_total),
                fontSize: 10,
                bold: true,
                alignment: "right",
                fillColor: COLORS.primary,
                color: "#ffffff",
              },
            ],
          ],
        },
        layout: "lightHorizontalLines",
        margin: [0, 0, 0, 14],
        pageBreak: "after",
      },

      // ============ CADRE D — Pédagogique ============
      {
        text: "Cadre D — Bilan pédagogique",
        style: "subheader",
        fillColor: COLORS.primary,
        color: "#ffffff",
        padding: 4,
        margin: [0, 0, 0, 4],
      },

      // Par catégorie de stagiaires
      {
        text: "D1. Stagiaires et heures-stagiaires par catégorie",
        fontSize: 10,
        bold: true,
        margin: [0, 4, 0, 4],
      },
      {
        table: {
          widths: ["*", 80, 100],
          body: [
            [
              { text: "Catégorie", fontSize: 9, bold: true },
              { text: "Nb stagiaires", fontSize: 9, bold: true, alignment: "right" },
              { text: "Heures-stag.", fontSize: 9, bold: true, alignment: "right" },
            ],
            [
              { text: "Salariés (entreprises)", fontSize: 9 },
              { text: String(data.pedagogique.d_salaries), fontSize: 9, alignment: "right" },
              { text: String(data.pedagogique.d_hSalaries), fontSize: 9, alignment: "right" },
            ],
            [
              { text: "Demandeurs d'emploi", fontSize: 9 },
              {
                text: String(data.pedagogique.d_demandeursEmploi),
                fontSize: 9,
                alignment: "right",
              },
              {
                text: String(data.pedagogique.d_hDemandeursEmploi),
                fontSize: 9,
                alignment: "right",
              },
            ],
            [
              { text: "Particuliers (à leurs frais)", fontSize: 9 },
              {
                text: String(data.pedagogique.d_particuliers),
                fontSize: 9,
                alignment: "right",
              },
              {
                text: String(data.pedagogique.d_hParticuliers),
                fontSize: 9,
                alignment: "right",
              },
            ],
            [
              { text: "Autres", fontSize: 9 },
              { text: String(data.pedagogique.d_autres), fontSize: 9, alignment: "right" },
              { text: String(data.pedagogique.d_hAutres), fontSize: 9, alignment: "right" },
            ],
          ],
        },
        layout: "lightHorizontalLines",
        margin: [0, 0, 0, 10],
      },

      // Par type d'action
      {
        text: "D2. Heures-stagiaires par type d'action de formation",
        fontSize: 10,
        bold: true,
        margin: [0, 4, 0, 4],
      },
      {
        table: {
          widths: ["*", 100],
          body: [
            [
              { text: "Type d'action", fontSize: 9, bold: true },
              { text: "Heures-stag.", fontSize: 9, bold: true, alignment: "right" },
            ],
            pedRow("1. Adaptation et développement des compétences", data.pedagogique.typeActions.adaptation),
            pedRow("2. Promotion professionnelle", data.pedagogique.typeActions.promotion),
            pedRow("3. Prévention", data.pedagogique.typeActions.prevention),
            pedRow("4. Conversion", data.pedagogique.typeActions.conversion),
            pedRow("5. Acquisition, entretien et perfectionnement", data.pedagogique.typeActions.acquisition),
            pedRow("6. Qualification professionnelle", data.pedagogique.typeActions.qualification),
            pedRow("7. Apprentissage (CFA)", data.pedagogique.typeActions.apprentissage),
            pedRow("8. Contrat de professionnalisation", data.pedagogique.typeActions.professionnalisation),
            pedRow("9. Compte personnel de formation (CPF)", data.pedagogique.typeActions.cpf),
            pedRow("10. Validation des acquis (VAE)", data.pedagogique.typeActions.vae),
            pedRow("11. Bilan de compétences", data.pedagogique.typeActions.bilanCompetences),
          ],
        },
        layout: "lightHorizontalLines",
        margin: [0, 0, 0, 14],
      },

      {
        text:
          "Ce document reprend la structure du Cerfa 10443*17. Il sert de support pour la télédéclaration sur Démarches Simplifiées (Bilan Pédagogique et Financier). Les sections marquées « à compléter » nécessitent une saisie manuelle.",
        fontSize: 8,
        italics: true,
        color: "#666666",
        margin: [0, 12, 0, 0],
      },
    ],
    footer: footer(),
    styles: defaultStyles,
    defaultStyle: { font: "Roboto" },
    pageMargins: [40, 60, 40, 50],
    pageSize: "A4",
  };
}
