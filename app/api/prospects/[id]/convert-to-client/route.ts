// POST /api/prospects/[id]/convert-to-client
// Bouton manuel : convertit le Contact rattaché à la demande en type="client".
// Idempotent : si déjà client, renvoie 200 sans rien changer.

export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { logAction } from "@/lib/historique";
import { logger } from "@/lib/logger";

export const POST = withErrorHandlerParams(
  async (_req: NextRequest, { params }: { params: { id: string } }) => {
    const demande = await prisma.demande.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        contactId: true,
        entrepriseId: true,
        contact: { select: { id: true, nom: true, prenom: true, type: true } },
      },
    });

    if (!demande) {
      return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
    }
    if (!demande.contactId || !demande.contact) {
      return NextResponse.json(
        { error: "Aucun contact rattaché à cette demande" },
        { status: 422 },
      );
    }

    if (demande.contact.type === "client") {
      return NextResponse.json({
        contactId: demande.contact.id,
        alreadyClient: true,
      });
    }

    const updated = await prisma.contact.update({
      where: { id: demande.contactId },
      data: { type: "client" },
      select: { id: true, type: true },
    });

    try {
      await logAction({
        action: "prospect_converti_client",
        label: `Prospect converti en client : ${demande.contact.prenom} ${demande.contact.nom}`,
        lien: `/prospects/${demande.id}`,
        contactId: demande.contactId,
        entrepriseId: demande.entrepriseId ?? undefined,
      });
    } catch (e) {
      logger.warn("historique.convert_client_failed", { error: String(e) });
    }

    return NextResponse.json({ contactId: updated.id, type: updated.type });
  },
);
