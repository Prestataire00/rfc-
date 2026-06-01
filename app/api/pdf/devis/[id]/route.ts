export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { devisPdf } from "@/lib/pdf/templates";
import { generatePdfBuffer } from "@/lib/pdf/generate";
import { pdfResponse } from "@/lib/pdf/response";
import { getParametres } from "@/lib/parametres";
import { resolveBranding } from "@/lib/pdf/branding";
import { renderDocumentTemplate } from "@/lib/document-templates";
import { withErrorHandlerParams } from "@/lib/api-wrapper";

export const GET = withErrorHandlerParams<{ id: string }>(async (_req: NextRequest, { params }) => {
  const [devis, parametres] = await Promise.all([
    prisma.devis.findUnique({
      where: { id: params.id },
      include: {
        lignes: true,
        entreprise: true,
        contact: true,
        sessions: { select: { dateDebut: true, dateFin: true } },
      },
    }),
    prisma.parametres.findUnique({ where: { id: "default" } }),
  ]);

  if (!devis) {
    return NextResponse.json({ error: "Devis non trouve" }, { status: 404 });
  }

  const docDef = devisPdf({
    numero: devis.numero,
    objet: devis.objet,
    dateEmission: devis.dateEmission.toISOString(),
    dateValidite: devis.dateValidite.toISOString(),
    societe: parametres
      ? {
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
          formeJuridique: parametres.formeJuridique,
          regimeTVA: parametres.regimeTVA,
          penalitesRetard: parametres.penalitesRetard,
          indemniteRecouvrement: parametres.indemniteRecouvrement,
        }
      : undefined,
    entreprise: devis.entreprise
      ? {
          nom: devis.entreprise.nom,
          adresse: devis.entreprise.adresse || undefined,
          ville: devis.entreprise.ville || undefined,
          codePostal: devis.entreprise.codePostal || undefined,
          siret: devis.entreprise.siret || undefined,
          email: devis.entreprise.email || undefined,
          telephone: devis.entreprise.telephone || undefined,
        }
      : undefined,
    contact: devis.contact
      ? { nom: devis.contact.nom, prenom: devis.contact.prenom, email: devis.contact.email }
      : undefined,
    // Sessions liées : reprises dans la section « Délais d'exécution » du devis
    sessions: devis.sessions.map((s) => ({
      dateDebut: s.dateDebut.toISOString(),
      dateFin: s.dateFin.toISOString(),
    })),
    // B2C détecté : pas d'entreprise rattachée → annexe formulaire de rétractation
    isB2C: !devis.entrepriseId,
    lignes: devis.lignes.map((l) => ({
      designation: l.designation,
      quantite: l.quantite,
      prixUnitaire: l.prixUnitaire,
      montant: l.montant,
    })),
    montantHT: devis.montantHT,
    tauxTVA: devis.tauxTVA,
    montantTTC: devis.montantTTC,
    notes: devis.notes || undefined,
  }, {
    branding: await resolveBranding(await getParametres()),
    template: (await renderDocumentTemplate("devis", {
      entreprise: {
        nomEntreprise: parametres?.nomEntreprise || "",
        adresse: parametres?.adresse || "",
        siret: parametres?.siret || "",
        nda: parametres?.nda || "",
      },
    })) || undefined,
  });

  const buffer = await generatePdfBuffer(docDef);
  return pdfResponse(Buffer.from(buffer), `devis-${devis.numero}`);
});
