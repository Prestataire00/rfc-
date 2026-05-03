export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";
import { parseBody } from "@/lib/validations/helpers";

const createSchema = z.object({
  formateurId: z.string().min(1),
  sessionId: z.string().optional().nullable(),
  montantHT: z.number().nonnegative(),
  tauxTVA: z.number().nonnegative().optional(),
  montantTTC: z.number().nonnegative(),
  datePrestation: z.string(),
  dateEmission: z.string().optional(),
  datePaiement: z.string().optional().nullable(),
  statut: z.string().optional(),
  fichierUrl: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

function pad(n: number, len = 4): string {
  return String(n).padStart(len, "0");
}

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const formateurId = searchParams.get("formateurId");
  const statut = searchParams.get("statut");
  const sessionId = searchParams.get("sessionId");

  const where: Record<string, unknown> = {};
  if (formateurId) where.formateurId = formateurId;
  if (statut) where.statut = statut;
  if (sessionId) where.sessionId = sessionId;

  const items = await prisma.factureFormateur.findMany({
    where,
    include: {
      formateur: { select: { id: true, nom: true, prenom: true } },
      session: { select: { id: true, dateDebut: true, formationId: true } },
    },
    orderBy: { dateEmission: "desc" },
  });
  return NextResponse.json(items);
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = await parseBody(req, createSchema);

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = pad(now.getMonth() + 1, 2);
  const prefix = `FAC-FORM-${yyyy}-${mm}-`;
  const count = await prisma.factureFormateur.count({ where: { numero: { startsWith: prefix } } });
  const numero = `${prefix}${pad(count + 1)}`;

  const item = await prisma.factureFormateur.create({
    data: {
      numero,
      formateurId: body.formateurId,
      sessionId: body.sessionId ?? null,
      montantHT: body.montantHT,
      tauxTVA: body.tauxTVA ?? 20,
      montantTTC: body.montantTTC,
      datePrestation: new Date(body.datePrestation),
      dateEmission: body.dateEmission ? new Date(body.dateEmission) : new Date(),
      datePaiement: body.datePaiement ? new Date(body.datePaiement) : null,
      statut: body.statut ?? "a_payer",
      fichierUrl: body.fichierUrl ?? null,
      notes: body.notes ?? null,
    },
  });
  return NextResponse.json(item, { status: 201 });
});
