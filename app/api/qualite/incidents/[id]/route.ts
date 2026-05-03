export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { parsePartialBody } from "@/lib/validations/helpers";

const updateSchema = z.object({
  nom: z.string().min(1),
  description: z.string().min(1),
  source: z.string().min(1),
  sujet: z.string().min(1),
  gravite: z.string().min(1),
  dateIncident: z.string(),
  actionMenee: z.string().optional().nullable(),
  statut: z.string(),
});

export const GET = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const item = await prisma.incidentQualite.findUnique({ where: { id: params.id } });
  if (!item) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(item);
});

export const PUT = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const body = await parsePartialBody(req, updateSchema);
  const data: Record<string, unknown> = { ...body };
  if (typeof body.dateIncident === "string") data.dateIncident = new Date(body.dateIncident);
  const item = await prisma.incidentQualite.update({ where: { id: params.id }, data });
  return NextResponse.json(item);
});

export const DELETE = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  await prisma.incidentQualite.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
});
