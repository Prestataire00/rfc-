export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";

export const GET = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const demande = await prisma.demande.findUnique({
    where: { id: params.id },
    include: {
      entreprise: true,
      contact: { select: { id: true, nom: true, prenom: true, email: true, telephone: true, poste: true } },
      formation: true,
      devis: { include: { lignes: true } },
    },
  });

  if (!demande) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(demande);
});

export const PUT = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const body = await req.json();

  const demande = await prisma.demande.update({
    where: { id: params.id },
    data: {
      titre: body.titre,
      description: body.description || null,
      origine: body.origine,
      statut: body.statut,
      priorite: body.priorite,
      nbStagiaires: body.nbStagiaires ? parseInt(body.nbStagiaires) : null,
      datesSouhaitees: body.datesSouhaitees || null,
      budget: body.budget ? parseFloat(body.budget) : null,
      notes: body.notes || null,
      entrepriseId: body.entrepriseId || null,
      contactId: body.contactId || null,
      formationId: body.formationId || null,
      devisId: body.devisId || null,
      sourceContact: body.sourceContact || null,
      materielSurPlace: body.materielSurPlace ?? "[]",
      observation: body.observation || null,
    },
  });

  return NextResponse.json(demande);
});

export const PATCH = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.devisId !== undefined) data.devisId = body.devisId || null;
  if (body.statut !== undefined) data.statut = body.statut;

  // Charger la demande AVANT la mise à jour pour capturer l'ancien statut, devisId et contact
  const demandeBefore = await prisma.demande.findUnique({
    where: { id: params.id },
    select: {
      statut: true,
      devisId: true,
      contactId: true,
      contact: { select: { type: true } },
    },
  });

  const oldStatut = demandeBefore?.statut;
  const newStatut = body.statut;

  const demande = await prisma.demande.update({ where: { id: params.id }, data });

  // Auto-classification sur transition vers "accepte" :
  //   - Contact.type "prospect"  → "client"     (prospect entreprise/organisme accepté)
  //   - Contact.type "stagiaire" → reste "stagiaire" (prospect individuel accepté)
  //   - Contact.type "client"    → no-op (idempotent)
  if (
    newStatut === "accepte" &&
    oldStatut !== "accepte" &&
    demandeBefore?.contactId &&
    demandeBefore.contact?.type === "prospect"
  ) {
    await prisma.contact.update({
      where: { id: demandeBefore.contactId },
      data: { type: "client" },
    });
  }

  // Hook Phase 2 : génération auto devis IA sur transition nouveau→qualifie
  let aiResult: { generated: boolean; devisId?: string; error?: string } | undefined;
  if (oldStatut === "nouveau" && newStatut === "qualifie" && !demandeBefore?.devisId) {
    const { generateDevisFromDemandeWithAI } = await import("@/lib/ai/generate-devis-from-demande");
    const generation = await generateDevisFromDemandeWithAI(params.id);
    if ("devisId" in generation) {
      aiResult = { generated: true, devisId: generation.devisId };
    } else {
      aiResult = { generated: false, error: generation.error };
    }
  }

  return NextResponse.json({ ...demande, ai: aiResult });
});

export const DELETE = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  await prisma.demande.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
});
