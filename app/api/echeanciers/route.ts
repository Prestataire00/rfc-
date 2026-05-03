export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";
import { parseBody } from "@/lib/validations/helpers";

const echeanceSchema = z.object({
  factureId: z.string().min(1),
  montant: z.number().positive(),
  dateEcheance: z.string(),
  statut: z.string().optional(),
  datePaiement: z.string().optional().nullable(),
});

const createSchema = z.union([
  echeanceSchema,
  z.object({ echeances: z.array(echeanceSchema).min(1) }),
]);

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const factureId = searchParams.get("factureId");
  const statut = searchParams.get("statut");

  const where: Record<string, unknown> = {};
  if (factureId) where.factureId = factureId;
  if (statut) where.statut = statut;

  const items = await prisma.echeancierPaiement.findMany({
    where,
    orderBy: { dateEcheance: "asc" },
  });
  return NextResponse.json(items);
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = await parseBody(req, createSchema);

  if ("echeances" in body) {
    const created = await prisma.$transaction(
      body.echeances.map((e) =>
        prisma.echeancierPaiement.create({
          data: {
            factureId: e.factureId,
            montant: e.montant,
            dateEcheance: new Date(e.dateEcheance),
            statut: e.statut ?? "en_attente",
            datePaiement: e.datePaiement ? new Date(e.datePaiement) : null,
          },
        })
      )
    );
    return NextResponse.json(created, { status: 201 });
  }

  const item = await prisma.echeancierPaiement.create({
    data: {
      factureId: body.factureId,
      montant: body.montant,
      dateEcheance: new Date(body.dateEcheance),
      statut: body.statut ?? "en_attente",
      datePaiement: body.datePaiement ? new Date(body.datePaiement) : null,
    },
  });
  return NextResponse.json(item, { status: 201 });
});
