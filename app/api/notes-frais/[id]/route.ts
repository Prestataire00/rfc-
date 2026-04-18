export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PUT /api/notes-frais/[id] — mise a jour (admin: changer statut, formateur: editer)
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
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
  } catch (err) {
    console.error("PUT notes-frais/[id]:", err);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}

// DELETE /api/notes-frais/[id]
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.noteFrais.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE notes-frais/[id]:", err);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}
