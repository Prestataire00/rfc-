export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";

const noteFraisUpdateSchema = z.object({
  statut: z.string().max(60).optional().nullable(),
  commentaireAdmin: z.string().max(2000).optional().nullable(),
  categorie: z.string().max(60).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  montant: z.number().optional().nullable(),
  date: z.string().optional().nullable(),
  lieu: z.string().max(200).optional().nullable(),
  justificatifUrl: z.string().max(500).optional().nullable(),
  justificatifNom: z.string().max(300).optional().nullable(),
});

// PUT /api/notes-frais/[id] — mise a jour (admin: changer statut, formateur: editer)
export const PUT = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const raw = await req.json().catch(() => null);
  const parsed = noteFraisUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }
  const body = parsed.data;
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
