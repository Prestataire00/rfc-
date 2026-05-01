export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";

export const GET = withErrorHandler(async () => {
  const rules = await prisma.automationRuleV2.findMany({
    orderBy: { ordre: "asc" },
    include: { _count: { select: { executions: true } } },
  });
  return NextResponse.json(rules);
});

export const POST = withErrorHandler(async (req: NextRequest) => {
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
});
