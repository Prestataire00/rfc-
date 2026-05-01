export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";

// PUT /api/notes-frais/[id] — mise a jour (admin: changer statut, formateur: editer)
export const PUT = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const body = await req.json();
  const note = await prisma.noteFrais.update({
    where: { id: params.id },
    data: {
      statut: body.statut ?? undefined,
      commentaireAdmin: body.commentaireAdmin ?? undefined,
      datePaiement: body.statut === "payee" ? new Date() : undefined,
      categorie: body.categorie ?? undefined,
      description: body.description ?? undefined,
      montant: body.montant ?? undefined,
      date: body.date ? new Date(body.date) : undefined,
      lieu: body.lieu ?? undefined,
      justificatifUrl: body.justificatifUrl ?? undefined,
      justificatifNom: body.justificatifNom ?? undefined,
    },
  });
  return NextResponse.json(note);
});

// DELETE /api/notes-frais/[id]
export const DELETE = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  await prisma.noteFrais.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
});
