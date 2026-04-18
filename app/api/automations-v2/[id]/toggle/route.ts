export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH /api/automations-v2/[id]/toggle — active/desactive une regle
export async function PATCH(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const rule = await prisma.automationRuleV2.findUnique({ where: { id: params.id } });
    if (!rule) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

    const updated = await prisma.automationRuleV2.update({
      where: { id: params.id },
      data: { enabled: !rule.enabled },
    });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("PATCH toggle:", err);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}
