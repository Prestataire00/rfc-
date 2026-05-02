export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";

export const GET = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const besoin = await prisma.besoinFormation.findUnique({
    where: { id: params.id },
    include: {
      entreprise: true,
      contact: { select: { id: true, nom: true, prenom: true, email: true, telephone: true, poste: true } },
      formation: true,
      devis: { include: { lignes: true } },
    },
  });

  if (!besoin) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(besoin);
});

export const PUT = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const body = await req.json();

  const besoin = await prisma.besoinFormation.update({
    where: { id: params.id },
    data: {
      titre: body.titre,
      description: body.description || null,
      origine: body.origine,
      statut: body.statut,
      priorite: body.priorite,
      nbStagiaires: body.nbStagiaires ? parseInt(body.nbStagiaires) : null,
      datesSouhaitees: body.datesSouhaitees || null,
      budget: body.budget ? parseFloat(body.budget) : null,
      notes: body.notes || null,
      entrepriseId: body.entrepriseId || null,
      contactId: body.contactId || null,
      formationId: body.formationId || null,
      devisId: body.devisId || null,
    },
  });

  return NextResponse.json(besoin);
});

export const PATCH = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.devisId !== undefined) data.devisId = body.devisId || null;
  if (body.statut !== undefined) data.statut = body.statut;
  const besoin = await prisma.besoinFormation.update({ where: { id: params.id }, data });
  return NextResponse.json(besoin);
});

export const DELETE = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  await prisma.besoinFormation.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
});
