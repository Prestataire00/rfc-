import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { facturePdf } from "@/lib/pdf/templates";
import { generatePdfBuffer } from "@/lib/pdf/generate";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const facture = await prisma.facture.findUnique({
      where: { id: params.id },
      include: {
        entreprise: true,
        devis: {
          include: {
            lignes: true,
            contact: true,
          },
        },
      },
    });

    if (!facture) {
      return NextResponse.json({ error: "Facture non trouvee" }, { status: 404 });
    }

    const lignes = facture.devis?.lignes || [];
    const contact = facture.devis?.contact;

    const docDef = facturePdf({
      numero: facture.numero,
      dateEmission: facture.dateEmission.toISOString(),
      dateEcheance: facture.dateEcheance.toISOString(),
      entreprise: facture.entreprise
        ? {
            nom: facture.entreprise.nom,
            adresse: facture.entreprise.adresse || undefined,
            ville: facture.entreprise.ville || undefined,
            codePostal: facture.entreprise.codePostal || undefined,
            siret: facture.entreprise.siret || undefined,
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
