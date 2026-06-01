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
    // Conformité légale ajoutée en juin 2026 (art. R123-237 / L441-10 / D441-5 C.com,
    // 261-4-4° / 293 B CGI). Tous optionnels pour rétro-compat ; le rendu dégrade
    // gracieusement sur absence.
    formeJuridique?: string;
    regimeTVA?: "assujetti" | "exonere_261_4_4" | "franchise_293_b" | string;
    penalitesRetard?: string;
    indemniteRecouvrement?: number;
  };
  entreprise?: { nom: string; adresse?: string; ville?: string; codePostal?: string; siret?: string; email?: string; telephone?: string };
  contact?: { nom: string; prenom: string; email: string };
  lignes: { designation: string; quantite: number; prixUnitaire: number; montant: number; tauxTVA?: number | null }[];
  montantHT: number;
  tauxTVA: number;
  montantTTC: number;
  notes?: string;
  // Sessions rattachées au devis — pour la section « Délais d'exécution »
  // (art. L111-1 C.conso). Reprend les dates de début/fin de chaque session.
  sessions?: { dateDebut: string | Date; dateFin: string | Date }[];
  // Si true, ajoute une page annexe « Formulaire de rétractation » au devis
  // (art. L221-18 + R221-1 C.conso) — applicable aux particuliers (B2C).
  isB2C?: boolean;
}, opts?: PdfOpts): any {
  const branding = opts?.branding;
  const tpl = opts?.template;
  const primary = branding?.couleurPrimaire || COLORS.primary;
  const logo = branding?.logoBase64 || LOGO_BASE64;
  const societe = data.societe;
  const regimeTVA = societe?.regimeTVA ?? "assujetti";
  const tvaApplicable = regimeTVA === "assujetti";

  // Ventilation TVA multi-taux : si une ligne a son propre tauxTVA, on l'utilise,
  // sinon on retombe sur le taux global du devis. Le bloc « Détail TVA » liste
  // chaque taux distinct avec son sous-total — obligatoire art. 289 II CGI dès
  // qu'il y a plus d'un taux.
  const ventilationTVA: { taux: number; baseHT: number; tva: number }[] = [];
  if (tvaApplicable) {
    const acc = new Map<number, { baseHT: number; tva: number }>();
    for (const l of data.lignes) {
      const t = l.tauxTVA ?? data.tauxTVA;
      const cur = acc.get(t) ?? { baseHT: 0, tva: 0 };
      cur.baseHT += l.montant;
      cur.tva += l.montant * (t / 100);
      acc.set(t, cur);
    }
    for (const [taux, v] of Array.from(acc.entries()).sort((a, b) => b[0] - a[0])) {
      ventilationTVA.push({ taux, ...v });
    }
  }
  const montantTVA = ventilationTVA.reduce((s, v) => s + v.tva, 0);
  const montantNetAPayer = tvaApplicable ? data.montantHT + montantTVA : data.montantHT;
  const multiTaux = ventilationTVA.length > 1;
  const nomSociete = societe?.nom || branding?.nomEntreprise || "RFC - Rescue Formation Conseil";
  const nomAvecForme = societe?.formeJuridique
    ? `${nomSociete} — ${societe.formeJuridique}`
    : nomSociete;

  // Mention légale TVA — affichée dans le bloc Conditions et le footer selon régime.
  const mentionTVA =
    regimeTVA === "exonere_261_4_4"
      ? "Exonération de TVA en application de l'article 261-4-4° du Code général des impôts (organisme de formation déclaré)."
      : regimeTVA === "franchise_293_b"
      ? "TVA non applicable, article 293 B du Code général des impôts (franchise en base)."
      : null;

  // Build emetteur lines
  const emetteurLines: any[] = [
    { text: nomAvecForme, fontSize: 10, bold: true, color: COLORS.dark },
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
  const penalites = societe?.penalitesRetard
    || "En cas de retard de paiement, pénalité égale à 3 fois le taux d'intérêt légal en vigueur (art. L441-10 du Code de commerce).";
  const indemnite = societe?.indemniteRecouvrement ?? 40;
  const mentionIndemnite = `Tout retard de paiement déclenche également une indemnité forfaitaire de ${indemnite.toFixed(0)} € pour frais de recouvrement (art. D441-5 du Code de commerce).`;

  // Footer text
  const footerParts: string[] = [nomAvecForme];
  if (societe?.tvaIntracom && tvaApplicable) footerParts.push(`N°TVA Intracommunautaire : ${societe.tvaIntracom}`);
  if (societe?.nda) footerParts.push(`NDA : ${societe.nda}`);
  if (mentionTVA) footerParts.push(mentionTVA);
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

      // ── DÉLAIS D'EXÉCUTION (si sessions rattachées) ──
      // Conformité art. L111-1 C.conso : indication des délais d'exécution
      // de la prestation. Reprend les dates de toutes les sessions liées.
      ...(data.sessions && data.sessions.length > 0
        ? [
            { text: "Délais d'exécution :", fontSize: 10, bold: true, color: COLORS.dark, margin: [0, 0, 0, 4] as [number, number, number, number] },
            {
              ul: data.sessions.map((s) => ({
                text: `Session du ${fmtDate(typeof s.dateDebut === "string" ? s.dateDebut : s.dateDebut.toISOString())} au ${fmtDate(typeof s.dateFin === "string" ? s.dateFin : s.dateFin.toISOString())}`,
                fontSize: 9,
                color: COLORS.dark,
              })),
              margin: [0, 0, 0, 12] as [number, number, number, number],
            },
          ]
        : []),

      // ── TABLEAU LIGNES ──
      // Si TVA non applicable (exonéré 261-4-4° ou franchise 293 B) on cache
      // la colonne TVA — sinon la mention « pas de TVA » serait incohérente.
      {
        table: {
          headerRows: 1,
          widths: tvaApplicable ? ["*", 45, 75, 55, 60] : ["*", 60, 90, 80],
          body: [
            tvaApplicable
              ? [
                  { text: "Désignation", fontSize: 9, bold: true, color: "#ffffff", fillColor: COLORS.dark, alignment: "left" as const, margin: [4, 4, 4, 4] as [number, number, number, number] },
                  { text: "Quantité", fontSize: 9, bold: true, color: "#ffffff", fillColor: COLORS.dark, alignment: "center" as const, margin: [2, 4, 2, 4] as [number, number, number, number] },
                  { text: "Prix unit. HT", fontSize: 9, bold: true, color: "#ffffff", fillColor: COLORS.dark, alignment: "right" as const, margin: [2, 4, 4, 4] as [number, number, number, number] },
                  { text: multiTaux ? "TVA" : `Total TVA ${data.tauxTVA}%`, fontSize: 9, bold: true, color: "#ffffff", fillColor: COLORS.dark, alignment: "right" as const, margin: [2, 4, 4, 4] as [number, number, number, number] },
                  { text: "Total HT", fontSize: 9, bold: true, color: "#ffffff", fillColor: COLORS.dark, alignment: "right" as const, margin: [2, 4, 4, 4] as [number, number, number, number] },
                ]
              : [
                  { text: "Désignation", fontSize: 9, bold: true, color: "#ffffff", fillColor: COLORS.dark, alignment: "left" as const, margin: [4, 4, 4, 4] as [number, number, number, number] },
                  { text: "Quantité", fontSize: 9, bold: true, color: "#ffffff", fillColor: COLORS.dark, alignment: "center" as const, margin: [2, 4, 2, 4] as [number, number, number, number] },
                  { text: "Prix unit. net", fontSize: 9, bold: true, color: "#ffffff", fillColor: COLORS.dark, alignment: "right" as const, margin: [2, 4, 4, 4] as [number, number, number, number] },
                  { text: "Total net", fontSize: 9, bold: true, color: "#ffffff", fillColor: COLORS.dark, alignment: "right" as const, margin: [2, 4, 4, 4] as [number, number, number, number] },
                ],
            ...data.lignes.map((l, i) => {
              const bg = i % 2 === 0 ? "#ffffff" : "#fafafa";
              if (!tvaApplicable) {
                return [
                  { text: l.designation, fontSize: 9, color: COLORS.dark, fillColor: bg, margin: [4, 4, 4, 4] as [number, number, number, number] },
                  { text: l.quantite.toString(), fontSize: 9, color: COLORS.dark, fillColor: bg, alignment: "center" as const, margin: [2, 4, 2, 4] as [number, number, number, number] },
                  { text: fmtCurrency(l.prixUnitaire), fontSize: 9, color: COLORS.dark, fillColor: bg, alignment: "right" as const, margin: [2, 4, 4, 4] as [number, number, number, number] },
                  { text: fmtCurrency(l.montant), fontSize: 9, color: COLORS.dark, fillColor: bg, alignment: "right" as const, margin: [2, 4, 4, 4] as [number, number, number, number] },
                ];
              }
              const tauxLigne = l.tauxTVA ?? data.tauxTVA;
              const tva = l.montant * (tauxLigne / 100);
              const tvaCell = multiTaux ? `${tauxLigne}% · ${fmtCurrency(tva)}` : fmtCurrency(tva);
              return [
                { text: l.designation, fontSize: 9, color: COLORS.dark, fillColor: bg, margin: [4, 4, 4, 4] as [number, number, number, number] },
                { text: l.quantite.toString(), fontSize: 9, color: COLORS.dark, fillColor: bg, alignment: "center" as const, margin: [2, 4, 2, 4] as [number, number, number, number] },
                { text: fmtCurrency(l.prixUnitaire), fontSize: 9, color: COLORS.dark, fillColor: bg, alignment: "right" as const, margin: [2, 4, 4, 4] as [number, number, number, number] },
                { text: tvaCell, fontSize: 9, color: COLORS.dark, fillColor: bg, alignment: "right" as const, margin: [2, 4, 4, 4] as [number, number, number, number] },
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
              // Conformité B2B obligatoire — art. L441-10 + D441-5 C.com
              { text: penalites, fontSize: 8, color: COLORS.gray, margin: [0, 6, 0, 0] as [number, number, number, number] },
              { text: mentionIndemnite, fontSize: 8, color: COLORS.gray, margin: [0, 2, 0, 0] as [number, number, number, number] },
              // Mention TVA légale si exonéré / franchise (art. 261-4-4° / 293 B CGI)
              ...(mentionTVA ? [{ text: mentionTVA, fontSize: 8, italics: true, color: COLORS.dark, margin: [0, 6, 0, 0] as [number, number, number, number] }] : []),
            ],
          },
          { width: "5%", text: "" },
          {
            width: "40%",
            table: {
              widths: ["*", 80],
              body: tvaApplicable
                ? [
                    [
                      { text: "Total HT", fontSize: 9, color: COLORS.dark, margin: [6, 4, 4, 4] as [number, number, number, number] },
                      { text: fmtCurrency(data.montantHT), fontSize: 9, color: COLORS.dark, alignment: "right" as const, margin: [4, 4, 6, 4] as [number, number, number, number] },
                    ],
                    // Ventilation TVA par taux — obligatoire dès qu'il y a plusieurs taux
                    // (art. 289 II CGI). Sinon ligne unique style historique.
                    ...ventilationTVA.map((v) => [
                      { text: `Total TVA (${v.taux}%)`, fontSize: 9, color: COLORS.dark, margin: [6, 4, 4, 4] as [number, number, number, number] },
                      { text: fmtCurrency(v.tva), fontSize: 9, color: COLORS.dark, alignment: "right" as const, margin: [4, 4, 6, 4] as [number, number, number, number] },
                    ]),
                    [
                      { text: "Net à payer", fontSize: 10, bold: true, color: "#ffffff", fillColor: COLORS.dark, margin: [6, 5, 4, 5] as [number, number, number, number] },
                      { text: fmtCurrency(montantNetAPayer), fontSize: 10, bold: true, color: "#ffffff", fillColor: COLORS.dark, alignment: "right" as const, margin: [4, 5, 6, 5] as [number, number, number, number] },
                    ],
                  ]
                : [
                    [
                      { text: "Net à payer", fontSize: 10, bold: true, color: "#ffffff", fillColor: COLORS.dark, margin: [6, 5, 4, 5] as [number, number, number, number] },
                      { text: fmtCurrency(montantNetAPayer), fontSize: 10, bold: true, color: "#ffffff", fillColor: COLORS.dark, alignment: "right" as const, margin: [4, 5, 6, 5] as [number, number, number, number] },
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

      // ── ANNEXE FORMULAIRE DE RÉTRACTATION (B2C uniquement) ──
      // Art. L221-18 du Code de la consommation : 14 jours de rétractation.
      // Art. R221-1 : modèle officiel de formulaire à fournir au consommateur
      // lors d'une vente à distance ou hors établissement.
      ...(data.isB2C
        ? [
            { text: "", pageBreak: "before" as const },
            { text: "Formulaire de rétractation", fontSize: 16, bold: true, color: COLORS.dark, margin: [0, 0, 0, 8] as [number, number, number, number] },
            { text: "Conformément aux articles L221-18 et suivants du Code de la consommation, vous disposez d'un délai de 14 jours calendaires pour vous rétracter de la présente commande, à compter du jour de sa conclusion. Pour exercer ce droit, vous pouvez utiliser le formulaire ci-dessous ou nous adresser toute déclaration dénuée d'ambiguïté exprimant votre volonté de vous rétracter.", fontSize: 9, color: COLORS.dark, margin: [0, 0, 0, 14] as [number, number, number, number] },
            { text: "Modèle de formulaire de rétractation", fontSize: 11, bold: true, color: COLORS.dark, margin: [0, 0, 0, 6] as [number, number, number, number] },
            {
              table: {
                widths: ["*"],
                body: [[{
                  stack: [
                    { text: "À l'attention de :", fontSize: 9, color: COLORS.dark, margin: [0, 0, 0, 2] as [number, number, number, number] },
                    { text: nomAvecForme, fontSize: 9, bold: true, color: COLORS.dark },
                    ...(societe?.adresse ? [{ text: societe.adresse, fontSize: 9, color: COLORS.dark }] : []),
                    ...(societe?.codePostal || societe?.ville
                      ? [{ text: [societe?.codePostal, societe?.ville].filter(Boolean).join(" "), fontSize: 9, color: COLORS.dark }]
                      : []),
                    ...(societe?.email ? [{ text: `Email : ${societe.email}`, fontSize: 9, color: COLORS.dark }] : []),
                    { text: "", margin: [0, 8, 0, 0] as [number, number, number, number] },
                    { text: "Je / nous (*) vous notifie / notifions (*) par la présente ma / notre (*) rétractation du contrat portant sur la prestation de services ci-dessous :", fontSize: 9, color: COLORS.dark, margin: [0, 0, 0, 6] as [number, number, number, number] },
                    { text: `Référence du devis : ${data.numero}`, fontSize: 9, color: COLORS.dark, margin: [0, 0, 0, 2] as [number, number, number, number] },
                    { text: `Objet : ${data.objet}`, fontSize: 9, color: COLORS.dark, margin: [0, 0, 0, 6] as [number, number, number, number] },
                    { text: "Commandé le : ____________________________________________", fontSize: 9, color: COLORS.dark, margin: [0, 4, 0, 4] as [number, number, number, number] },
                    { text: "Nom du / des consommateur(s) : __________________________", fontSize: 9, color: COLORS.dark, margin: [0, 4, 0, 4] as [number, number, number, number] },
                    { text: "Adresse du / des consommateur(s) : _______________________", fontSize: 9, color: COLORS.dark, margin: [0, 4, 0, 4] as [number, number, number, number] },
                    { text: "________________________________________________________", fontSize: 9, color: COLORS.dark, margin: [0, 0, 0, 4] as [number, number, number, number] },
                    { text: "Signature du / des consommateur(s) (uniquement en cas de notification du présent formulaire sur papier) :", fontSize: 9, color: COLORS.dark, margin: [0, 4, 0, 4] as [number, number, number, number] },
                    { text: "", margin: [0, 16, 0, 0] as [number, number, number, number] },
                    { text: "Date : ___________________________________________________", fontSize: 9, color: COLORS.dark, margin: [0, 4, 0, 4] as [number, number, number, number] },
                    { text: "(*) Rayer la mention inutile.", fontSize: 8, italics: true, color: COLORS.gray, margin: [0, 8, 0, 0] as [number, number, number, number] },
                  ],
                  border: [true, true, true, true],
                  margin: [12, 12, 12, 12] as [number, number, number, number],
                }]],
              },
              layout: {
                hLineWidth: () => 1,
                vLineWidth: () => 1,
                hLineColor: () => primary,
                vLineColor: () => primary,
              },
            },
          ]
        : []),
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
