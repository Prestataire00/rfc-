// POST /api/inscriptions/[id]/envoyer-attestation
// Envoi manuel (ou renvoi) de l'attestation de fin de formation pour une
// inscription. Permet à l'admin de forcer l'envoi sans attendre la
// transition session → "terminee", ou de renvoyer si l'auto-envoi a
// skippé (SMTP HS, contact maj plus tard, demande client).
//
// 200 OK { sent, destinataireEmail } | 502 si échec | 422 si pas d'email
// 404 si inscription introuvable

export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { sendAttestationToContact } from "@/lib/automations/auto-attestation";

export const POST = withErrorHandlerParams(
  async (_req: NextRequest, { params }: { params: { id: string } }) => {
    const inscription = await prisma.inscription.findUnique({
      where: { id: params.id },
      select: {
        contactId: true,
        sessionId: true,
        contact: { select: { email: true, prenom: true } },
      },
    });
    if (!inscription) {
      return NextResponse.json({ error: "Inscription introuvable" }, { status: 404 });
    }
    if (!inscription.contact?.email) {
      return NextResponse.json(
        {
          error: `${inscription.contact?.prenom ?? "Le contact"} n'a pas d'email — modifiez la fiche contact avant de renvoyer l'attestation.`,
        },
        { status: 422 },
      );
    }

    const result = await sendAttestationToContact(
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
        { error: `Email non envoyé : ${result.reason}` },
        { status: 502 },
      );
    }
    return NextResponse.json(
      { error: `Échec de l'envoi : ${result.error}` },
      { status: 502 },
    );
  },
);
