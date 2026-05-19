export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";

const documentUpdateSchema = z.object({
  nom: z.string().min(1).max(300).optional(),
  type: z.string().max(60).optional(),
  sessionId: z.string().optional().nullable(),
  formateurId: z.string().optional().nullable(),
  entrepriseId: z.string().optional().nullable(),
});

export const GET = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const document = await prisma.document.findUnique({
    where: { id: params.id },
    include: {
      session: { include: { formation: { select: { titre: true } } } },
      formateur: { select: { nom: true, prenom: true } },
      entreprise: { select: { nom: true } },
    },
  });

  if (!document) {
    return NextResponse.json({ error: "Document introuvable" }, { status: 404 });
  }

  return NextResponse.json(document);
});

export const PUT = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const raw = await req.json().catch(() => null);
  const parsed = documentUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }
  const body = parsed.data;

  const document = await prisma.document.update({
    where: { id: params.id },
    data: {
      nom: body.nom,
      type: body.type,
      sessionId: body.sessionId || null,
      formateurId: body.formateurId || null,
      entrepriseId: body.entrepriseId || null,
    },
  });

  return NextResponse.json(document);
});

export const DELETE = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  await prisma.document.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
});
