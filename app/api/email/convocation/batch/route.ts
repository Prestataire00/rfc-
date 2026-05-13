export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail, convocationEmail } from "@/lib/email";
import { logAction } from "@/lib/historique";
import { generatePdfBuffer } from "@/lib/pdf/generate";
import { convocationPdf } from "@/lib/pdf/templates";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { withErrorHandler } from "@/lib/api-wrapper";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_PRESETS } from "@/lib/rate-limit-presets";

export const POST = withErrorHandler(async (req: NextRequest) => {
  // Rate-limit per-user (denial-of-wallet : chaque appel envoie N emails =
  // N appels SMTP facturés). Le middleware garantit qu'on a un user admin
  // ici — sinon la requête n'arrive pas.
  const userSession = await getServerSession(authOptions);
  const userId = (userSession?.user as { id?: string } | undefined)?.id;
  const limited = await enforceRateLimit(
    req,
    RATE_LIMIT_PRESETS.emailTrigger,
    "email:convocation:batch",
    userId,
  );
  if (limited) return limited;

  const { sessionId } = await req.json();

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId requis" }, { status: 400 });
  }

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
    return NextResponse.json({ error: "Session introuvable" }, { status: 404 });
  }

  const recipients = session.inscriptions.filter((i) => !!i.contact.email);

  if (recipients.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0, errors: [], message: "Aucun stagiaire avec email" });
  }

  const dateDebut = format(new Date(session.dateDebut), "dd/MM/yyyy", { locale: fr });
  const dateFin = format(new Date(session.dateFin), "dd/MM/yyyy", { locale: fr });

  let sent = 0;
  let failed = 0;
  const errors: Array<{ contactId: string; nom: string; error: string }> = [];

  // Sequential to avoid SMTP overload + per-recipient error handling
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
        })
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
        // SMTP not configured: count as failure with explicit message
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
            label: "Convocation envoyée à " + contact.prenom + " " + contact.nom,
            lien: "/sessions/" + sessionId,
            contactId: contact.id,
          });
        } catch (logErr) {
          logger.warn("historique.convocation_envoyee_failed", { error: String(logErr) });
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
      logger.error("convocation.batch_send_failed", err, { sessionId, contactId: contact.id });
    }
  }

  return NextResponse.json({ sent, failed, errors });
});
