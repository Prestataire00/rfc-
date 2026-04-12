export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AUTOMATION_DEFAULTS } from "@/lib/automations";

// GET /api/sessions/[id]/automations
// Retourne la liste fusionnee : regle globale + override eventuel
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const [globals, overrides] = await Promise.all([
      prisma.automationRule.findMany({ orderBy: { ordre: "asc" } }),
      prisma.sessionAutomation.findMany({ where: { sessionId: params.id } }),
    ]);

    // Seed si aucune regle globale
    let globalRules = globals;
    if (globalRules.length === 0) {
      await Promise.all(
        AUTOMATION_DEFAULTS.map((d) =>
          prisma.automationRule.upsert({ where: { id: d.id }, create: d, update: {} })
        )
      );
      globalRules = await prisma.automationRule.findMany({ orderBy: { ordre: "asc" } });
    }

    const overrideMap = new Map(overrides.map((o) => [o.type, o]));

    const merged = globalRules.map((g) => {
      const o = overrideMap.get(g.type);
      return {
        type: g.type,
        label: g.label,
        description: g.description,
        ordre: g.ordre,
        enabled: o?.enabled ?? g.enabled,
        relativeTo: o?.relativeTo ?? g.relativeTo,
        offsetDays: o?.offsetDays ?? g.offsetDays,
        offsetHours: o?.offsetHours ?? g.offsetHours,
        timeOfDay: o?.timeOfDay ?? g.timeOfDay,
        canalEmail: o?.canalEmail ?? g.canalEmail,
        templateId: o?.templateId ?? g.templateId,
        executedAt: o?.executedAt ?? null,
        executionLog: o?.executionLog ?? null,
        isOverride: !!o,
      };
    });

    return NextResponse.json(merged);
  } catch (err) {
    console.error("GET session automations:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
