export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendEmail, convocationEmail } from "@/lib/email";
import { logAction } from "@/lib/historique";
import { generatePdfBuffer } from "@/lib/pdf/generate";
import { convocationPdf } from "@/lib/pdf/templates";
import { getParametres } from "@/lib/parametres";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { withErrorHandler } from "@/lib/api-wrapper";
import { logger } from "@/lib/logger";

const convocationSchema = z.object({
  sessionId: z.string().min(1, "sessionId requis"),
  contactId: z.string().min(1, "contactId requis"),
});

export const POST = withErrorHandler(async (req: NextRequest) => {
  const raw = await req.json().catch(() => null);
  const parsed = convocationSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }
  const { sessionId, contactId } = parsed.data;

  const [session, contact, parametres] = await Promise.all([
    prisma.session.findUnique({
      where: { id: sessionId },
      include: { formation: true, formateur: true },
    }),
    prisma.contact.findUnique({ where: { id: contactId } }),
    getParametres(),
  ]);

  if (!session || !contact) {
    return NextResponse.json({ error: "Session ou contact introuvable" }, { status: 404 });
  }

  if (!contact.email) {
    return NextResponse.json({ error: "Le contact n'a pas d'email" }, { status: 400 });
  }

  const dateDebut = format(new Date(session.dateDebut), "dd/MM/yyyy", { locale: fr });
  const dateFin = format(new Date(session.dateFin), "dd/MM/yyyy", { locale: fr });

  // Generate PDF
  const pdfBuffer = await generatePdfBuffer(
    convocationPdf({
      stagiaire: { nom: contact.nom, prenom: contact.prenom, email: contact.email },
      formation: { titre: session.formation.titre, duree: session.formation.duree },
      session: { dateDebut, dateFin, lieu: session.lieu || undefined, horaires: session.horaires || parametres.horairesDefaut || undefined },
      formateur: session.formateur
        ? { nom: session.formateur.nom, prenom: session.formateur.prenom }
        : undefined,
    })
  );

  // Send email
  const emailContent = convocationEmail({
    stagiaire: { prenom: contact.prenom, nom: contact.nom },
    formation: { titre: session.formation.titre },
    session: { dateDebut, dateFin, lieu: session.lieu || undefined },
  });

  const result = await sendEmail({
    to: contact.email,
    ...emailContent,
    attachments: [
      {
        filename: `convocation-${contact.prenom}-${contact.nom}.pdf`,
        content: pdfBuffer,
      },
    ],
  });

  try {
    await logAction({
      action: "convocation_envoyee",
      label: "Convocation envoyée à " + contact.prenom + " " + contact.nom,
      lien: "/sessions/" + sessionId,
      contactId: contactId,
    });
  } catch (logErr) {
    logger.warn("historique.convocation_envoyee_failed", { error: String(logErr) });
  }

  return NextResponse.json({ success: true, skipped: result.skipped });
});
