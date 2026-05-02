export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { generatePdfBuffer } from "@/lib/pdf/generate";
import {
  conventionPdf,
  convocationPdf,
  attestationPdf,
  feuillePresencePdf,
  devisPdf,
  facturePdf,
} from "@/lib/pdf/templates";
import { getParametres } from "@/lib/parametres";
import { resolveBranding } from "@/lib/pdf/branding";
import { renderDocumentTemplate } from "@/lib/document-templates";
import { withErrorHandlerParams } from "@/lib/api-wrapper";

// GET /api/pdf/template-preview/[type]
// Genere un PDF d'apercu du template avec des donnees de demonstration.
// Utilise pour l'editeur de templates (iframe preview).
export const GET = withErrorHandlerParams<{ type: string }>(async (_req: NextRequest, { params }) => {
  const parametres = await getParametres();
  const branding = await resolveBranding(parametres);

  // Donnees fictives partagees
  const fakeStagiaire = { prenom: "Marie", nom: "Dupont", email: "marie.dupont@example.com" };
  const fakeFormation = { titre: "Formation Demo - Securite Incendie", duree: 14, objectifs: "A l'issue de la formation, le stagiaire saura utiliser un extincteur et appliquer les consignes de secours." };
  const fakeSession = { dateDebut: "15/06/2026", dateFin: "16/06/2026", lieu: "Toulon (83)" };
  const fakeEntreprise = { nom: "Acme Industrie", adresse: "12 rue de la Republique", codePostal: "83000", ville: "Toulon", siret: "123 456 789 00012" };
  const fakeFormateur = { prenom: "Pierre", nom: "Martin" };
  const fakeLignes = [
    { designation: "Formation Securite Incendie (2 jours)", quantite: 4, prixUnitaire: 350, montant: 1400 },
    { designation: "Fourniture de supports pedagogiques", quantite: 1, prixUnitaire: 80, montant: 80 },
  ];

  const varsCtx = {
    stagiaire: fakeStagiaire,
    formation: fakeFormation,
    session: fakeSession,
    entreprise: {
      nomEntreprise: parametres.nomEntreprise,
      adresse: parametres.adresse,
      siret: parametres.siret,
      nda: parametres.nda,
    },
  };

  const template = await renderDocumentTemplate(params.type, varsCtx);

  let docDef: unknown;

  switch (params.type) {
    case "convocation":
      docDef = convocationPdf({
        stagiaire: fakeStagiaire,
        formation: fakeFormation,
        session: fakeSession,
        formateur: fakeFormateur,
      }, { branding, template: template || undefined });
      break;

    case "convention":
      docDef = conventionPdf({
        entreprise: fakeEntreprise,
        formation: fakeFormation,
        session: fakeSession,
        montantHT: 1480,
        montantTTC: 1776,
        numero: "CONV-2026-DEMO",
      }, { branding, template: template || undefined });
      break;

    case "attestation":
      docDef = attestationPdf({
        stagiaire: fakeStagiaire,
        formation: fakeFormation,
        session: fakeSession,
        formateur: fakeFormateur,
        dateGeneration: "17/06/2026",
      }, { branding, template: template || undefined });
      break;

    case "feuille_presence":
    case "feuille-presence":
      docDef = feuillePresencePdf({
        formation: fakeFormation,
        session: fakeSession,
        formateur: fakeFormateur,
        stagiaires: [
          { prenom: "Marie", nom: "Dupont" },
          { prenom: "Paul", nom: "Bernard" },
          { prenom: "Lucie", nom: "Petit" },
        ],
        dates: ["15/06", "16/06"],
      }, { branding, template: template || undefined });
      break;

    case "devis":
      docDef = devisPdf({
        numero: "DEV-2026-DEMO",
        objet: "Formation Securite Incendie",
        dateEmission: new Date().toISOString(),
        dateValidite: new Date(Date.now() + 30 * 864e5).toISOString(),
        societe: {
          nom: parametres.nomEntreprise,
          slogan: parametres.slogan,
          adresse: parametres.adresse,
          codePostal: parametres.codePostal,
          ville: parametres.ville,
          telephone: parametres.telephone,
          email: parametres.email,
          siret: parametres.siret,
          nda: parametres.nda,
          tvaIntracom: parametres.tvaIntracom,
          conditionsPaiement: parametres.conditionsPaiement,
          mentionsDevis: parametres.mentionsDevis,
        },
        entreprise: fakeEntreprise,
        contact: fakeStagiaire,
        lignes: fakeLignes,
        montantHT: 1480,
        tauxTVA: 20,
        montantTTC: 1776,
      }, { branding, template: template || undefined });
      break;

    case "facture":
      docDef = facturePdf({
        numero: "FAC-2026-DEMO",
        dateEmission: new Date().toISOString(),
        dateEcheance: new Date(Date.now() + 30 * 864e5).toISOString(),
        societe: {
          nom: parametres.nomEntreprise,
          slogan: parametres.slogan,
          adresse: parametres.adresse,
          codePostal: parametres.codePostal,
          ville: parametres.ville,
          telephone: parametres.telephone,
          email: parametres.email,
          siret: parametres.siret,
          nda: parametres.nda,
          tvaIntracom: parametres.tvaIntracom,
          conditionsPaiement: parametres.conditionsPaiement,
          mentionsFacture: parametres.mentionsFacture,
        },
        entreprise: fakeEntreprise,
        contact: fakeStagiaire,
        lignes: fakeLignes,
        montantHT: 1480,
        tauxTVA: 20,
        montantTTC: 1776,
        devisNumero: "DEV-2026-DEMO",
      }, { branding, template: template || undefined });
      break;

    default:
      return NextResponse.json({ error: "Type de template inconnu" }, { status: 400 });
  }

  const buffer = await generatePdfBuffer(docDef);
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="preview-${params.type}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
});
