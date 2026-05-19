export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";

const automationRuleUpdateSchema = z.object({
  enabled: z.boolean().optional(),
  relativeTo: z.string().max(60).optional(),
  offsetDays: z.number().optional(),
  offsetHours: z.number().optional(),
  timeOfDay: z.string().max(20).optional().nullable(),
  canalEmail: z.boolean().optional(),
  templateId: z.string().optional().nullable(),
  label: z.string().max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
});

// PUT /api/automations/[id] : met a jour une regle globale
export const PUT = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const raw = await req.json().catch(() => null);
  const parsed = automationRuleUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }
  const body = parsed.data;
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
});
