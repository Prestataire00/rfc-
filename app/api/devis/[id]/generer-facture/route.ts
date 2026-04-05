export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateNumero } from "@/lib/utils";
import { logAction } from "@/lib/historique";

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const devis = await prisma.devis.findUnique({
      where: { id: params.id },
      include: { factures: true },
    });

    if (!devis) return NextResponse.json({ error: "Devis non trouvé" }, { status: 404 });
    if (devis.factures.length > 0) {
      return NextResponse.json({ error: "Une facture existe déjà pour ce devis" }, { status: 409 });
    }

    const count = await prisma.facture.count();
    const numero = generateNumero("FAC", count);

    const dateEcheance = new Date();
    dateEcheance.setDate(dateEcheance.getDate() + 30);

    const facture = await prisma.facture.create({
      data: {
        numero,
        montantHT: devis.montantHT,
        tauxTVA: devis.tauxTVA,
        montantTTC: devis.montantTTC,
        dateEcheance,
        statut: "en_attente",
        devisId: devis.id,
        entrepriseId: devis.entrepriseId,
      },
    });

    // Mark devis as accepted if not already
    if (devis.statut === "envoye") {
      await prisma.devis.update({ where: { id: params.id }, data: { statut: "accepte" } });
    }

    try {
      await logAction({
        action: "facture_generee",
        label: "Facture " + numero + " générée depuis devis " + devis.numero,
        lien: "/commercial/factures/" + facture.id,
        entrepriseId: devis.entrepriseId ?? undefined,
        factureId: facture.id,
        devisId: devis.id,
      });
    } catch (logErr) {
      console.warn("logAction facture_generee échoué:", logErr);
    }

    return NextResponse.json(facture, { status: 201 });
  } catch (err: unknown) {
    console.error("Erreur POST generer-facture:", err);
    return NextResponse.json({ error: "Erreur lors de la création de la facture" }, { status: 500 });
  }
}
