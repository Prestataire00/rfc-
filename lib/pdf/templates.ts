/* eslint-disable @typescript-eslint/no-explicit-any */
import { LOGO_BASE64 } from "./logo-base64";

const COLORS = {
  primary: "#C41E24",    // RFC Red
  dark: "#1a1a1a",       // Dark background
  gray: "#666666",
  light: "#f5f5f5",
  white: "#ffffff",
};

function fmtDate(d: string): string {
  const date = new Date(d);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function fmtCurrency(n: number): string {
  return `${n.toFixed(2)} EUR`;
}

function companyInfo(): string[] {
  return [
    "RFC - Rescue Formation Conseil",
    "Sécurité - Incendie - Prévention",
    "www.rescueformation83.fr",
  ];
}

function header(title: string) {
  return [
    {
      columns: [
        {
          width: 60,
          image: LOGO_BASE64,
          fit: [55, 55] as [number, number],
        },
        {
          width: "auto",
          stack: [
            { text: "RFC", fontSize: 22, bold: true, color: COLORS.primary, margin: [0, 2, 0, 0] as [number, number, number, number] },
            { text: "RESCUE FORMATION CONSEIL", fontSize: 8, color: COLORS.gray, margin: [0, 1, 0, 0] as [number, number, number, number] },
            { text: "Sécurité - Incendie - Prévention", fontSize: 7, color: COLORS.gray },
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
    { canvas: [{ type: "line" as const, x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 2, lineColor: COLORS.primary }], margin: [0, 0, 0, 20] as [number, number, number, number] },
  ];
}

function footer() {
  return {
    stack: [
      { text: "RFC - Rescue Formation Conseil | Sécurité - Incendie - Prévention", style: "footer", alignment: "center" as const },
      { text: "www.rescueformation83.fr", style: "footer", alignment: "center" as const, margin: [0, 2, 0, 0] as [number, number, number, number] },
    ],
    margin: [0, 20, 0, 0] as [number, number, number, number],
  };
}

const defaultStyles = {
  brand: { fontSize: 18, bold: true, color: COLORS.primary },
  docTitle: { fontSize: 14, bold: true, color: COLORS.dark },
  sectionTitle: { fontSize: 12, bold: true, color: COLORS.primary, margin: [0, 15, 0, 8] as [number, number, number, number] },
  label: { fontSize: 9, color: COLORS.gray, margin: [0, 2, 0, 0] as [number, number, number, number] },
  value: { fontSize: 10, color: COLORS.dark },
  footer: { fontSize: 8, color: COLORS.gray },
  tableHeader: { fontSize: 9, bold: true, color: "#ffffff", fillColor: COLORS.primary },
};

// ==================== CONVENTION DE FORMATION ====================
export function conventionPdf(data: {
  entreprise: { nom: string; adresse?: string; ville?: string; codePostal?: string; siret?: string };
  formation: { titre: string; duree: number; objectifs?: string };
  session: { dateDebut: string; dateFin: string; lieu?: string };
  montantHT: number;
  montantTTC: number;
  numero: string;
}): any {
  const info = companyInfo();
  return {
    content: [
      ...header("CONVENTION DE FORMATION"),
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
      {
        columns: [
          {
            width: "50%",
            stack: [
              { text: "Pour l'organisme de formation", style: "label" },
              { text: info[0], style: "value", margin: [0, 5, 0, 0] as [number, number, number, number] },
              { text: "Date et signature :", style: "label", margin: [0, 30, 0, 0] as [number, number, number, number] },
            ],
          },
          {
            width: "50%",
            stack: [
              { text: "Pour le client", style: "label" },
              { text: data.entreprise.nom, style: "value", margin: [0, 5, 0, 0] as [number, number, number, number] },
              { text: "Date et signature :", style: "label", margin: [0, 30, 0, 0] as [number, number, number, number] },
            ],
          },
        ],
      },
      footer(),
    ],
    styles: defaultStyles,
    defaultStyle: { font: "Helvetica" },
  };
}

// ==================== ATTESTATION DE FIN DE FORMATION ====================
export function attestationPdf(data: {
  stagiaire: { nom: string; prenom: string };
  formation: { titre: string; duree: number; objectifs?: string };
  session: { dateDebut: string; dateFin: string; lieu?: string };
  formateur?: { nom: string; prenom: string };
  dateGeneration: string;
}): any {
  return {
    content: [
      ...header("ATTESTATION DE FIN DE FORMATION"),
      { text: "\n" },
      {
        text: "ATTESTATION DE FORMATION",
        fontSize: 16,
        bold: true,
        alignment: "center" as const,
        color: COLORS.primary,
        margin: [0, 20, 0, 30] as [number, number, number, number],
      },
      {
        text: "Nous soussignés, RFC - Rescue Formation Conseil, organisme de formation, attestons que :",
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
      {
        text: `Fait à Toulon, le ${data.dateGeneration}`,
        style: "value",
        margin: [0, 30, 0, 5] as [number, number, number, number],
      },
      { text: "Pour RFC - Rescue Formation Conseil", style: "label" },
      { text: "Le Directeur", style: "value", margin: [0, 5, 0, 0] as [number, number, number, number] },
      footer(),
    ],
    styles: defaultStyles,
    defaultStyle: { font: "Helvetica" },
  };
}

// ==================== CONVOCATION ====================
export function convocationPdf(data: {
  stagiaire: { nom: string; prenom: string; email: string };
  formation: { titre: string; duree: number };
  session: { dateDebut: string; dateFin: string; lieu?: string };
  formateur?: { nom: string; prenom: string };
}): any {
  return {
    content: [
      ...header("CONVOCATION"),
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
        text: `Madame, Monsieur,\n\nNous avons le plaisir de vous confirmer votre inscription à la formation mentionnée ci-dessous :`,
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
        text: "Nous vous prions de bien vouloir vous présenter 15 minutes avant le début de la formation muni(e) de cette convocation.\n\nNous restons à votre disposition pour toute information complémentaire.",
        style: "value",
        margin: [0, 0, 0, 20] as [number, number, number, number],
      },
      { text: "Cordialement,", style: "value" },
      { text: "L'équipe RFC - Rescue Formation Conseil", style: "value", bold: true, margin: [0, 5, 0, 0] as [number, number, number, number] },
      footer(),
    ],
    styles: defaultStyles,
    defaultStyle: { font: "Helvetica" },
  };
}

// ==================== DEVIS ====================
export function devisPdf(data: {
  numero: string;
  objet: string;
  dateEmission: string;
  dateValidite: string;
  entreprise?: { nom: string; adresse?: string; ville?: string; codePostal?: string; siret?: string };
  contact?: { nom: string; prenom: string; email: string };
  lignes: { designation: string; quantite: number; prixUnitaire: number; montant: number }[];
  montantHT: number;
  tauxTVA: number;
  montantTTC: number;
  notes?: string;
}): any {
  const montantTVA = data.montantHT * (data.tauxTVA / 100);

  return {
    content: [
      ...header("DEVIS"),
      { text: `Devis N° ${data.numero}`, style: "sectionTitle" },
      {
        columns: [
          {
            width: "50%",
            stack: [
              { text: "EMETTEUR", style: "label" },
              { text: "Rescue Formation Conseil", style: "value", bold: true },
              { text: "Organisme de formation declare", style: "value" },
            ],
          },
          {
            width: "50%",
            stack: [
              { text: "DESTINATAIRE", style: "label" },
              data.entreprise ? { text: data.entreprise.nom, style: "value", bold: true } : {},
              data.entreprise
                ? { text: [data.entreprise.adresse, data.entreprise.codePostal, data.entreprise.ville].filter(Boolean).join(", "), style: "value" }
                : {},
              data.entreprise?.siret ? { text: `SIRET: ${data.entreprise.siret}`, style: "value" } : {},
              data.contact ? { text: `${data.contact.prenom} ${data.contact.nom}`, style: "value", margin: [0, 5, 0, 0] as [number, number, number, number] } : {},
              data.contact ? { text: data.contact.email, style: "value" } : {},
            ],
          },
        ],
        margin: [0, 0, 0, 15] as [number, number, number, number],
      },
      {
        columns: [
          { text: `Objet : ${data.objet}`, style: "value", bold: true, width: "*" },
        ],
        margin: [0, 0, 0, 5] as [number, number, number, number],
      },
      {
        columns: [
          { text: `Date d'emission : ${fmtDate(data.dateEmission)}`, style: "value", width: "50%" },
          { text: `Date de validite : ${fmtDate(data.dateValidite)}`, style: "value", width: "50%" },
        ],
        margin: [0, 0, 0, 15] as [number, number, number, number],
      },
      { text: "DETAIL DES PRESTATIONS", style: "sectionTitle" },
      {
        table: {
          headerRows: 1,
          widths: ["*", 50, 80, 80],
          body: [
            [
              { text: "Designation", style: "tableHeader" },
              { text: "Qte", style: "tableHeader", alignment: "center" as const },
              { text: "Prix unit. HT", style: "tableHeader", alignment: "right" as const },
              { text: "Montant HT", style: "tableHeader", alignment: "right" as const },
            ],
            ...data.lignes.map((l) => [
              { text: l.designation, style: "value" },
              { text: l.quantite.toString(), style: "value", alignment: "center" as const },
              { text: fmtCurrency(l.prixUnitaire), style: "value", alignment: "right" as const },
              { text: fmtCurrency(l.montant), style: "value", alignment: "right" as const },
            ]),
          ],
        },
        layout: {
          hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.5,
          vLineWidth: () => 0,
          hLineColor: (i: number) => (i <= 1 ? COLORS.primary : "#cbd5e1"),
          paddingLeft: () => 6,
          paddingRight: () => 6,
          paddingTop: () => 5,
          paddingBottom: () => 5,
        },
        margin: [0, 0, 0, 15] as [number, number, number, number],
      },
      {
        columns: [
          { text: "", width: "*" },
          {
            width: 220,
            table: {
              widths: ["*", 90],
              body: [
                [{ text: "Total HT", style: "value" }, { text: fmtCurrency(data.montantHT), style: "value", alignment: "right" as const }],
                [{ text: `TVA (${data.tauxTVA}%)`, style: "value" }, { text: fmtCurrency(montantTVA), style: "value", alignment: "right" as const }],
                [{ text: "Total TTC", style: "value", bold: true }, { text: fmtCurrency(data.montantTTC), style: "value", bold: true, alignment: "right" as const }],
              ],
            },
            layout: "lightHorizontalLines",
          },
        ],
        margin: [0, 0, 0, 20] as [number, number, number, number],
      },
      data.notes ? { text: "NOTES", style: "sectionTitle" } : {},
      data.notes ? { text: data.notes, style: "value", margin: [0, 0, 0, 15] as [number, number, number, number] } : {},
      {
        text: "Conditions de reglement : paiement a reception de facture sous 30 jours.",
        style: "value",
        margin: [0, 10, 0, 20] as [number, number, number, number],
      },
      {
        columns: [
          {
            width: "50%",
            stack: [
              { text: "Bon pour accord", style: "label" },
              { text: "Date et signature :", style: "label", margin: [0, 30, 0, 0] as [number, number, number, number] },
            ],
          },
          {
            width: "50%",
            stack: [
              { text: "Rescue Formation Conseil", style: "label" },
              { text: "Date et signature :", style: "label", margin: [0, 30, 0, 0] as [number, number, number, number] },
            ],
          },
        ],
      },
      footer(),
    ],
    styles: defaultStyles,
    defaultStyle: { font: "Helvetica" },
  };
}

// ==================== FACTURE ====================
export function facturePdf(data: {
  numero: string;
  dateEmission: string;
  dateEcheance: string;
  entreprise?: { nom: string; adresse?: string; ville?: string; codePostal?: string; siret?: string };
  contact?: { nom: string; prenom: string; email: string };
  lignes: { designation: string; quantite: number; prixUnitaire: number; montant: number }[];
  montantHT: number;
  tauxTVA: number;
  montantTTC: number;
  notes?: string;
  devisNumero?: string;
}): any {
  const montantTVA = data.montantHT * (data.tauxTVA / 100);

  return {
    content: [
      ...header("FACTURE"),
      { text: `Facture N° ${data.numero}`, style: "sectionTitle" },
      {
        columns: [
          {
            width: "50%",
            stack: [
              { text: "EMETTEUR", style: "label" },
              { text: "Rescue Formation Conseil", style: "value", bold: true },
              { text: "Organisme de formation declare", style: "value" },
            ],
          },
          {
            width: "50%",
            stack: [
              { text: "DESTINATAIRE", style: "label" },
              data.entreprise ? { text: data.entreprise.nom, style: "value", bold: true } : {},
              data.entreprise
                ? { text: [data.entreprise.adresse, data.entreprise.codePostal, data.entreprise.ville].filter(Boolean).join(", "), style: "value" }
                : {},
              data.entreprise?.siret ? { text: `SIRET: ${data.entreprise.siret}`, style: "value" } : {},
              data.contact ? { text: `${data.contact.prenom} ${data.contact.nom}`, style: "value", margin: [0, 5, 0, 0] as [number, number, number, number] } : {},
              data.contact ? { text: data.contact.email, style: "value" } : {},
            ],
          },
        ],
        margin: [0, 0, 0, 15] as [number, number, number, number],
      },
      {
        columns: [
          { text: `Date d'emission : ${fmtDate(data.dateEmission)}`, style: "value", width: "50%" },
          { text: `Date d'echeance : ${fmtDate(data.dateEcheance)}`, style: "value", width: "50%" },
        ],
        margin: [0, 0, 0, 5] as [number, number, number, number],
      },
      data.devisNumero
        ? { text: `Devis de reference : ${data.devisNumero}`, style: "value", margin: [0, 0, 0, 15] as [number, number, number, number] }
        : { text: "", margin: [0, 0, 0, 10] as [number, number, number, number] },
      { text: "DETAIL DES PRESTATIONS", style: "sectionTitle" },
      data.lignes.length > 0
        ? {
            table: {
              headerRows: 1,
              widths: ["*", 50, 80, 80],
              body: [
                [
                  { text: "Designation", style: "tableHeader" },
                  { text: "Qte", style: "tableHeader", alignment: "center" as const },
                  { text: "Prix unit. HT", style: "tableHeader", alignment: "right" as const },
                  { text: "Montant HT", style: "tableHeader", alignment: "right" as const },
                ],
                ...data.lignes.map((l) => [
                  { text: l.designation, style: "value" },
                  { text: l.quantite.toString(), style: "value", alignment: "center" as const },
                  { text: fmtCurrency(l.prixUnitaire), style: "value", alignment: "right" as const },
                  { text: fmtCurrency(l.montant), style: "value", alignment: "right" as const },
                ]),
              ],
            },
            layout: {
              hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.5,
              vLineWidth: () => 0,
              hLineColor: (i: number) => (i <= 1 ? COLORS.primary : "#cbd5e1"),
              paddingLeft: () => 6,
              paddingRight: () => 6,
              paddingTop: () => 5,
              paddingBottom: () => 5,
            },
            margin: [0, 0, 0, 15] as [number, number, number, number],
          }
        : { text: "Aucun detail de lignes disponible", style: "value", italics: true, margin: [0, 0, 0, 15] as [number, number, number, number] },
      {
        columns: [
          { text: "", width: "*" },
          {
            width: 220,
            table: {
              widths: ["*", 90],
              body: [
                [{ text: "Total HT", style: "value" }, { text: fmtCurrency(data.montantHT), style: "value", alignment: "right" as const }],
                [{ text: `TVA (${data.tauxTVA}%)`, style: "value" }, { text: fmtCurrency(montantTVA), style: "value", alignment: "right" as const }],
                [{ text: "Total TTC", style: "value", bold: true }, { text: fmtCurrency(data.montantTTC), style: "value", bold: true, alignment: "right" as const }],
              ],
            },
            layout: "lightHorizontalLines",
          },
        ],
        margin: [0, 0, 0, 20] as [number, number, number, number],
      },
      data.notes ? { text: "NOTES", style: "sectionTitle" } : {},
      data.notes ? { text: data.notes, style: "value", margin: [0, 0, 0, 15] as [number, number, number, number] } : {},
      {
        text: "Conditions de reglement : paiement a reception sous 30 jours.\nEn cas de retard de paiement, des penalites de retard seront appliquees.",
        style: "value",
        margin: [0, 10, 0, 20] as [number, number, number, number],
      },
      footer(),
    ],
    styles: defaultStyles,
    defaultStyle: { font: "Helvetica" },
  };
}

// ==================== FEUILLE DE PRESENCE ====================
export function feuillePresencePdf(data: {
  formation: { titre: string; duree: number };
  session: { dateDebut: string; dateFin: string; lieu?: string };
  formateur?: { nom: string; prenom: string };
  stagiaires: { nom: string; prenom: string }[];
  dates: string[];
}): any {
  const headerRow = [
    { text: "Nom Prénom", style: "tableHeader" },
    ...data.dates.flatMap((d) => [
      { text: `${d}\nMatin`, style: "tableHeader", alignment: "center" as const },
      { text: `${d}\nAprès-midi`, style: "tableHeader", alignment: "center" as const },
    ]),
  ];

  const bodyRows = data.stagiaires.map((s) => [
    { text: `${s.prenom} ${s.nom}`, style: "value", margin: [2, 5, 2, 5] as [number, number, number, number] },
    ...data.dates.flatMap(() => [
      { text: "", margin: [2, 5, 2, 5] as [number, number, number, number] },
      { text: "", margin: [2, 5, 2, 5] as [number, number, number, number] },
    ]),
  ]);

  const colWidths = ["auto", ...data.dates.flatMap(() => ["*", "*"])];

  return {
    pageOrientation: "landscape" as const,
    content: [
      ...header("FEUILLE DE PRÉSENCE"),
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
      footer(),
    ],
    styles: defaultStyles,
    defaultStyle: { font: "Helvetica" },
  };
}
