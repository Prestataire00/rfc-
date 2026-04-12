export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AUTOMATION_DEFAULTS } from "@/lib/automations";

// GET /api/automations
// Retourne toutes les regles globales d'automatisation.
export async function GET() {
  try {
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
  } catch (err) {
    console.error("GET automations:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// PUT /api/automations (bulk)
// Body: { rules: [{ id, ... }] }
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const rules = Array.isArray(body?.rules) ? body.rules : [];
    const results = await Promise.all(
      rules.map((r: { id: string; [key: string]: unknown }) =>
        prisma.automationRule.update({
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
    return NextResponse.json({ updated: results.length });
  } catch (err) {
    console.error("PUT automations:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
