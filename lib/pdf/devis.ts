/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  COLORS,
  LOGO_BASE64,
  fmtCurrency,
  fmtDate,
  signatureBlock,
  stylesFor,
  type PdfOpts,
} from "./shared";

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
}, opts?: PdfOpts): any {
  const branding = opts?.branding;
  const tpl = opts?.template;
  const primary = branding?.couleurPrimaire || COLORS.primary;
  const logo = branding?.logoBase64 || LOGO_BASE64;
  const montantTVA = data.montantHT * (data.tauxTVA / 100);
  const societe = data.societe;
  const nomSociete = societe?.nom || branding?.nomEntreprise || "RFC - Rescue Formation Conseil";

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
            image: logo,
            fit: [65, 65] as [number, number],
          },
          { width: "*", text: "" },
          {
            width: "auto",
            stack: [
              { text: (tpl?.titre || "DEVIS").toUpperCase(), fontSize: 26, bold: true, color: COLORS.dark, alignment: "right" as const },
              { text: `Numéro : ${data.numero}`, fontSize: 10, color: COLORS.dark, alignment: "right" as const, margin: [0, 4, 0, 2] as [number, number, number, number] },
              { text: `Date d'émission : ${fmtDate(data.dateEmission)}`, fontSize: 10, color: COLORS.dark, alignment: "right" as const },
              { text: `Valable jusqu'au : ${fmtDate(data.dateValidite)}`, fontSize: 10, color: COLORS.gray, alignment: "right" as const },
            ],
          },
        ],
        margin: [0, 0, 0, 15] as [number, number, number, number],
      },
      { canvas: [{ type: "line" as const, x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1.5, lineColor: primary }], margin: [0, 0, 0, 15] as [number, number, number, number] },

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
        { titre: `Pour ${nomSociete}`, nom: nomSociete },
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
    styles: stylesFor(branding),
    defaultStyle: { font: "Roboto" },
  };
}
