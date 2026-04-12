export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { facturePdf } from "@/lib/pdf/templates";
import { generatePdfBuffer } from "@/lib/pdf/generate";
import { getParametres } from "@/lib/parametres";
import { resolveBranding } from "@/lib/pdf/branding";
import { renderDocumentTemplate } from "@/lib/document-templates";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const [facture, parametres] = await Promise.all([
      prisma.facture.findUnique({
        where: { id: params.id },
        include: {
          entreprise: true,
          devis: { include: { lignes: true, contact: true } },
        },
      }),
      prisma.parametres.findUnique({ where: { id: "default" } }),
    ]);

    if (!facture) {
      return NextResponse.json({ error: "Facture non trouvee" }, { status: 404 });
    }

    const lignes = facture.devis?.lignes || [];
    const contact = facture.devis?.contact;

    const docDef = facturePdf({
      numero: facture.numero,
      dateEmission: facture.dateEmission.toISOString(),
      dateEcheance: facture.dateEcheance.toISOString(),
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
            mentionsFacture: parametres.mentionsFacture,
          }
        : undefined,
      entreprise: facture.entreprise
        ? {
            nom: facture.entreprise.nom,
            adresse: facture.entreprise.adresse || undefined,
            ville: facture.entreprise.ville || undefined,
            codePostal: facture.entreprise.codePostal || undefined,
            siret: facture.entreprise.siret || undefined,
            email: facture.entreprise.email || undefined,
            telephone: facture.entreprise.telephone || undefined,
          }
        : undefined,
      contact: contact
        ? { nom: contact.nom, prenom: contact.prenom, email: contact.email }
        : undefined,
      lignes: lignes.map((l) => ({
        designation: l.designation,
        quantite: l.quantite,
        prixUnitaire: l.prixUnitaire,
        montant: l.montant,
      })),
      montantHT: facture.montantHT,
      tauxTVA: facture.tauxTVA,
      montantTTC: facture.montantTTC,
      notes: facture.notes || undefined,
      devisNumero: facture.devis?.numero || undefined,
    }, {
      branding: await resolveBranding(await getParametres()),
      template: (await renderDocumentTemplate("facture", {
        entreprise: {
          nomEntreprise: parametres?.nomEntreprise || "",
          adresse: parametres?.adresse || "",
          siret: parametres?.siret || "",
          nda: parametres?.nda || "",
        },
      })) || undefined,
    });

    const buffer = await generatePdfBuffer(docDef);

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="facture-${facture.numero}.pdf"`,
      },
    });
  } catch (err: unknown) {
    console.error("Erreur generation facture PDF:", err);
    return NextResponse.json({ error: "Erreur lors de la generation du PDF facture" }, { status: 500 });
  }
}
