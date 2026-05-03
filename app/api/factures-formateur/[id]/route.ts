export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { parsePartialBody } from "@/lib/validations/helpers";

const updateSchema = z.object({
  formateurId: z.string().min(1),
  sessionId: z.string().optional().nullable(),
  montantHT: z.number().nonnegative(),
  tauxTVA: z.number().nonnegative(),
  montantTTC: z.number().nonnegative(),
  datePrestation: z.string(),
  datePaiement: z.string().optional().nullable(),
  statut: z.string(),
  fichierUrl: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const GET = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const item = await prisma.factureFormateur.findUnique({
    where: { id: params.id },
    include: { formateur: true, session: { include: { formation: true } } },
  });
  if (!item) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(item);
});

export const PUT = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const body = await parsePartialBody(req, updateSchema);
  const data: Record<string, unknown> = { ...body };
  if (typeof body.datePrestation === "string") data.datePrestation = new Date(body.datePrestation);
  if (typeof body.datePaiement === "string") data.datePaiement = new Date(body.datePaiement);
  const item = await prisma.factureFormateur.update({ where: { id: params.id }, data });
  return NextResponse.json(item);
});

export const DELETE = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  await prisma.factureFormateur.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
});
