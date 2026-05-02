export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";

// PUT /api/sessions/[id]/automations/[type]
// Cree/maj un override de la regle globale pour cette session.
export const PUT = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string; type: string } }) => {
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
});

// DELETE /api/sessions/[id]/automations/[type]
// Retire l'override, on revient a la regle globale.
export const DELETE = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string; type: string } }) => {
  await prisma.sessionAutomation.deleteMany({ where: { sessionId: params.id, type: params.type } });
  return NextResponse.json({ ok: true });
});
