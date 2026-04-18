export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/campaigns — liste toutes les campagnes
export async function GET() {
  try {
    const campaigns = await prisma.marketingCampaign.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { recipients: true } } },
    });
    return NextResponse.json(campaigns);
  } catch (err) {
    console.error("GET campaigns:", err);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}

// POST /api/campaigns — creer une campagne
export async function POST(req: NextRequest) {
  try {
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
  } catch (err) {
    console.error("POST campaigns:", err);
    return NextResponse.json({ error: "Erreur creation" }, { status: 500 });
  }
}
