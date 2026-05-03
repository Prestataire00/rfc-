export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";
import { parseBody } from "@/lib/validations/helpers";

const createSchema = z.object({
  montant: z.number(),
  date: z.string(),
  libelle: z.string().min(1),
  reference: z.string().optional().nullable(),
  sens: z.enum(["credit", "debit"]),
  categorie: z.string().optional().nullable(),
  factureId: z.string().optional().nullable(),
});

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const sens = searchParams.get("sens");
  const factureId = searchParams.get("factureId");

  const where: Record<string, unknown> = {};
  if (sens) where.sens = sens;
  if (factureId) where.factureId = factureId;
  if (dateFrom || dateTo) {
    const range: Record<string, Date> = {};
    if (dateFrom) range.gte = new Date(dateFrom);
    if (dateTo) range.lte = new Date(dateTo);
    where.date = range;
  }

  const items = await prisma.transactionBancaire.findMany({
    where,
    orderBy: { date: "desc" },
  });
  return NextResponse.json(items);
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = await parseBody(req, createSchema);
  const item = await prisma.transactionBancaire.create({
    data: {
      montant: body.montant,
      date: new Date(body.date),
      libelle: body.libelle,
      reference: body.reference ?? null,
      sens: body.sens,
      categorie: body.categorie ?? null,
      factureId: body.factureId ?? null,
    },
  });
  return NextResponse.json(item, { status: 201 });
});
