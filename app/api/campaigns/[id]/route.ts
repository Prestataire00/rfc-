export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";

// GET /api/campaigns/[id]
export const GET = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const campaign = await prisma.marketingCampaign.findUnique({
    where: { id: params.id },
    include: {
      recipients: {
        orderBy: { createdAt: "desc" },
        take: 100,
      },
    },
  });
  if (!campaign) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(campaign);
});

// PUT /api/campaigns/[id]
export const PUT = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const body = await req.json();
  const campaign = await prisma.marketingCampaign.update({
    where: { id: params.id },
    data: {
      nom: body.nom ?? undefined,
      description: body.description ?? undefined,
      type: body.type ?? undefined,
      objet: body.objet ?? undefined,
      contenu: body.contenu ?? undefined,
      templateId: body.templateId ?? undefined,
      segmentConfig: body.segmentConfig !== undefined
        ? (typeof body.segmentConfig === "string" ? body.segmentConfig : JSON.stringify(body.segmentConfig))
        : undefined,
      dateEnvoi: body.dateEnvoi ? new Date(body.dateEnvoi) : undefined,
      statut: body.statut ?? undefined,
    },
  });
  return NextResponse.json(campaign);
});

// DELETE /api/campaigns/[id]
export const DELETE = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  await prisma.marketingCampaign.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
});
