export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";

const evalTemplateUpdateSchema = z.object({
  nom: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  type: z.string().max(60).optional().nullable(),
  questions: z.unknown().optional(),
  icon: z.string().max(50).optional().nullable(),
});

export const GET = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const template = await prisma.evaluationTemplate.findUnique({ where: { id: params.id } });
  if (!template) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(template);
});

export const PUT = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const existing = await prisma.evaluationTemplate.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (existing.preset) {
    return NextResponse.json(
      { error: "Ce template est un modele officiel. Dupliquez-le pour le modifier." },
      { status: 409 }
    );
  }

  const raw = await req.json().catch(() => null);
  const parsed = evalTemplateUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }
  const { nom, description, type, questions, icon } = parsed.data;

  const template = await prisma.evaluationTemplate.update({
    where: { id: params.id },
    data: {
      nom,
      description: description || null,
      type: type || "custom",
      questions: JSON.stringify(questions || []),
      ...(typeof icon !== "undefined" ? { icon: icon || null } : {}),
    },
  });
  return NextResponse.json(template);
});

export const DELETE = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const existing = await prisma.evaluationTemplate.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (existing.preset) {
    return NextResponse.json(
      { error: "Ce template est un modele officiel non supprimable." },
      { status: 409 }
    );
  }
  await prisma.evaluationTemplate.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
});
