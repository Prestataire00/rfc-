export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/historique";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { logger } from "@/lib/logger";

export const GET = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const facture = await prisma.facture.findUnique({
    where: { id: params.id },
    include: { entreprise: true, devis: { include: { lignes: true } } },
  });
  if (!facture) return NextResponse.json({ error: "Non trouvé" }, { status: 404 });
  return NextResponse.json(facture);
});

export const PUT = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const body = await req.json();
  const facture = await prisma.facture.update({
    where: { id: params.id },
    data: {
      ...body,
      ...(body.dateEcheance ? { dateEcheance: new Date(body.dateEcheance) } : {}),
      ...(body.datePaiement ? { datePaiement: new Date(body.datePaiement) } : {}),
    },
  });
  if (body.statut) {
    try {
      await logAction({
        action: "facture_" + body.statut,
        label: "Facture " + facture.numero + " → " + body.statut,
        lien: "/commercial/factures/" + params.id,
        entrepriseId: facture.entrepriseId ?? undefined,
        factureId: params.id,
      });
    } catch (logErr) {
      logger.warn("historique.facture_failed", { error: String(logErr) });
    }
  }
  return NextResponse.json(facture);
});

export const DELETE = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  await prisma.facture.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
});
