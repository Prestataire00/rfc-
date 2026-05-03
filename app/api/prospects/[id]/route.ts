export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { parsePartialBody } from "@/lib/validations/helpers";

const updateSchema = z.object({
  nom: z.string().min(1),
  prenom: z.string().min(1),
  email: z.string().email().optional().nullable(),
  telephone: z.string().optional().nullable(),
  entreprise: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  statut: z.string(),
  score: z.number().int().min(0).max(100).optional().nullable(),
  notes: z.string().optional().nullable(),
  attribueA: z.string().optional().nullable(),
  dateProchaineAction: z.string().optional().nullable(),
  contactId: z.string().optional().nullable(),
});

export const GET = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const item = await prisma.prospect.findUnique({
    where: { id: params.id },
    include: {
      contact: true,
      activities: { orderBy: { date: "desc" } },
    },
  });
  if (!item) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(item);
});

export const PUT = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const body = await parsePartialBody(req, updateSchema);
  const data: Record<string, unknown> = { ...body };
  if (typeof body.dateProchaineAction === "string") {
    data.dateProchaineAction = new Date(body.dateProchaineAction);
  }
  const item = await prisma.prospect.update({ where: { id: params.id }, data });
  return NextResponse.json(item);
});

export const DELETE = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  await prisma.prospect.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
});
