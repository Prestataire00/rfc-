export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { parsePartialBody } from "@/lib/validations/helpers";

const updateSchema = z.object({
  montant: z.number().positive(),
  dateEcheance: z.string(),
  statut: z.string(),
  datePaiement: z.string().optional().nullable(),
});

export const PUT = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const body = await parsePartialBody(req, updateSchema);
  const data: Record<string, unknown> = { ...body };
  if (typeof body.dateEcheance === "string") data.dateEcheance = new Date(body.dateEcheance);
  if (typeof body.datePaiement === "string") data.datePaiement = new Date(body.datePaiement);
  const item = await prisma.echeancierPaiement.update({ where: { id: params.id }, data });
  return NextResponse.json(item);
});

export const DELETE = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  await prisma.echeancierPaiement.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
});
