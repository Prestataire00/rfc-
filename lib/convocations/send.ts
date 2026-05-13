import "server-only";

import { format } from "date-fns";
import { fr } from "date-fns/locale";

import { prisma } from "@/lib/prisma";
import { sendEmail, convocationEmail } from "@/lib/email";
import { logAction } from "@/lib/historique";
import { generatePdfBuffer } from "@/lib/pdf/generate";
import { convocationPdf } from "@/lib/pdf/templates";
import { logger } from "@/lib/logger";

export type ConvocationBatchResult = {
  sent: number;
  failed: number;
  errors: Array<{ contactId: string; nom: string; error: string }>;
  message?: string;
};

/**
 * Envoie les convocations stagiaires pour une session : PDF + email à chaque
 * inscrit confirmé/présent avec email valide.
 *
 * Utilisée par :
 *   - POST /api/email/convocation/batch (déclenchement manuel admin)
 *   - GET  /api/cron/convocations (cron J-X automatique)
 *
 * Idempotence : déléguée à l'appelant. Cette fonction réenverra des emails
 * si elle est appelée 2× sur la même session — utiliser
 * Session.convocationsEnvoyeesAt côté caller pour gating.
 */
export async function sendConvocationsForSession(
  sessionId: string,
): Promise<ConvocationBatchResult> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      formation: true,
      formateur: true,
      inscriptions: {
        where: { statut: { in: ["confirmee", "presente"] } },
        include: { contact: true },
      },
    },
  });

  if (!session) {
    throw new Error(`Session introuvable: ${sessionId}`);
  }

  const recipients = session.inscriptions.filter((i) => !!i.contact.email);

  if (recipients.length === 0) {
    return {
      sent: 0,
      failed: 0,
      errors: [],
      message: "Aucun stagiaire avec email",
    };
  }

  const dateDebut = format(new Date(session.dateDebut), "dd/MM/yyyy", { locale: fr });
  const dateFin = format(new Date(session.dateFin), "dd/MM/yyyy", { locale: fr });

  let sent = 0;
  let failed = 0;
  const errors: ConvocationBatchResult["errors"] = [];

  // Sequential pour éviter de saturer le SMTP + gérer les erreurs par
  // destinataire (sinon un fail global perd les succès partiels).
  for (const inscription of recipients) {
    const { contact } = inscription;
    try {
      const pdfBuffer = await generatePdfBuffer(
        convocationPdf({
          stagiaire: { nom: contact.nom, prenom: contact.prenom, email: contact.email! },
          formation: { titre: session.formation.titre, duree: session.formation.duree },
          session: { dateDebut, dateFin, lieu: session.lieu || undefined },
          formateur: session.formateur
            ? { nom: session.formateur.nom, prenom: session.formateur.prenom }
            : undefined,
        }),
      );

      const emailContent = convocationEmail({
        stagiaire: { prenom: contact.prenom, nom: contact.nom },
        formation: { titre: session.formation.titre },
        session: { dateDebut, dateFin, lieu: session.lieu || undefined },
      });

      const result = await sendEmail({
        to: contact.email!,
        ...emailContent,
        attachments: [
          {
            filename: `convocation-${contact.prenom}-${contact.nom}.pdf`,
            content: pdfBuffer,
          },
        ],
      });

      if (result.skipped) {
        failed++;
        errors.push({
          contactId: contact.id,
          nom: `${contact.prenom} ${contact.nom}`,
          error: "SMTP non configure",
        });
      } else {
        sent++;
        try {
          await logAction({
            action: "convocation_envoyee",
            label: `Convocation envoyée à ${contact.prenom} ${contact.nom}`,
            lien: `/sessions/${sessionId}`,
            contactId: contact.id,
          });
        } catch (logErr) {
          logger.warn("historique.convocation_envoyee_failed", {
            error: String(logErr),
          });
        }
      }
    } catch (err) {
      failed++;
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      errors.push({
        contactId: contact.id,
        nom: `${contact.prenom} ${contact.nom}`,
        error: message,
      });
      logger.error("convocation.batch_send_failed", err, {
        sessionId,
        contactId: contact.id,
      });
    }
  }

  return { sent, failed, errors };
}
