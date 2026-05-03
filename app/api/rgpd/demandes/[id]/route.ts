export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { parsePartialBody } from "@/lib/validations/helpers";

const updateSchema = z.object({
  type: z.string().min(1),
  demandeurEmail: z.string().email(),
  demandeurNom: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  statut: z.string(),
  dateTraitement: z.string().optional().nullable(),
  justificatif: z.string().optional().nullable(),
});

export const GET = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const item = await prisma.demandeRgpd.findUnique({ where: { id: params.id } });
  if (!item) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(item);
});

export const PUT = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const session = await getServerSession(authOptions);
  const body = await parsePartialBody(req, updateSchema);

  const data: Record<string, unknown> = { ...body };
  if (typeof body.dateTraitement === "string") data.dateTraitement = new Date(body.dateTraitement);

  // Si on passe en "traitee" ou "rejetee" et pas encore de traiteParUserId / dateTraitement
  if (body.statut && (body.statut === "traitee" || body.statut === "rejetee")) {
    if (!data.dateTraitement) data.dateTraitement = new Date();
    if (session?.user?.id) data.traiteParUserId = session.user.id;
  }

  const item = await prisma.demandeRgpd.update({ where: { id: params.id }, data });
  return NextResponse.json(item);
});

export const DELETE = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  await prisma.demandeRgpd.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
});
