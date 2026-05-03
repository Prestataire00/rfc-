export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { parsePartialBody } from "@/lib/validations/helpers";

const updateSchema = z.object({
  nom: z.string().min(1),
  description: z.string().optional().nullable(),
  duree: z.number().int().nonnegative(),
  tarif: z.number().nonnegative().optional().nullable(),
  actif: z.boolean().optional(),
  categorie: z.string().optional().nullable(),
  niveau: z.string().optional().nullable(),
});

export const GET = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const item = await prisma.parcours.findUnique({
    where: { id: params.id },
    include: {
      modules: {
        include: { formation: true },
        orderBy: { ordre: "asc" },
      },
      sessions: { include: { session: true } },
    },
  });
  if (!item) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(item);
});

export const PUT = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const body = await parsePartialBody(req, updateSchema);
  const item = await prisma.parcours.update({ where: { id: params.id }, data: body });
  return NextResponse.json(item);
});

export const DELETE = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  await prisma.parcours.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
});
