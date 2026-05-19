export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";

const sessionAutomationSchema = z.object({
  enabled: z.boolean().optional().nullable(),
  relativeTo: z.string().max(60).optional().nullable(),
  offsetDays: z.union([z.number(), z.string()]).optional().nullable(),
  offsetHours: z.union([z.number(), z.string()]).optional().nullable(),
  timeOfDay: z.string().max(20).optional().nullable(),
  canalEmail: z.boolean().optional().nullable(),
  templateId: z.string().optional().nullable(),
});

// PUT /api/sessions/[id]/automations/[type]
// Cree/maj un override de la regle globale pour cette session.
export const PUT = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string; type: string } }) => {
  const raw = await req.json().catch(() => null);
  const parsed = sessionAutomationSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }
  const body = parsed.data;
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
