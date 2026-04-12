export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PUT /api/sessions/[id]/automations/[type]
// Cree/maj un override de la regle globale pour cette session.
export async function PUT(req: NextRequest, { params }: { params: { id: string; type: string } }) {
  try {
    const body = await req.json();
    const data = {
      sessionId: params.id,
      type: params.type,
      enabled: Boolean(body.enabled ?? true),
      relativeTo: String(body.relativeTo ?? "dateDebut"),
      offsetDays: Number(body.offsetDays ?? 0),
      offsetHours: Number(body.offsetHours ?? 0),
      timeOfDay: body.timeOfDay ? String(body.timeOfDay) : null,
      canalEmail: Boolean(body.canalEmail ?? true),
      templateId: body.templateId ? String(body.templateId) : null,
    };
    const override = await prisma.sessionAutomation.upsert({
      where: { sessionId_type: { sessionId: params.id, type: params.type } },
      create: data,
      update: {
        enabled: data.enabled,
        relativeTo: data.relativeTo,
        offsetDays: data.offsetDays,
        offsetHours: data.offsetHours,
        timeOfDay: data.timeOfDay,
        canalEmail: data.canalEmail,
        templateId: data.templateId,
      },
    });
    return NextResponse.json(override);
  } catch (err) {
    console.error("PUT session automation override:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// DELETE /api/sessions/[id]/automations/[type]
// Retire l'override, on revient a la regle globale.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string; type: string } }) {
  try {
    await prisma.sessionAutomation.deleteMany({ where: { sessionId: params.id, type: params.type } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE session automation override:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
