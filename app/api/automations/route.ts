export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { AUTOMATION_DEFAULTS } from "@/lib/automations";
import { withErrorHandler } from "@/lib/api-wrapper";

const automationRuleSchema = z
  .object({
    id: z.string().min(1),
    enabled: z.boolean().optional(),
    relativeTo: z.string().max(60).optional(),
    offsetDays: z.number().optional(),
    offsetHours: z.number().optional(),
    timeOfDay: z.string().max(20).optional().nullable(),
    canalEmail: z.boolean().optional(),
    templateId: z.string().optional().nullable(),
    label: z.string().max(200).optional(),
    description: z.string().max(2000).optional().nullable(),
  })
  .passthrough();

const automationsBulkSchema = z.object({
  rules: z.array(automationRuleSchema).max(200),
});

// GET /api/automations
// Retourne toutes les regles globales d'automatisation.
export const GET = withErrorHandler(async () => {
  // Seed a la demande si aucune regle existante
  const count = await prisma.automationRule.count();
  if (count === 0) {
    await Promise.all(
      AUTOMATION_DEFAULTS.map((d) =>
        prisma.automationRule.upsert({
          where: { id: d.id },
          create: d,
          update: {},
        })
      )
    );
  }
  const rules = await prisma.automationRule.findMany({ orderBy: { ordre: "asc" } });
  return NextResponse.json(rules);
});

// PUT /api/automations (bulk)
// Body: { rules: [{ id, ... }] }
export const PUT = withErrorHandler(async (req: NextRequest) => {
  const raw = await req.json().catch(() => null);
  const parsed = automationsBulkSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }
  const rules = parsed.data.rules;
  // Atomique : si une regle echoue, aucune n'est mise a jour (pas de config partielle).
  const results = await prisma.$transaction(async (tx) => {
    return Promise.all(
      rules.map((r: { id: string; [key: string]: unknown }) =>
        tx.automationRule.update({
          where: { id: r.id },
          data: {
            enabled: r.enabled as boolean,
            relativeTo: r.relativeTo as string,
            offsetDays: r.offsetDays as number,
            offsetHours: r.offsetHours as number,
            timeOfDay: (r.timeOfDay as string) || null,
            canalEmail: r.canalEmail as boolean,
            templateId: (r.templateId as string) || null,
            label: (r.label as string) || undefined,
            description: (r.description as string) || null,
          },
        })
      )
    );
  });
  return NextResponse.json({ updated: results.length });
});
