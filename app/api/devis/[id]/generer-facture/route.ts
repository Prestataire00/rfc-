export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateNumero } from "@/lib/utils";
import { logAction } from "@/lib/historique";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { logger } from "@/lib/logger";

export const POST = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
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

  // Atomique : création facture + (éventuelle) mise à jour devis dans la même transaction.
  const facture = await prisma.$transaction(async (tx) => {
    const created = await tx.facture.create({
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

    if (devis.statut === "envoye") {
      await tx.devis.update({ where: { id: params.id }, data: { statut: "signe" } });
    }

    return created;
  });

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
    logger.warn("historique.facture_generee_failed", { error: String(logErr) });
  }

  return NextResponse.json(facture, { status: 201 });
});
