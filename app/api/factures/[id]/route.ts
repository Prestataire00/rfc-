export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/historique";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { logger } from "@/lib/logger";
import { notifyAllAdmins } from "@/lib/notifications";

const factureUpdateSchema = z
  .object({
    statut: z.string().max(60).optional(),
    dateEcheance: z.string().optional(),
    datePaiement: z.string().optional(),
    montantHT: z.number().optional(),
    montantTTC: z.number().optional(),
    tauxTVA: z.number().optional(),
    numero: z.string().max(60).optional(),
    notes: z.string().max(5000).optional().nullable(),
  })
  .passthrough();

export const GET = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const facture = await prisma.facture.findUnique({
    where: { id: params.id },
    include: { entreprise: true, devis: { include: { lignes: true } } },
  });
  if (!facture) return NextResponse.json({ error: "Non trouvé" }, { status: 404 });
  return NextResponse.json(facture);
});

export const PUT = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const raw = await req.json().catch(() => null);
  const parsed = factureUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }
  const body = parsed.data;
  const factureAvant = await prisma.facture.findUnique({
    where: { id: params.id },
    select: { statut: true },
  });
  const { dateEcheance: _de, datePaiement: _dp, ...bodyRest } = body;
  const facture = await prisma.facture.update({
    where: { id: params.id },
    data: {
      ...bodyRest,
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

    if (body.statut === "payee" && factureAvant?.statut !== "payee") {
      try {
        await notifyAllAdmins({
          titre: "Facture payée",
          message: facture.numero,
          type: "success",
          lien: "/commercial/factures/" + params.id,
        });
      } catch (e) {
        logger.warn("notify.facture_payee_failed", { error: String(e) });
      }
    }
  }
  return NextResponse.json(facture);
});

export const DELETE = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  await prisma.facture.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
});
