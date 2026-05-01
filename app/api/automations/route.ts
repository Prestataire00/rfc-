export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AUTOMATION_DEFAULTS } from "@/lib/automations";
import { withErrorHandler } from "@/lib/api-wrapper";

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
  const body = await req.json();
  const rules = Array.isArray(body?.rules) ? body.rules : [];
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
