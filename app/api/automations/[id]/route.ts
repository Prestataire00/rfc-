export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PUT /api/automations/[id] : met a jour une regle globale
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const rule = await prisma.automationRule.update({
      where: { id: params.id },
      data: {
        enabled: body.enabled,
        relativeTo: body.relativeTo,
        offsetDays: body.offsetDays,
        offsetHours: body.offsetHours,
        timeOfDay: body.timeOfDay || null,
        canalEmail: body.canalEmail,
        templateId: body.templateId || null,
        label: body.label,
        description: body.description || null,
      },
    });
    return NextResponse.json(rule);
  } catch (err) {
    console.error("PUT automation rule:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
