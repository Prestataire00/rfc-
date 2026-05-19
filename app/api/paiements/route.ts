export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";
import { parseBody } from "@/lib/validations/helpers";
// Audit 2026-05-19 §4.9 : schéma Zod centralisé (validations/paiement.ts).
import { paiementSchema } from "@/lib/validations/paiement";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const factureId = searchParams.get("factureId");

  const where: Record<string, unknown> = {};
  if (factureId) where.factureId = factureId;

  const items = await prisma.paiement.findMany({
    where,
    orderBy: { datePaiement: "desc" },
  });
  return NextResponse.json(items);
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = await parseBody(req, paiementSchema);
  const item = await prisma.paiement.create({
    data: {
      factureId: body.factureId,
      montant: body.montant,
      datePaiement: new Date(body.datePaiement),
      mode: body.mode,
      reference: body.reference ?? null,
      notes: body.notes ?? null,
    },
  });
  return NextResponse.json(item, { status: 201 });
});
