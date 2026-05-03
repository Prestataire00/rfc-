export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { parsePartialBody } from "@/lib/validations/helpers";

const updateSchema = z.object({
  description: z.string().min(1),
  actionMenee: z.string().min(1),
  resultat: z.string().optional().nullable(),
  responsable: z.string().optional().nullable(),
  statut: z.string(),
  dateOuverture: z.string().optional(),
  dateCloture: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
});

export const GET = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const item = await prisma.actionQualite.findUnique({ where: { id: params.id } });
  if (!item) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(item);
});

export const PUT = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const body = await parsePartialBody(req, updateSchema);
  const data: Record<string, unknown> = { ...body };
  if (typeof body.dateOuverture === "string") data.dateOuverture = new Date(body.dateOuverture);
  if (typeof body.dateCloture === "string") data.dateCloture = new Date(body.dateCloture);
  const item = await prisma.actionQualite.update({ where: { id: params.id }, data });
  return NextResponse.json(item);
});

export const DELETE = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  await prisma.actionQualite.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
});
