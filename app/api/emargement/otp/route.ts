export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { renderMessageTemplate } from "@/lib/message-templates";
import { randomBytes } from "crypto";
import { addHours } from "date-fns";
import { withErrorHandler } from "@/lib/api-wrapper";

const emargementOtpSchema = z.object({
  sessionId: z.string().min(1, "sessionId requis"),
  contactId: z.string().min(1, "contactId requis"),
  date: z.string().min(1, "date requise"),
  creneau: z.enum(["matin", "apres_midi"]),
});

// POST /api/emargement/otp
// Envoie un lien OTP par email a un stagiaire pour qu'il signe a distance.
// Body: { sessionId, contactId, date, creneau }
// Note : token cree avant l'envoi email — pas dans la meme tx que l'email.
export const POST = withErrorHandler(async (req: NextRequest) => {
  const raw = await req.json().catch(() => null);
  const parsed = emargementOtpSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation échouée", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }
  const { sessionId, contactId, date, creneau } = parsed.data;

  const [session, contact] = await Promise.all([
    prisma.session.findUnique({
      where: { id: sessionId },
      include: { formation: { select: { titre: true, duree: true } } },
    }),
    prisma.contact.findUnique({ where: { id: contactId } }),
  ]);

  if (!session || !contact) {
    return NextResponse.json({ error: "Session ou contact introuvable" }, { status: 404 });
  }

  const dateObj = new Date(`${date}T00:00:00.000Z`);
  const token = randomBytes(24).toString("hex");

  // Creer le token OTP (individuel : contactId set)
  await prisma.emargementToken.create({
    data: {
      sessionId,
      contactId,
      date: dateObj,
      creneau,
      token,
      expiresAt: addHours(new Date(), 24),
    },
  });

  // Construire le lien
  const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "https://projetrfc.netlify.app";
  const lien = `${baseUrl}/emargement/${token}`;

  // Rendre le template email
  const tpl = await renderMessageTemplate("emargement_otp", {
    stagiaire: { prenom: contact.prenom, nom: contact.nom },
    formation: { titre: session.formation.titre },
    session: { dateDebut: date, lieu: session.lieu || "" },
    lien,
  });

  if (tpl) {
    await sendEmail({
      to: contact.email,
      subject: tpl.subject,
      html: tpl.html,
    });
  } else {
    // Fallback si pas de template
    const creneauLabel = creneau === "matin" ? "matin" : "apres-midi";
    await sendEmail({
      to: contact.email,
      subject: `Emargement - ${session.formation.titre}`,
      html: `<p>Bonjour ${contact.prenom},</p><p>Veuillez signer votre feuille de presence (${creneauLabel} du ${date}) :</p><p><a href="${lien}" style="background:#dc2626;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Signer ma presence</a></p>`,
    });
  }

  return NextResponse.json({ ok: true, token });
});
