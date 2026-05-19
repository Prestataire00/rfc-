export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { withErrorHandler } from "@/lib/api-wrapper";

const evalTemplateCreateSchema = z.object({
  nom: z.string().min(1, "Nom requis").max(200),
  description: z.string().max(2000).optional().nullable(),
  type: z.string().max(60).optional().nullable(),
  questions: z.unknown().optional(),
  icon: z.string().max(50).optional().nullable(),
});

export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const presetParam = searchParams.get("preset");
  const type = searchParams.get("type");

  const where: { preset?: boolean; type?: string } = {};
  if (presetParam === "true") where.preset = true;
  if (presetParam === "false") where.preset = false;
  if (type) where.type = type;

  const templates = await prisma.evaluationTemplate.findMany({
    where,
    orderBy: [{ preset: "desc" }, { ordre: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(templates);
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const raw = await req.json().catch(() => null);
  const parsed = evalTemplateCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }
  const { nom, description, type, questions, icon } = parsed.data;

  const template = await prisma.evaluationTemplate.create({
    data: {
      id: "custom_" + randomUUID(),
      nom,
      description: description || null,
      type: type || "custom",
      questions: JSON.stringify(questions || []),
      icon: icon || null,
      preset: false, // Toujours false via l'API publique
    },
  });
  return NextResponse.json(template, { status: 201 });
});
