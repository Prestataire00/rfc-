export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MESSAGE_TEMPLATE_DEFAULTS } from "@/lib/message-templates";

// GET /api/message-templates/[id]
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const tpl = await prisma.messageTemplate.findUnique({ where: { id: params.id } });
    if (!tpl) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    return NextResponse.json(tpl);
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// PUT /api/message-templates/[id]
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
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
  } catch (err) {
    console.error("PUT message-template:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST /api/message-templates/[id]/reset -> reinitialise au defaut (ou action via body)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
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
  } catch (err) {
    console.error("POST message-template action:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
