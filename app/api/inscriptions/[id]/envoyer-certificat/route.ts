// POST /api/inscriptions/[id]/envoyer-certificat
// Envoi manuel (ou renvoi) du certificat de réalisation pour une inscription.
// Filet de sécurité quand l'envoi auto à la clôture de session a skippé,
// ou pour forcer l'envoi avant clôture.

export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { sendCertificatToContact } from "@/lib/automations/auto-certificat";

export const POST = withErrorHandlerParams(
  async (_req: NextRequest, { params }: { params: { id: string } }) => {
    const inscription = await prisma.inscription.findUnique({
      where: { id: params.id },
      select: { contactId: true, sessionId: true },
    });
    if (!inscription) {
      return NextResponse.json({ error: "Inscription introuvable" }, { status: 404 });
    }

    const result = await sendCertificatToContact(
      inscription.sessionId,
      inscription.contactId,
    );

    if (result.status === "sent") {
      return NextResponse.json({
        success: true,
        destinataireEmail: result.destinataireEmail,
      });
    }
    if (result.status === "skipped") {
      return NextResponse.json(
        { error: result.reason },
        { status: 422 },
      );
    }
    return NextResponse.json(
      { error: `Échec de l'envoi : ${result.error}` },
      { status: 502 },
    );
  },
);
