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
            { text: "RFC", fontSize: 22, bold: true, color: "#000000", margin: [0, 2, 0, 0] as [number, number, number, number] },
            { text: "RESCUE FORMATION CONSEIL", fontSize: 8, bold: true, color: "#000000", margin: [0, 1, 0, 0] as [number, number, number, number] },
            { text: "Sécurité - Incendie - Prévention", fontSize: 7, color: "#333333" },
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
      { text: "RFC - Rescue Formation Conseil | Sécurité - Incendie - Prévention", fontSize: 8, color: "#333333", alignment: "center" as const },
      { text: "www.rescueformation83.fr", fontSize: 8, color: "#333333", alignment: "center" as const, margin: [0, 2, 0, 0] as [number, number, number, number] },
    ],
    margin: [0, 20, 0, 0] as [number, number, number, number],
  };
}

/**
 * Bloc signature réutilisable.
 * @param left  { titre, nom } — signataire gauche (ex. RFC / Le Directeur)
 * @param right { titre, nom } — signataire droit (ex. Client / Bon pour accord) — optionnel
 */
function signatureBlock(
  left: { titre: string; nom?: string },
  right?: { titre: string; nom?: string }
) {
  const bloc = (s: { titre: string; nom?: string }) => ({
    stack: [
      { text: s.titre, fontSize: 9, bold: true, color: COLORS.dark },
      ...(s.nom ? [{ text: s.nom, fontSize: 9, color: COLORS.gray, margin: [0, 1, 0, 0] as [number, number, number, number] }] : []),
      { text: "Date : ___________________________", fontSize: 9, color: COLORS.gray, margin: [0, 16, 0, 0] as [number, number, number, number] },
      {
        canvas: [{ type: "rect" as const, x: 0, y: 0, w: 180, h: 55, r: 4, lineColor: "#cccccc", lineWidth: 0.5 }],
        margin: [0, 6, 0, 0] as [number, number, number, number],
      },
      { text: "Signature", fontSize: 8, color: "#aaaaaa", margin: [6, -50, 0, 0] as [number, number, number, number] },
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
      signatureBlock(
        { titre: "Pour l'organisme de formation", nom: info[0] },
        { titre: "Pour le client", nom: data.entreprise.nom }
      ),
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
      { text: `Fait à Toulon, le ${data.dateGeneration}`, style: "value", margin: [0, 20, 0, 0] as [number, number, number, number] },
      signatureBlock(
        { titre: "Pour RFC - Rescue Formation Conseil", nom: "Le Directeur" },
        { titre: "Signature du stagiaire", nom: `${data.stagiaire.prenom} ${data.stagiaire.nom}` }
      ),
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
      signatureBlock(
        { titre: "Pour RFC - Rescue Formation Conseil" },
        { titre: "Accusé de réception du stagiaire", nom: `${data.stagiaire.prenom} ${data.stagiaire.nom}` }
      ),
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
  societe?: {
    nom: string; slogan?: string; adresse?: string; codePostal?: string; ville?: string;
    telephone?: string; email?: string; siret?: string; nda?: string; tvaIntracom?: string;
    conditionsPaiement?: string; mentionsDevis?: string;
  };
  entreprise?: { nom: string; adresse?: string; ville?: string; codePostal?: string; siret?: string; email?: string; telephone?: string };
  contact?: { nom: string; prenom: string; email: string };
  lignes: { designation: string; quantite: number; prixUnitaire: number; montant: number }[];
  montantHT: number;
  tauxTVA: number;
  montantTTC: number;
  notes?: string;
}): any {
  const montantTVA = data.montantHT * (data.tauxTVA / 100);
  const societe = data.societe;
  const nomSociete = societe?.nom || "RFC - Rescue Formation Conseil";

  // Build emetteur lines
  const emetteurLines: any[] = [
    { text: nomSociete, fontSize: 10, bold: true, color: COLORS.dark },
  ];
  if (societe?.slogan) emetteurLines.push({ text: societe.slogan, fontSize: 9, color: COLORS.gray });
  if (societe?.adresse) emetteurLines.push({ text: societe.adresse, fontSize: 9, color: COLORS.dark });
  if (societe?.codePostal || societe?.ville) emetteurLines.push({ text: [societe?.codePostal, societe?.ville].filter(Boolean).join(" "), fontSize: 9, color: COLORS.dark });
  if (societe?.telephone) emetteurLines.push({ text: `Tél : ${societe.telephone}`, fontSize: 9, color: COLORS.dark });
  if (societe?.email) emetteurLines.push({ text: `Mail : ${societe.email}`, fontSize: 9, color: COLORS.dark });
  if (societe?.siret) emetteurLines.push({ text: `SIRET : ${societe.siret}`, fontSize: 9, color: COLORS.dark });
  if (societe?.nda) emetteurLines.push({ text: `NDA : ${societe.nda}`, fontSize: 9, color: COLORS.dark });

  // Build client lines
  const clientLines: any[] = [];
  if (data.entreprise) {
    clientLines.push({ text: data.entreprise.nom, fontSize: 10, bold: true, color: COLORS.dark });
    if (data.contact) clientLines.push({ text: `${data.contact.prenom} ${data.contact.nom}`, fontSize: 9, color: COLORS.dark });
    if (data.entreprise.adresse) clientLines.push({ text: data.entreprise.adresse, fontSize: 9, color: COLORS.dark });
    if (data.entreprise.codePostal || data.entreprise.ville) clientLines.push({ text: [data.entreprise.codePostal, data.entreprise.ville].filter(Boolean).join(" "), fontSize: 9, color: COLORS.dark });
    if (data.entreprise.telephone) clientLines.push({ text: `Tél : ${data.entreprise.telephone}`, fontSize: 9, color: COLORS.dark });
    if (data.entreprise.email) clientLines.push({ text: `Mail : ${data.entreprise.email}`, fontSize: 9, color: COLORS.dark });
    if (data.entreprise.siret) clientLines.push({ text: `SIRET : ${data.entreprise.siret}`, fontSize: 9, color: COLORS.dark });
  } else if (data.contact) {
    clientLines.push({ text: `${data.contact.prenom} ${data.contact.nom}`, fontSize: 10, bold: true, color: COLORS.dark });
    clientLines.push({ text: data.contact.email, fontSize: 9, color: COLORS.dark });
  } else {
    clientLines.push({ text: "Client non renseigné", fontSize: 9, color: COLORS.gray, italics: true });
  }

  const condPaiement = societe?.conditionsPaiement || "Paiement à 30 jours à compter de la date de facturation.";
  const mentions = societe?.mentionsDevis || "Devis valable 30 jours.";

  // Footer text
  const footerParts: string[] = [nomSociete];
  if (societe?.tvaIntracom) footerParts.push(`N°TVA Intracommunautaire : ${societe.tvaIntracom}`);
  if (societe?.nda) footerParts.push(`NDA : ${societe.nda}`);
  const footerText = footerParts.join("  |  ");

  return {
    pageMargins: [40, 40, 40, 60] as [number, number, number, number],
    content: [
      // ── HEADER : logo gauche / titre droite ──
      {
        columns: [
          {
            width: 70,
            image: LOGO_BASE64,
            fit: [65, 65] as [number, number],
          },
          { width: "*", text: "" },
          {
            width: "auto",
            stack: [
              { text: "DEVIS", fontSize: 26, bold: true, color: COLORS.dark, alignment: "right" as const },
              { text: `Numéro : ${data.numero}`, fontSize: 10, color: COLORS.dark, alignment: "right" as const, margin: [0, 4, 0, 2] as [number, number, number, number] },
              { text: `Date d'émission : ${fmtDate(data.dateEmission)}`, fontSize: 10, color: COLORS.dark, alignment: "right" as const },
              { text: `Valable jusqu'au : ${fmtDate(data.dateValidite)}`, fontSize: 10, color: COLORS.gray, alignment: "right" as const },
            ],
          },
        ],
        margin: [0, 0, 0, 15] as [number, number, number, number],
      },
      { canvas: [{ type: "line" as const, x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1.5, lineColor: COLORS.primary }], margin: [0, 0, 0, 15] as [number, number, number, number] },

      // ── EMETTEUR / CLIENT ──
      {
        columns: [
          {
            width: "48%",
            table: {
              widths: ["*"],
              body: [[{
                stack: emetteurLines,
                fillColor: "#f0f0f0",
                border: [false, false, false, false],
                margin: [8, 8, 8, 8] as [number, number, number, number],
              }]],
            },
            layout: "noBorders",
          },
          { width: "4%", text: "" },
          {
            width: "48%",
            table: {
              widths: ["*"],
              body: [[{
                stack: [
                  { text: "Client :", fontSize: 10, bold: true, color: COLORS.dark },
                  ...clientLines,
                ],
                fillColor: "#f0f0f0",
                border: [false, false, false, false],
                margin: [8, 8, 8, 8] as [number, number, number, number],
              }]],
            },
            layout: "noBorders",
          },
        ],
        margin: [0, 0, 0, 15] as [number, number, number, number],
      },

      // ── INFOS ADDITIONNELLES ──
      ...(data.notes ? [
        { text: "Informations additionnelles", fontSize: 11, bold: true, color: COLORS.dark, margin: [0, 0, 0, 4] as [number, number, number, number] },
        { text: data.notes, fontSize: 9, color: COLORS.dark, margin: [0, 0, 0, 10] as [number, number, number, number] },
      ] : []),

      // ── OBJET ──
      { text: `Objet : ${data.objet}`, fontSize: 10, bold: true, color: COLORS.dark, margin: [0, 0, 0, 12] as [number, number, number, number] },

      // ── TABLEAU LIGNES ──
      {
        table: {
          headerRows: 1,
          widths: ["*", 45, 75, 55, 60],
          body: [
            [
              { text: "Désignation", fontSize: 9, bold: true, color: "#ffffff", fillColor: COLORS.dark, alignment: "left" as const, margin: [4, 4, 4, 4] as [number, number, number, number] },
              { text: "Quantité", fontSize: 9, bold: true, color: "#ffffff", fillColor: COLORS.dark, alignment: "center" as const, margin: [2, 4, 2, 4] as [number, number, number, number] },
              { text: "Prix unit. HT", fontSize: 9, bold: true, color: "#ffffff", fillColor: COLORS.dark, alignment: "right" as const, margin: [2, 4, 4, 4] as [number, number, number, number] },
              { text: `Total TVA ${data.tauxTVA}%`, fontSize: 9, bold: true, color: "#ffffff", fillColor: COLORS.dark, alignment: "right" as const, margin: [2, 4, 4, 4] as [number, number, number, number] },
              { text: "Total HT", fontSize: 9, bold: true, color: "#ffffff", fillColor: COLORS.dark, alignment: "right" as const, margin: [2, 4, 4, 4] as [number, number, number, number] },
            ],
            ...data.lignes.map((l, i) => {
              const tva = l.montant * (data.tauxTVA / 100);
              const bg = i % 2 === 0 ? "#ffffff" : "#fafafa";
              return [
                { text: l.designation, fontSize: 9, color: COLORS.dark, fillColor: bg, margin: [4, 4, 4, 4] as [number, number, number, number] },
                { text: l.quantite.toString(), fontSize: 9, color: COLORS.dark, fillColor: bg, alignment: "center" as const, margin: [2, 4, 2, 4] as [number, number, number, number] },
                { text: fmtCurrency(l.prixUnitaire), fontSize: 9, color: COLORS.dark, fillColor: bg, alignment: "right" as const, margin: [2, 4, 4, 4] as [number, number, number, number] },
                { text: fmtCurrency(tva), fontSize: 9, color: COLORS.dark, fillColor: bg, alignment: "right" as const, margin: [2, 4, 4, 4] as [number, number, number, number] },
                { text: fmtCurrency(l.montant), fontSize: 9, color: COLORS.dark, fillColor: bg, alignment: "right" as const, margin: [2, 4, 4, 4] as [number, number, number, number] },
              ];
            }),
          ],
        },
        layout: {
          hLineWidth: () => 0.3,
          vLineWidth: () => 0.3,
          hLineColor: () => "#cccccc",
          vLineColor: () => "#cccccc",
        },
        margin: [0, 0, 0, 15] as [number, number, number, number],
      },

      // ── CONDITIONS + TOTAUX ──
      {
        columns: [
          {
            width: "55%",
            stack: [
              { text: "Conditions de règlement :", fontSize: 10, bold: true, color: COLORS.dark, margin: [0, 0, 0, 4] as [number, number, number, number] },
              { text: condPaiement, fontSize: 9, color: COLORS.dark },
              ...(mentions ? [{ text: mentions, fontSize: 9, color: COLORS.gray, margin: [0, 4, 0, 0] as [number, number, number, number] }] : []),
            ],
          },
          { width: "5%", text: "" },
          {
            width: "40%",
            table: {
              widths: ["*", 80],
              body: [
                [
                  { text: "Total HT", fontSize: 9, color: COLORS.dark, margin: [6, 4, 4, 4] as [number, number, number, number] },
                  { text: fmtCurrency(data.montantHT), fontSize: 9, color: COLORS.dark, alignment: "right" as const, margin: [4, 4, 6, 4] as [number, number, number, number] },
                ],
                [
                  { text: `Total TVA (${data.tauxTVA}%)`, fontSize: 9, color: COLORS.dark, margin: [6, 4, 4, 4] as [number, number, number, number] },
                  { text: fmtCurrency(montantTVA), fontSize: 9, color: COLORS.dark, alignment: "right" as const, margin: [4, 4, 6, 4] as [number, number, number, number] },
                ],
                [
                  { text: "Net à payer", fontSize: 10, bold: true, color: "#ffffff", fillColor: COLORS.dark, margin: [6, 5, 4, 5] as [number, number, number, number] },
                  { text: fmtCurrency(data.montantTTC), fontSize: 10, bold: true, color: "#ffffff", fillColor: COLORS.dark, alignment: "right" as const, margin: [4, 5, 6, 5] as [number, number, number, number] },
                ],
              ],
            },
            layout: {
              hLineWidth: () => 0.3,
              vLineWidth: () => 0.3,
              hLineColor: () => "#cccccc",
              vLineColor: () => "#cccccc",
            },
          },
        ],
        margin: [0, 0, 0, 20] as [number, number, number, number],
      },

      // ── SIGNATURE ──
      signatureBlock(
        { titre: "Pour RFC - Rescue Formation Conseil", nom: nomSociete },
        { titre: "Bon pour accord — Client", nom: data.entreprise?.nom || data.contact ? `${data.contact?.prenom} ${data.contact?.nom}` : undefined }
      ),
    ],
    footer: (_currentPage: number, _pageCount: number) => ({
      text: footerText,
      fontSize: 8,
      color: COLORS.gray,
      alignment: "center" as const,
      margin: [40, 10, 40, 0] as [number, number, number, number],
    }),
    styles: defaultStyles,
    defaultStyle: { font: "Roboto" },
  };
}

// ==================== FACTURE ====================
export function facturePdf(data: {
  numero: string;
  dateEmission: string;
  dateEcheance: string;
  societe?: {
    nom: string; slogan?: string; adresse?: string; codePostal?: string; ville?: string;
    telephone?: string; email?: string; siret?: string; nda?: string; tvaIntracom?: string;
    conditionsPaiement?: string; mentionsFacture?: string;
  };
  entreprise?: { nom: string; adresse?: string; ville?: string; codePostal?: string; siret?: string; email?: string; telephone?: string };
  contact?: { nom: string; prenom: string; email: string };
  lignes: { designation: string; quantite: number; prixUnitaire: number; montant: number }[];
  montantHT: number;
  tauxTVA: number;
  montantTTC: number;
  notes?: string;
  devisNumero?: string;
}): any {
  const montantTVA = data.montantHT * (data.tauxTVA / 100);
  const societe = data.societe;
  const nomSociete = societe?.nom || "RFC - Rescue Formation Conseil";

  const emetteurLines: any[] = [
    { text: nomSociete, fontSize: 10, bold: true, color: COLORS.dark },
  ];
  if (societe?.slogan) emetteurLines.push({ text: societe.slogan, fontSize: 9, color: COLORS.gray });
  if (societe?.adresse) emetteurLines.push({ text: societe.adresse, fontSize: 9, color: COLORS.dark });
  if (societe?.codePostal || societe?.ville) emetteurLines.push({ text: [societe?.codePostal, societe?.ville].filter(Boolean).join(" "), fontSize: 9, color: COLORS.dark });
  if (societe?.telephone) emetteurLines.push({ text: `Tél : ${societe.telephone}`, fontSize: 9, color: COLORS.dark });
  if (societe?.email) emetteurLines.push({ text: `Mail : ${societe.email}`, fontSize: 9, color: COLORS.dark });
  if (societe?.siret) emetteurLines.push({ text: `SIRET : ${societe.siret}`, fontSize: 9, color: COLORS.dark });
  if (societe?.nda) emetteurLines.push({ text: `NDA : ${societe.nda}`, fontSize: 9, color: COLORS.dark });

  const clientLines: any[] = [];
  if (data.entreprise) {
    clientLines.push({ text: data.entreprise.nom, fontSize: 10, bold: true, color: COLORS.dark });
    if (data.contact) clientLines.push({ text: `${data.contact.prenom} ${data.contact.nom}`, fontSize: 9, color: COLORS.dark });
    if (data.entreprise.adresse) clientLines.push({ text: data.entreprise.adresse, fontSize: 9, color: COLORS.dark });
    if (data.entreprise.codePostal || data.entreprise.ville) clientLines.push({ text: [data.entreprise.codePostal, data.entreprise.ville].filter(Boolean).join(" "), fontSize: 9, color: COLORS.dark });
    if (data.entreprise.telephone) clientLines.push({ text: `Tél : ${data.entreprise.telephone}`, fontSize: 9, color: COLORS.dark });
    if (data.entreprise.email) clientLines.push({ text: `Mail : ${data.entreprise.email}`, fontSize: 9, color: COLORS.dark });
    if (data.entreprise.siret) clientLines.push({ text: `SIRET : ${data.entreprise.siret}`, fontSize: 9, color: COLORS.dark });
  } else if (data.contact) {
    clientLines.push({ text: `${data.contact.prenom} ${data.contact.nom}`, fontSize: 10, bold: true, color: COLORS.dark });
    clientLines.push({ text: data.contact.email, fontSize: 9, color: COLORS.dark });
  } else {
    clientLines.push({ text: "Client non renseigné", fontSize: 9, color: COLORS.gray, italics: true });
  }

  const condPaiement = societe?.conditionsPaiement || "Paiement à 30 jours à compter de la date de facturation.";
  const mentions = societe?.mentionsFacture || "En cas de retard de paiement, une pénalité de 3 fois le taux d'intérêt légal sera appliquée.";

  const footerParts: string[] = [nomSociete];
  if (societe?.tvaIntracom) footerParts.push(`N°TVA Intracommunautaire : ${societe.tvaIntracom}`);
  if (societe?.nda) footerParts.push(`NDA : ${societe.nda}`);
  const footerText = footerParts.join("  |  ");

  return {
    pageMargins: [40, 40, 40, 60] as [number, number, number, number],
    content: [
      // ── HEADER ──
      {
        columns: [
          {
            width: 70,
            image: LOGO_BASE64,
            fit: [65, 65] as [number, number],
          },
          { width: "*", text: "" },
          {
            width: "auto",
            stack: [
              { text: "FACTURE", fontSize: 26, bold: true, color: COLORS.dark, alignment: "right" as const },
              { text: `Numéro : ${data.numero}`, fontSize: 10, color: COLORS.dark, alignment: "right" as const, margin: [0, 4, 0, 2] as [number, number, number, number] },
              { text: `Date d'émission : ${fmtDate(data.dateEmission)}`, fontSize: 10, color: COLORS.dark, alignment: "right" as const },
              { text: `Échéance : ${fmtDate(data.dateEcheance)}`, fontSize: 10, color: COLORS.gray, alignment: "right" as const },
              ...(data.devisNumero ? [{ text: `Réf. devis : ${data.devisNumero}`, fontSize: 9, color: COLORS.gray, alignment: "right" as const }] : []),
            ],
          },
        ],
        margin: [0, 0, 0, 15] as [number, number, number, number],
      },
      { canvas: [{ type: "line" as const, x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1.5, lineColor: COLORS.primary }], margin: [0, 0, 0, 15] as [number, number, number, number] },

      // ── EMETTEUR / CLIENT ──
      {
        columns: [
          {
            width: "48%",
            table: {
              widths: ["*"],
              body: [[{
                stack: emetteurLines,
                fillColor: "#f0f0f0",
                border: [false, false, false, false],
                margin: [8, 8, 8, 8] as [number, number, number, number],
              }]],
            },
            layout: "noBorders",
          },
          { width: "4%", text: "" },
          {
            width: "48%",
            table: {
              widths: ["*"],
              body: [[{
                stack: [
                  { text: "Client :", fontSize: 10, bold: true, color: COLORS.dark },
                  ...clientLines,
                ],
                fillColor: "#f0f0f0",
                border: [false, false, false, false],
                margin: [8, 8, 8, 8] as [number, number, number, number],
              }]],
            },
            layout: "noBorders",
          },
        ],
        margin: [0, 0, 0, 15] as [number, number, number, number],
      },

      // ── NOTES ──
      ...(data.notes ? [
        { text: "Informations :", fontSize: 10, bold: true, color: COLORS.dark, margin: [0, 0, 0, 4] as [number, number, number, number] },
        { text: data.notes, fontSize: 9, color: COLORS.dark, margin: [0, 0, 0, 10] as [number, number, number, number] },
      ] : []),

      // ── TABLEAU LIGNES ──
      data.lignes.length > 0
        ? {
            table: {
              headerRows: 1,
              widths: ["*", 45, 75, 55, 60],
              body: [
                [
                  { text: "Désignation", fontSize: 9, bold: true, color: "#ffffff", fillColor: COLORS.dark, alignment: "left" as const, margin: [4, 4, 4, 4] as [number, number, number, number] },
                  { text: "Quantité", fontSize: 9, bold: true, color: "#ffffff", fillColor: COLORS.dark, alignment: "center" as const, margin: [2, 4, 2, 4] as [number, number, number, number] },
                  { text: "Prix unit. HT", fontSize: 9, bold: true, color: "#ffffff", fillColor: COLORS.dark, alignment: "right" as const, margin: [2, 4, 4, 4] as [number, number, number, number] },
                  { text: `Total TVA ${data.tauxTVA}%`, fontSize: 9, bold: true, color: "#ffffff", fillColor: COLORS.dark, alignment: "right" as const, margin: [2, 4, 4, 4] as [number, number, number, number] },
                  { text: "Total HT", fontSize: 9, bold: true, color: "#ffffff", fillColor: COLORS.dark, alignment: "right" as const, margin: [2, 4, 4, 4] as [number, number, number, number] },
                ],
                ...data.lignes.map((l, i) => {
                  const tva = l.montant * (data.tauxTVA / 100);
                  const bg = i % 2 === 0 ? "#ffffff" : "#fafafa";
                  return [
                    { text: l.designation, fontSize: 9, color: COLORS.dark, fillColor: bg, margin: [4, 4, 4, 4] as [number, number, number, number] },
                    { text: l.quantite.toString(), fontSize: 9, color: COLORS.dark, fillColor: bg, alignment: "center" as const, margin: [2, 4, 2, 4] as [number, number, number, number] },
                    { text: fmtCurrency(l.prixUnitaire), fontSize: 9, color: COLORS.dark, fillColor: bg, alignment: "right" as const, margin: [2, 4, 4, 4] as [number, number, number, number] },
                    { text: fmtCurrency(tva), fontSize: 9, color: COLORS.dark, fillColor: bg, alignment: "right" as const, margin: [2, 4, 4, 4] as [number, number, number, number] },
                    { text: fmtCurrency(l.montant), fontSize: 9, color: COLORS.dark, fillColor: bg, alignment: "right" as const, margin: [2, 4, 4, 4] as [number, number, number, number] },
                  ];
                }),
              ],
            },
            layout: {
              hLineWidth: () => 0.3,
              vLineWidth: () => 0.3,
              hLineColor: () => "#cccccc",
              vLineColor: () => "#cccccc",
            },
            margin: [0, 0, 0, 15] as [number, number, number, number],
          }
        : { text: "Aucune prestation renseignée.", fontSize: 9, italics: true, color: COLORS.gray, margin: [0, 0, 0, 15] as [number, number, number, number] },

      // ── CONDITIONS + TOTAUX ──
      {
        columns: [
          {
            width: "55%",
            stack: [
              { text: "Conditions de règlement :", fontSize: 10, bold: true, color: COLORS.dark, margin: [0, 0, 0, 4] as [number, number, number, number] },
              { text: condPaiement, fontSize: 9, color: COLORS.dark },
              { text: mentions, fontSize: 9, color: COLORS.gray, margin: [0, 4, 0, 0] as [number, number, number, number] },
            ],
          },
          { width: "5%", text: "" },
          {
            width: "40%",
            table: {
              widths: ["*", 80],
              body: [
                [
                  { text: "Total HT", fontSize: 9, color: COLORS.dark, margin: [6, 4, 4, 4] as [number, number, number, number] },
                  { text: fmtCurrency(data.montantHT), fontSize: 9, color: COLORS.dark, alignment: "right" as const, margin: [4, 4, 6, 4] as [number, number, number, number] },
                ],
                [
                  { text: `Total TVA (${data.tauxTVA}%)`, fontSize: 9, color: COLORS.dark, margin: [6, 4, 4, 4] as [number, number, number, number] },
                  { text: fmtCurrency(montantTVA), fontSize: 9, color: COLORS.dark, alignment: "right" as const, margin: [4, 4, 6, 4] as [number, number, number, number] },
                ],
                [
                  { text: "Net à payer", fontSize: 10, bold: true, color: "#ffffff", fillColor: COLORS.dark, margin: [6, 5, 4, 5] as [number, number, number, number] },
                  { text: fmtCurrency(data.montantTTC), fontSize: 10, bold: true, color: "#ffffff", fillColor: COLORS.dark, alignment: "right" as const, margin: [4, 5, 6, 5] as [number, number, number, number] },
                ],
              ],
            },
            layout: {
              hLineWidth: () => 0.3,
              vLineWidth: () => 0.3,
              hLineColor: () => "#cccccc",
              vLineColor: () => "#cccccc",
            },
          },
        ],
        margin: [0, 0, 0, 0] as [number, number, number, number],
      },
      // ── SIGNATURE ──
      signatureBlock(
        { titre: "Pour RFC - Rescue Formation Conseil", nom: nomSociete },
        { titre: "Acquitté — Client", nom: data.entreprise?.nom || (data.contact ? `${data.contact.prenom} ${data.contact.nom}` : undefined) }
      ),
    ],
    footer: (_currentPage: number, _pageCount: number) => ({
      text: footerText,
      fontSize: 8,
      color: COLORS.gray,
      alignment: "center" as const,
      margin: [40, 10, 40, 0] as [number, number, number, number],
    }),
    styles: defaultStyles,
    defaultStyle: { font: "Roboto" },
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

// ==================== BILAN PEDAGOGIQUE ET FINANCIER ====================
export function bpfPdf(data: {
  annee: number;
  nbSessions: number;
  nbStagiaires: number;
  nbHeures: number;
  caTotal: number;
  sessions: {
    formation: string;
    dateDebut: string;
    dateFin: string;
    lieu: string;
    formateur: string;
    nbInscrits: number;
    duree: number;
    ca: number;
  }[];
  parCategorie: { categorie: string; sessions: number; stagiaires: number }[];
}): any {
  return {
    content: [
      ...header(`BPF ${data.annee}`),
      { text: `Bilan Pédagogique et Financier - Année ${data.annee}`, style: "sectionTitle" },
      {
        columns: [
          { width: "25%", stack: [{ text: "Sessions", style: "label" }, { text: String(data.nbSessions), fontSize: 20, bold: true, color: COLORS.dark }] },
          { width: "25%", stack: [{ text: "Stagiaires", style: "label" }, { text: String(data.nbStagiaires), fontSize: 20, bold: true, color: COLORS.dark }] },
          { width: "25%", stack: [{ text: "Heures-stag.", style: "label" }, { text: String(data.nbHeures), fontSize: 20, bold: true, color: COLORS.dark }] },
          { width: "25%", stack: [{ text: "CA HT", style: "label" }, { text: fmtCurrency(data.caTotal), fontSize: 20, bold: true, color: COLORS.primary }] },
        ],
        margin: [0, 0, 0, 20] as [number, number, number, number],
      },
      { text: "DÉTAIL DES SESSIONS", style: "sectionTitle" },
      {
        table: {
          headerRows: 1,
          widths: ["*", 55, 55, 30, 40, 55],
          body: [
            [
              { text: "Formation", style: "tableHeader" },
              { text: "Début", style: "tableHeader" },
              { text: "Fin", style: "tableHeader" },
              { text: "Stag.", style: "tableHeader", alignment: "center" as const },
              { text: "Heures", style: "tableHeader", alignment: "center" as const },
              { text: "CA HT", style: "tableHeader", alignment: "right" as const },
            ],
            ...data.sessions.map((s) => [
              { text: s.formation, style: "value" },
              { text: fmtDate(s.dateDebut), style: "value" },
              { text: fmtDate(s.dateFin), style: "value" },
              { text: String(s.nbInscrits), style: "value", alignment: "center" as const },
              { text: String(s.duree), style: "value", alignment: "center" as const },
              { text: fmtCurrency(s.ca), style: "value", alignment: "right" as const },
            ]),
          ],
        },
        layout: "lightHorizontalLines",
        margin: [0, 0, 0, 20] as [number, number, number, number],
      },
      data.parCategorie.length > 0 ? { text: "PAR CATÉGORIE", style: "sectionTitle" } : {},
      data.parCategorie.length > 0 ? {
        table: {
          headerRows: 1,
          widths: ["*", 80, 80],
          body: [
            [{ text: "Catégorie", style: "tableHeader" }, { text: "Sessions", style: "tableHeader", alignment: "center" as const }, { text: "Stagiaires", style: "tableHeader", alignment: "center" as const }],
            ...data.parCategorie.map((c) => [
              { text: c.categorie, style: "value" },
              { text: String(c.sessions), style: "value", alignment: "center" as const },
              { text: String(c.stagiaires), style: "value", alignment: "center" as const },
            ]),
          ],
        },
        layout: "lightHorizontalLines",
      } : {},
      footer(),
    ],
    styles: defaultStyles,
    defaultStyle: { font: "Helvetica" },
  };
}
