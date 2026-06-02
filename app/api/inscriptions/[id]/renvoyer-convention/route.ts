// POST /api/inscriptions/[id]/renvoyer-convention
// Force le renvoi de la convention de formation pour une inscription existante.
// Filet de sécurité quand l'envoi auto (déclenché à la création de
// l'inscription) a échoué silencieusement (SMTP HS, contact maj plus tard,
// etc.) — l'admin peut relancer depuis l'UI sans recréer l'inscription.
//
// Réutilise sendConventionOnInscription qui gère tout (PDF + email + log +
// notif). Pas d'idempotence : volontairement, on peut renvoyer N fois si
// besoin (perte de mail, demande client).
//
// Réponses :
//   - 200 OK { success: true } si la chaîne s'est exécutée (peut quand
//     même skip si pas d'email côté helper, vérifié côté UI via les logs)
//   - 404 si l'inscription n'existe pas
//   - 422 si le contact n'a pas d'email (vérification amont avant tentative)

export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { sendConventionOnInscription } from "@/lib/automations/auto-convention";

export const POST = withErrorHandlerParams(
  async (_req: NextRequest, { params }: { params: { id: string } }) => {
    const inscription = await prisma.inscription.findUnique({
      where: { id: params.id },
      include: {
        contact: { select: { email: true, prenom: true, nom: true } },
      },
    });
    if (!inscription) {
      return NextResponse.json({ error: "Inscription introuvable" }, { status: 404 });
    }
    if (!inscription.contact?.email) {
      return NextResponse.json(
        { error: `${inscription.contact?.prenom ?? "Le contact"} n'a pas d'email — modifiez la fiche contact avant de renvoyer la convention.` },
        { status: 422 },
      );
    }

    // Le helper gère tout (PDF + email + log + notif). Erreur déjà loggée
    // côté helper, donc on remonte un message générique.
    try {
      await sendConventionOnInscription(inscription.id);
      return NextResponse.json({
        success: true,
        destinataireEmail: inscription.contact.email,
      });
    } catch {
      return NextResponse.json(
        { error: "Échec de l'envoi (consultez /logs/emails pour le détail)" },
        { status: 502 },
      );
    }
  },
);
