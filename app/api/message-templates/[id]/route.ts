export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { MESSAGE_TEMPLATE_DEFAULTS } from "@/lib/message-templates";
import { withErrorHandlerParams } from "@/lib/api-wrapper";

const messageTemplateUpdateSchema = z.object({
  nom: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  objet: z.string().min(1).max(300).optional(),
  contenu: z.string().min(1).max(50000).optional(),
  actif: z.boolean().optional(),
});

// GET /api/message-templates/[id]
export const GET = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const tpl = await prisma.messageTemplate.findUnique({ where: { id: params.id } });
  if (!tpl) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(tpl);
});

// PUT /api/message-templates/[id]
export const PUT = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const raw = await req.json().catch(() => null);
  const parsed = messageTemplateUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }
  const body = parsed.data;
  const tpl = await prisma.messageTemplate.update({
    where: { id: params.id },
    data: {
      nom: body.nom,
      description: body.description || null,
      objet: body.objet,
      contenu: body.contenu,
      actif: body.actif !== undefined ? body.actif : undefined,
      modifie: true,
    },
  });
  return NextResponse.json(tpl);
});

// POST /api/message-templates/[id]/reset -> reinitialise au defaut (ou action via body)
export const POST = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const { action } = await req.json().catch(() => ({ action: "" }));
  if (action === "reset") {
    const def = MESSAGE_TEMPLATE_DEFAULTS.find((d) => d.id === params.id);
    if (!def) return NextResponse.json({ error: "Pas de defaut pour ce template" }, { status: 404 });
    const tpl = await prisma.messageTemplate.update({
      where: { id: params.id },
      data: {
        nom: def.nom,
        description: def.description,
        objet: def.objet,
        contenu: def.contenu,
        variables: JSON.stringify(def.variables),
        modifie: false,
      },
    });
    return NextResponse.json(tpl);
  }
  return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
});
