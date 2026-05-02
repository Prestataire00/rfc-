export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";

// GET /api/badges/[id]
export const GET = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const badge = await prisma.digitalBadge.findUnique({
    where: { id: params.id },
    include: {
      formation: { select: { id: true, titre: true } },
      awards: {
        where: { revoque: false },
        include: { contact: { select: { id: true, nom: true, prenom: true, email: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!badge) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(badge);
});

// PUT /api/badges/[id]
export const PUT = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const body = await req.json();
  const badge = await prisma.digitalBadge.update({
    where: { id: params.id },
    data: {
      nom: body.nom ?? undefined,
      description: body.description ?? undefined,
      icone: body.icone ?? undefined,
      niveau: body.niveau ?? undefined,
      couleur: body.couleur ?? undefined,
      formationId: body.formationId !== undefined ? (body.formationId || null) : undefined,
      actif: body.actif ?? undefined,
    },
  });
  return NextResponse.json(badge);
});

// DELETE /api/badges/[id]
export const DELETE = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  await prisma.digitalBadge.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
});
