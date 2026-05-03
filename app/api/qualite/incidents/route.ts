export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";
import { parseBody } from "@/lib/validations/helpers";

const createSchema = z.object({
  nom: z.string().min(1),
  description: z.string().min(1),
  source: z.string().min(1),
  sujet: z.string().min(1),
  gravite: z.string().min(1),
  dateIncident: z.string(),
  actionMenee: z.string().optional().nullable(),
  statut: z.string().optional(),
});

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const statut = searchParams.get("statut");
  const source = searchParams.get("source");
  const gravite = searchParams.get("gravite");

  const where: Record<string, unknown> = {};
  if (statut) where.statut = statut;
  if (source) where.source = source;
  if (gravite) where.gravite = gravite;

  const items = await prisma.incidentQualite.findMany({
    where,
    orderBy: { dateIncident: "desc" },
  });
  return NextResponse.json(items);
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = await parseBody(req, createSchema);
  const item = await prisma.incidentQualite.create({
    data: {
      ...body,
      dateIncident: new Date(body.dateIncident),
    },
  });
  return NextResponse.json(item, { status: 201 });
});
