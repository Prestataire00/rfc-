export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";

const campaignUpdateSchema = z.object({
  nom: z.string().max(200).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  type: z.string().max(60).optional().nullable(),
  objet: z.string().max(300).optional().nullable(),
  contenu: z.string().max(50000).optional().nullable(),
  templateId: z.string().optional().nullable(),
  segmentConfig: z.unknown().optional(),
  dateEnvoi: z.string().optional().nullable(),
  statut: z.string().max(60).optional().nullable(),
});

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
  const raw = await req.json().catch(() => null);
  const parsed = campaignUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }
  const body = parsed.data;
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
