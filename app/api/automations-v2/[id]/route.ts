export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";

const automationV2UpdateSchema = z.object({
  nom: z.string().max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  enabled: z.boolean().optional(),
  ordre: z.number().optional(),
  trigger: z.string().max(60).optional(),
  conditions: z.unknown().optional(),
  delayType: z.string().max(40).optional(),
  delayValue: z.number().optional(),
  actionType: z.string().max(60).optional(),
  actionConfig: z.unknown().optional(),
  deduplicationKey: z.string().max(120).optional().nullable(),
});

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
  const raw = await req.json().catch(() => null);
  const parsed = automationV2UpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }
  const body = parsed.data;
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
