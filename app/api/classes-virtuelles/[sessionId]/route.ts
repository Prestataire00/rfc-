export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";

const classeVirtuelleSchema = z.object({
  lienVisio: z.string().max(500).optional().nullable(),
  plateformeVisio: z.string().max(60).optional().nullable(),
  enregistrementUrl: z.string().max(500).optional().nullable(),
  enregistrementDisponibleJusqua: z.string().optional().nullable(),
  ressources: z.unknown().optional(),
  notes: z.string().max(5000).optional().nullable(),
});

// GET /api/classes-virtuelles/[sessionId]
export const GET = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { sessionId: string } }) => {
  const cv = await prisma.classeVirtuelle.findUnique({ where: { sessionId: params.sessionId } });
  if (!cv) return NextResponse.json(null);
  return NextResponse.json(cv);
});

// PUT /api/classes-virtuelles/[sessionId] — creer ou mettre a jour
export const PUT = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { sessionId: string } }) => {
  const raw = await req.json().catch(() => null);
  const parsed = classeVirtuelleSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }
  const body = parsed.data;
  const cv = await prisma.classeVirtuelle.upsert({
    where: { sessionId: params.sessionId },
    create: {
      sessionId: params.sessionId,
      lienVisio: body.lienVisio || null,
      plateformeVisio: body.plateformeVisio || null,
      enregistrementUrl: body.enregistrementUrl || null,
      enregistrementDisponibleJusqua: body.enregistrementDisponibleJusqua
        ? new Date(body.enregistrementDisponibleJusqua)
        : null,
      ressources: typeof body.ressources === "string"
        ? body.ressources
        : JSON.stringify(body.ressources || []),
      notes: body.notes || null,
    },
    update: {
      lienVisio: body.lienVisio ?? undefined,
      plateformeVisio: body.plateformeVisio ?? undefined,
      enregistrementUrl: body.enregistrementUrl ?? undefined,
      enregistrementDisponibleJusqua: body.enregistrementDisponibleJusqua !== undefined
        ? (body.enregistrementDisponibleJusqua ? new Date(body.enregistrementDisponibleJusqua) : null)
        : undefined,
      ressources: body.ressources !== undefined
        ? (typeof body.ressources === "string" ? body.ressources : JSON.stringify(body.ressources))
        : undefined,
      notes: body.notes ?? undefined,
    },
  });
  return NextResponse.json(cv);
});
