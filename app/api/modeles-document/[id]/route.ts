export const dynamic = "force-dynamic";

// GET    /api/modeles-document/[id]  — recupere un modele
// PUT    /api/modeles-document/[id]  — edite un modele
// DELETE /api/modeles-document/[id]  — soft delete (actif = false)

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { modeleDocumentSaveSchema } from "@/lib/validations/modele-document";

export const GET = withErrorHandlerParams<{ id: string }>(
  async (_req: NextRequest, { params }) => {
    const modele = await prisma.modeleDocumentIA.findUnique({
      where: { id: params.id },
    });
    if (!modele) {
      return NextResponse.json({ error: "Modele introuvable" }, { status: 404 });
    }
    return NextResponse.json(modele);
  },
);

export const PUT = withErrorHandlerParams<{ id: string }>(
  async (req: NextRequest, { params }) => {
    const body = await req.json().catch(() => null);
    const data = modeleDocumentSaveSchema.parse(body);

    const modele = await prisma.modeleDocumentIA.update({
      where: { id: params.id },
      data: {
        nom: data.nom,
        description: data.description ?? null,
        titre: data.titre,
        introduction: data.introduction ?? null,
        corps: data.corps,
        mentions: data.mentions ?? null,
        variables: JSON.stringify(data.variables ?? []),
      },
    });

    return NextResponse.json(modele);
  },
);

export const DELETE = withErrorHandlerParams<{ id: string }>(
  async (_req: NextRequest, { params }) => {
    // Soft delete : on conserve l'historique, on masque le modele des listes.
    await prisma.modeleDocumentIA.update({
      where: { id: params.id },
      data: { actif: false },
    });
    return NextResponse.json({ ok: true });
  },
);
