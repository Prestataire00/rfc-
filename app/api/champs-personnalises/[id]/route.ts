export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { parsePartialBody } from "@/lib/validations/helpers";

const updateSchema = z.object({
  nom: z.string().min(1),
  label: z.string().min(1),
  type: z.string().min(1),
  entiteCible: z.string().min(1),
  options: z.unknown().optional().nullable(),
  obligatoire: z.boolean(),
  ordre: z.number().int(),
  actif: z.boolean(),
});

export const GET = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const item = await prisma.champPersonnalise.findUnique({ where: { id: params.id } });
  if (!item) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(item);
});

export const PUT = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const body = await parsePartialBody(req, updateSchema);
  const item = await prisma.champPersonnalise.update({
    where: { id: params.id },
    data: body as never,
  });
  return NextResponse.json(item);
});

export const DELETE = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  await prisma.champPersonnalise.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
});
