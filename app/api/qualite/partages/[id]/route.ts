export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { parsePartialBody } from "@/lib/validations/helpers";

const updateSchema = z.object({
  nom: z.string().min(1),
  expireAt: z.string().optional().nullable(),
  actif: z.boolean(),
});

export const PUT = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const body = await parsePartialBody(req, updateSchema);
  const data: Record<string, unknown> = { ...body };
  if (typeof body.expireAt === "string") data.expireAt = new Date(body.expireAt);
  const item = await prisma.partageQualiopi.update({ where: { id: params.id }, data });
  return NextResponse.json(item);
});

export const DELETE = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  await prisma.partageQualiopi.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
});
