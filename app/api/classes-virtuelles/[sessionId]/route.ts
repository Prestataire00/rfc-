export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";

// GET /api/classes-virtuelles/[sessionId]
export const GET = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { sessionId: string } }) => {
  const cv = await prisma.classeVirtuelle.findUnique({ where: { sessionId: params.sessionId } });
  if (!cv) return NextResponse.json(null);
  return NextResponse.json(cv);
});

// PUT /api/classes-virtuelles/[sessionId] — creer ou mettre a jour
export const PUT = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { sessionId: string } }) => {
  const body = await req.json();
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
