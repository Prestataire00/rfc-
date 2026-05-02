export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";

// GET /api/campaigns — liste toutes les campagnes
export const GET = withErrorHandler(async () => {
  const campaigns = await prisma.marketingCampaign.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { recipients: true } } },
  });
  return NextResponse.json(campaigns);
});

// POST /api/campaigns — creer une campagne
export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = await req.json();
  const campaign = await prisma.marketingCampaign.create({
    data: {
      nom: body.nom || "Nouvelle campagne",
      description: body.description || null,
      type: body.type || "email",
      objet: body.objet || null,
      contenu: body.contenu || null,
      templateId: body.templateId || null,
      segmentConfig: typeof body.segmentConfig === "string"
        ? body.segmentConfig
        : JSON.stringify(body.segmentConfig || {}),
      dateEnvoi: body.dateEnvoi ? new Date(body.dateEnvoi) : null,
    },
  });
  return NextResponse.json(campaign, { status: 201 });
});
