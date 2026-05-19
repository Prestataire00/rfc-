export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";

const automationV2CreateSchema = z.object({
  nom: z.string().max(200).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  enabled: z.boolean().optional(),
  ordre: z.number().optional(),
  trigger: z.string().min(1, "trigger requis").max(60),
  conditions: z.unknown().optional(),
  delayType: z.string().max(40).optional(),
  delayValue: z.number().optional(),
  actionType: z.string().min(1, "actionType requis").max(60),
  actionConfig: z.unknown().optional(),
  deduplicationKey: z.string().max(120).optional().nullable(),
});

export const GET = withErrorHandler(async () => {
  const rules = await prisma.automationRuleV2.findMany({
    orderBy: { ordre: "asc" },
    include: { _count: { select: { executions: true } } },
  });
  return NextResponse.json(rules);
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const raw = await req.json().catch(() => null);
  const parsed = automationV2CreateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }
  const body = parsed.data;
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
