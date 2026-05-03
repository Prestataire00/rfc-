export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";
import { parseBody } from "@/lib/validations/helpers";

const createSchema = z.object({
  description: z.string().min(1),
  actionMenee: z.string().min(1),
  resultat: z.string().optional().nullable(),
  responsable: z.string().optional().nullable(),
  statut: z.string().optional(),
  dateOuverture: z.string().optional(),
  dateCloture: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
});

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const statut = searchParams.get("statut");
  const source = searchParams.get("source");

  const where: Record<string, unknown> = {};
  if (statut) where.statut = statut;
  if (source) where.source = source;

  const items = await prisma.actionQualite.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(items);
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = await parseBody(req, createSchema);
  const data: Record<string, unknown> = { ...body };
  if (typeof body.dateOuverture === "string") data.dateOuverture = new Date(body.dateOuverture);
  if (typeof body.dateCloture === "string") data.dateCloture = new Date(body.dateCloture);
  const item = await prisma.actionQualite.create({ data: data as never });
  return NextResponse.json(item, { status: 201 });
});
