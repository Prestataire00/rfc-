export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/automations-v2/[id] — detail d'une regle + dernieres executions
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const rule = await prisma.automationRuleV2.findUnique({
      where: { id: params.id },
      include: {
        executions: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });
    if (!rule) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    return NextResponse.json(rule);
  } catch (err) {
    console.error("GET automations-v2/[id]:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// PUT /api/automations-v2/[id] — mettre a jour une regle
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const rule = await prisma.automationRuleV2.update({
      where: { id: params.id },
      data: {
        nom: body.nom,
        description: body.description ?? undefined,
        enabled: body.enabled ?? undefined,
        ordre: body.ordre ?? undefined,
        trigger: body.trigger ?? undefined,
        conditions: body.conditions !== undefined
          ? (typeof body.conditions === "string" ? body.conditions : JSON.stringify(body.conditions))
          : undefined,
        delayType: body.delayType ?? undefined,
        delayValue: body.delayValue ?? undefined,
        actionType: body.actionType ?? undefined,
        actionConfig: body.actionConfig !== undefined
          ? (typeof body.actionConfig === "string" ? body.actionConfig : JSON.stringify(body.actionConfig))
          : undefined,
        deduplicationKey: body.deduplicationKey ?? undefined,
      },
    });
    return NextResponse.json(rule);
  } catch (err) {
    console.error("PUT automations-v2/[id]:", err);
    return NextResponse.json({ error: "Erreur mise a jour" }, { status: 500 });
  }
}

// DELETE /api/automations-v2/[id]
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.automationRuleV2.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE automations-v2/[id]:", err);
    return NextResponse.json({ error: "Erreur suppression" }, { status: 500 });
  }
}
