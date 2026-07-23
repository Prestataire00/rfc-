export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { generatePdfBuffer } from "@/lib/pdf/generate";
import { pdfResponse } from "@/lib/pdf/response";
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

type CustomVars = {
  stagiaire?: Partial<{ prenom: string; nom: string; email: string }>;
  formation?: Partial<{ titre: string; duree: number; objectifs: string }>;
  session?: Partial<{ dateDebut: string; dateFin: string; lieu: string }>;
  entreprise?: Partial<{
    nom: string;
    adresse: string;
    codePostal: string;
    ville: string;
    siret: string;
  }>;
  formateur?: Partial<{ prenom: string; nom: string }>;
  // Variables custom du template (n'importe quel key → string)
  custom?: Record<string, string>;
};

function parseVarsFromQuery(req: NextRequest): CustomVars {
  try {
    const v = new URL(req.url).searchParams.get("vars");
    if (!v) return {};
    return JSON.parse(decodeURIComponent(v)) as CustomVars;
  } catch {
    return {};
  }
}

// GET /api/pdf/template-preview/[type]?vars=<encoded JSON>
// Genere un PDF d'apercu du template avec des donnees de demonstration.
// Le query param `vars` permet d'override les valeurs par défaut pour la
// preview live de l'éditeur (saisie utilisateur dans les inputs custom).
export const GET = withErrorHandlerParams<{ type: string }>(async (req: NextRequest, { params }) => {
  const parametres = await getParametres();
  const branding = await resolveBranding(parametres);
  const overrides = parseVarsFromQuery(req);

  // Donnees fictives partagees (overridables)
  const fakeStagiaire = {
    prenom: "Marie", nom: "Dupont", email: "marie.dupont@example.com",
    ...(overrides.stagiaire ?? {}),
  };
  const fakeFormation = {
    titre: "Formation Demo - Securite Incendie", duree: 14,
    objectifs: "A l'issue de la formation, le stagiaire saura utiliser un extincteur et appliquer les consignes de secours.",
    ...(overrides.formation ?? {}),
  };
  const fakeSession = {
    dateDebut: "15/06/2026", dateFin: "16/06/2026", lieu: "Toulon (83)",
    ...(overrides.session ?? {}),
  };
  const fakeEntreprise = {
    nom: "Acme Industrie", adresse: "12 rue de la Republique",
    codePostal: "83000", ville: "Toulon", siret: "123 456 789 00012",
    ...(overrides.entreprise ?? {}),
  };
  const fakeFormateur = {
    prenom: "Pierre", nom: "Martin",
    ...(overrides.formateur ?? {}),
  };
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
    // Variables custom : merge dans le contexte au top-level pour que
    // {{ma_variable_custom}} dans le template soit substitué.
    ...(overrides.custom ?? {}),
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
        stagiaire: { nom: fakeStagiaire.nom, prenom: fakeStagiaire.prenom },
        organisme: {
          nom: parametres.nomEntreprise,
          responsable: [parametres.representantPrenom, parametres.representantNom].filter(Boolean).join(" ") || undefined,
          adresse: parametres.adresse || undefined,
          codePostal: parametres.codePostal || undefined,
          ville: parametres.ville || undefined,
          telephone: parametres.telephone || undefined,
          email: parametres.email || undefined,
          siret: parametres.siret || undefined,
          nda: parametres.nda || undefined,
        },
        formateurNom: `${fakeFormateur.prenom} ${fakeFormateur.nom}`,
        dateFormation: fakeSession.dateDebut,
        entrepriseCliente: [fakeEntreprise.nom, fakeEntreprise.adresse, `${fakeEntreprise.codePostal} ${fakeEntreprise.ville}`].filter(Boolean).join(" "),
        lieuFormation: fakeSession.lieu,
        formation: {
          titre: fakeFormation.titre,
          dureeLabel: `${String(fakeFormation.duree).padStart(2, "0")} heures`,
          objectifs: String(fakeFormation.objectifs || "").split("\n").map((s) => s.replace(/^\s*[•\-*]\s*/, "").trim()).filter(Boolean),
        },
        competences: [
          { label: "Être capable de mettre en sécurité les acteurs de la situation", acquise: true },
          { label: "Être capable d'examiner une victime et de déterminer le résultat à atteindre", acquise: true },
          { label: "Être capable d'alerter ou faire alerter en communiquant les informations nécessaires", acquise: true },
        ],
        villeSignature: parametres.ville || "—",
        dateSignature: "17/06/2026",
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
        formationDetails: {
          intitule: fakeFormation.titre,
          nbApprenants: 4,
          nbHeures: "07h00",
          nbJours: 1,
          dateTexte: "le 03/08/2026",
          lieu: "202 L'Agora Parc, Chemin des champs de pruniers, 04100 Manosque",
        },
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
  return pdfResponse(Buffer.from(buffer), `preview-${params.type}`);
});
