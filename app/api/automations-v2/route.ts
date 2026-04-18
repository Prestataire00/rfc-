export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/automations-v2 — liste toutes les regles V2
export async function GET() {
  try {
    const rules = await prisma.automationRuleV2.findMany({
      orderBy: { ordre: "asc" },
      include: { _count: { select: { executions: true } } },
    });
    return NextResponse.json(rules);
  } catch (err) {
    console.error("GET automations-v2:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST /api/automations-v2 — creer une nouvelle regle
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rule = await prisma.automationRuleV2.create({
      data: {
        nom: body.nom || "Nouvelle regle",
        description: body.description || null,
        enabled: body.enabled ?? true,
        ordre: body.ordre ?? 0,
        trigger: body.trigger,
        conditions: typeof body.conditions === "string" ? body.conditions : JSON.stringify(body.conditions || []),
        delayType: body.delayType || "immediate",
        delayValue: body.delayValue || 0,
        actionType: body.actionType,
        actionConfig: typeof body.actionConfig === "string" ? body.actionConfig : JSON.stringify(body.actionConfig || {}),
        deduplicationKey: body.deduplicationKey || "session_contact",
      },
    });
    return NextResponse.json(rule, { status: 201 });
  } catch (err) {
    console.error("POST automations-v2:", err);
    return NextResponse.json({ error: "Erreur creation" }, { status: 500 });
  }
}
