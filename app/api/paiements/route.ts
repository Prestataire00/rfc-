export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";
import { parseBody } from "@/lib/validations/helpers";

const createSchema = z.object({
  factureId: z.string().min(1),
  montant: z.number().positive(),
  datePaiement: z.string(),
  mode: z.string().min(1),
  reference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

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
  const body = await parseBody(req, createSchema);
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
