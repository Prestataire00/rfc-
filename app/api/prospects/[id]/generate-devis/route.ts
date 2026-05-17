// POST /api/prospects/[id]/generate-devis
// Génère un devis brouillon via IA (Phase 2) sans changer Demande.statut.
// La Demande reste "nouveau" tant que l'admin n'a pas effectivement envoyé
// le devis (Devis.statut → "envoye" déclenche le sync auto vers "devis_envoye").

export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";

export const POST = withErrorHandlerParams(
  async (_req: NextRequest, { params }: { params: { id: string } }) => {
    const demande = await prisma.demande.findUnique({
      where: { id: params.id },
      select: { id: true, devisId: true },
    });
    if (!demande) {
      return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
    }
    if (demande.devisId) {
      return NextResponse.json(
        { error: "Un devis existe déjà pour cette demande", devisId: demande.devisId },
        { status: 409 },
      );
    }

    const { generateDevisFromDemandeWithAI } = await import(
      "@/lib/ai/generate-devis-from-demande"
    );
    const result = await generateDevisFromDemandeWithAI(params.id);

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({ devisId: result.devisId, generated: true });
  },
);
