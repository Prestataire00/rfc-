export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";

export const GET = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
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
});

export const PUT = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
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
});

export const DELETE = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  await prisma.automationRuleV2.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
});
