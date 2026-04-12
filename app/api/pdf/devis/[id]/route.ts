export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { devisPdf } from "@/lib/pdf/templates";
import { generatePdfBuffer } from "@/lib/pdf/generate";
import { getParametres } from "@/lib/parametres";
import { resolveBranding } from "@/lib/pdf/branding";
import { renderDocumentTemplate } from "@/lib/document-templates";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const [devis, parametres] = await Promise.all([
      prisma.devis.findUnique({
        where: { id: params.id },
        include: { lignes: true, entreprise: true, contact: true },
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

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="devis-${devis.numero}.pdf"`,
      },
    });
  } catch (err: unknown) {
    console.error("Erreur generation devis PDF:", err);
    return NextResponse.json({ error: "Erreur lors de la generation du PDF devis" }, { status: 500 });
  }
}
