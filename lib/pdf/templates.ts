/* eslint-disable @typescript-eslint/no-explicit-any */

const COLORS = {
  primary: "#2563eb",
  dark: "#1e293b",
  gray: "#64748b",
  light: "#f1f5f9",
};

function header(title: string) {
  return [
    {
      columns: [
        {
          text: "FormaPro",
          style: "brand",
          width: "auto",
        },
        {
          text: title,
          style: "docTitle",
          alignment: "right" as const,
        },
      ],
      margin: [0, 0, 0, 20] as [number, number, number, number],
    },
    { canvas: [{ type: "line" as const, x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 2, lineColor: COLORS.primary }], margin: [0, 0, 0, 20] as [number, number, number, number] },
  ];
}

function footer() {
  return {
    text: "FormaPro - Plateforme de Gestion de Formation",
    style: "footer",
    alignment: "center" as const,
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
              { text: "FormaPro", style: "value", bold: true },
              { text: "Organisme de formation declare", style: "value" },
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
            [{ text: "Intitule", style: "label" }, { text: data.formation.titre, style: "value", bold: true }],
            [{ text: "Duree", style: "label" }, { text: `${data.formation.duree} heures`, style: "value" }],
            [{ text: "Dates", style: "label" }, { text: `Du ${data.session.dateDebut} au ${data.session.dateFin}`, style: "value" }],
            [{ text: "Lieu", style: "label" }, { text: data.session.lieu || "A definir", style: "value" }],
          ],
        },
        layout: "lightHorizontalLines",
        margin: [0, 0, 0, 15] as [number, number, number, number],
      },
      data.formation.objectifs ? { text: "OBJECTIFS", style: "sectionTitle" } : {},
      data.formation.objectifs ? { text: data.formation.objectifs, style: "value", margin: [0, 0, 0, 15] as [number, number, number, number] } : {},
      { text: "CONDITIONS FINANCIERES", style: "sectionTitle" },
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
              { text: "FormaPro", style: "value", margin: [0, 5, 0, 0] as [number, number, number, number] },
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
        text: "Nous soussignes, FormaPro, organisme de formation, attestons que :",
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
        text: "a suivi avec assiduite la formation suivante :",
        style: "value",
        margin: [0, 0, 0, 15] as [number, number, number, number],
      },
      {
        table: {
          widths: ["35%", "65%"],
          body: [
            [{ text: "Formation", bold: true, style: "value" }, { text: data.formation.titre, style: "value" }],
            [{ text: "Duree", bold: true, style: "value" }, { text: `${data.formation.duree} heures`, style: "value" }],
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
        text: `Fait a Paris, le ${data.dateGeneration}`,
        style: "value",
        margin: [0, 30, 0, 5] as [number, number, number, number],
      },
      { text: "Pour FormaPro", style: "label" },
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
        text: `Objet : Convocation a la formation "${data.formation.titre}"`,
        style: "value",
        bold: true,
        margin: [0, 0, 0, 15] as [number, number, number, number],
      },
      {
        text: `Madame, Monsieur,\n\nNous avons le plaisir de vous confirmer votre inscription a la formation mentionnee ci-dessous :`,
        style: "value",
        margin: [0, 0, 0, 15] as [number, number, number, number],
      },
      {
        table: {
          widths: ["35%", "65%"],
          body: [
            [{ text: "Formation", bold: true, style: "value" }, { text: data.formation.titre, style: "value" }],
            [{ text: "Duree", bold: true, style: "value" }, { text: `${data.formation.duree} heures`, style: "value" }],
            [{ text: "Dates", bold: true, style: "value" }, { text: `Du ${data.session.dateDebut} au ${data.session.dateFin}`, style: "value" }],
            [{ text: "Lieu", bold: true, style: "value" }, { text: data.session.lieu || "A confirmer", style: "value" }],
            ...(data.formateur ? [[{ text: "Formateur", bold: true, style: "value" }, { text: `${data.formateur.prenom} ${data.formateur.nom}`, style: "value" }]] : []),
            [{ text: "Horaires", bold: true, style: "value" }, { text: "9h00 - 12h30 / 14h00 - 17h30", style: "value" }],
          ],
        },
        layout: "lightHorizontalLines",
        margin: [0, 0, 0, 20] as [number, number, number, number],
      },
      {
        text: "Nous vous prions de bien vouloir vous presenter 15 minutes avant le debut de la formation muni(e) de cette convocation.\n\nNous restons a votre disposition pour toute information complementaire.",
        style: "value",
        margin: [0, 0, 0, 20] as [number, number, number, number],
      },
      { text: "Cordialement,", style: "value" },
      { text: "L'equipe FormaPro", style: "value", bold: true, margin: [0, 5, 0, 0] as [number, number, number, number] },
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
    { text: "Nom Prenom", style: "tableHeader" },
    ...data.dates.flatMap((d) => [
      { text: `${d}\nMatin`, style: "tableHeader", alignment: "center" as const },
      { text: `${d}\nApres-midi`, style: "tableHeader", alignment: "center" as const },
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
      ...header("FEUILLE DE PRESENCE"),
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
        text: "Emargement (signature obligatoire)",
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
