export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";
import { parseBody } from "@/lib/validations/helpers";

const createSchema = z.object({
  nom: z.string().min(1),
  prenom: z.string().min(1),
  email: z.string().email().optional().nullable(),
  telephone: z.string().optional().nullable(),
  entreprise: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  statut: z.string().optional(),
  score: z.number().int().min(0).max(100).optional().nullable(),
  notes: z.string().optional().nullable(),
  attribueA: z.string().optional().nullable(),
  dateProchaineAction: z.string().optional().nullable(),
  contactId: z.string().optional().nullable(),
});

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const statut = searchParams.get("statut");
  const attribueA = searchParams.get("attribueA");

  const where: Record<string, unknown> = {};
  if (statut) where.statut = statut;
  if (attribueA) where.attribueA = attribueA;

  const items = await prisma.prospect.findMany({
    where,
    include: { _count: { select: { activities: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(items);
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = await parseBody(req, createSchema);
  const data = {
    ...body,
    dateProchaineAction: body.dateProchaineAction ? new Date(body.dateProchaineAction) : null,
  };
  const item = await prisma.prospect.create({ data });
  return NextResponse.json(item, { status: 201 });
});
