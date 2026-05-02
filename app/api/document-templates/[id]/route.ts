export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DOCUMENT_TEMPLATE_DEFAULTS } from "@/lib/document-templates";
import { withErrorHandlerParams } from "@/lib/api-wrapper";

// GET /api/document-templates/[id]
export const GET = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const tpl = await prisma.documentTemplate.findUnique({ where: { id: params.id } });
  if (!tpl) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(tpl);
});

// PUT /api/document-templates/[id]
export const PUT = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const body = await req.json();
  const tpl = await prisma.documentTemplate.update({
    where: { id: params.id },
    data: {
      nom: body.nom,
      description: body.description || null,
      titre: body.titre,
      introduction: body.introduction ?? null,
      corps: body.corps,
      mentions: body.mentions ?? null,
      actif: body.actif !== undefined ? body.actif : undefined,
      modifie: true,
    },
  });
  return NextResponse.json(tpl);
});

// POST /api/document-templates/[id] {action: "reset"} -> reinitialise au defaut
export const POST = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const { action } = await req.json().catch(() => ({ action: "" }));
  if (action === "reset") {
    const def = DOCUMENT_TEMPLATE_DEFAULTS.find((d) => d.id === params.id);
    if (!def) return NextResponse.json({ error: "Pas de defaut pour ce template" }, { status: 404 });
    const tpl = await prisma.documentTemplate.update({
      where: { id: params.id },
      data: {
        nom: def.nom,
        description: def.description,
        titre: def.titre,
        introduction: def.introduction,
        corps: def.corps,
        mentions: def.mentions,
        variables: JSON.stringify(def.variables),
        modifie: false,
      },
    });
    return NextResponse.json(tpl);
  }
  return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
});
