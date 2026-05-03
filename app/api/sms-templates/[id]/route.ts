export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { parsePartialBody } from "@/lib/validations/helpers";

const updateSchema = z.object({
  nom: z.string().min(1),
  description: z.string().optional().nullable(),
  contenu: z.string().min(1),
  variables: z.string().optional(),
  actif: z.boolean(),
});

export const GET = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const item = await prisma.smsTemplate.findUnique({ where: { id: params.id } });
  if (!item) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(item);
});

export const PUT = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const body = await parsePartialBody(req, updateSchema);
  const item = await prisma.smsTemplate.update({ where: { id: params.id }, data: body });
  return NextResponse.json(item);
});

export const DELETE = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  await prisma.smsTemplate.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
});
