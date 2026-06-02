// POST /api/formateur/sessions/[id]/envoyer-emargement
//
// Permet au formateur de déclencher MANUELLEMENT l'envoi des feuilles
// de présence pour une session + une date + un créneau spécifiques
// (en complément du cron auto matin/après-midi).
//
// Body : { date: "YYYY-MM-DD", creneau: "matin" | "apres_midi" }
//
// Auth : formateur + check ownership de la session.
// Workflow identique au cron quotidien :
//   - Crée un EmargementToken par stagiaire confirmé (si pas déjà fait)
//   - Envoie l'email avec lien /emargement/[token]
//   - Idempotent : skip si un token non utilisé existe déjà

export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { z } from "zod";
import { sendEmail } from "@/lib/email";
import { renderMessageTemplate } from "@/lib/message-templates";
import { randomBytes } from "node:crypto";
import { addHours } from "date-fns";
import { logger } from "@/lib/logger";

const bodySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date attendue au format YYYY-MM-DD"),
  creneau: z.enum(["matin", "apres_midi"]),
});

export const POST = withErrorHandlerParams<{ id: string }>(async (req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "formateur") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const formateurId = (session.user as { formateurId?: string }).formateurId;
  if (!formateurId) {
    return NextResponse.json({ error: "Profil formateur incomplet" }, { status: 403 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Paramètres invalides", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }
  const { date: dateStr, creneau } = parsed.data;

  // Date du créneau (UTC 00:00 pour cohérence avec le cron auto)
  const dateObj = new Date(`${dateStr}T00:00:00.000Z`);

  // 1. Charge la session + check ownership + inscriptions
  const sessionRow = await prisma.session.findUnique({
    where: { id: params.id },
    include: {
      formation: { select: { titre: true, duree: true } },
      inscriptions: {
        where: { statut: { in: ["confirmee", "presente"] } },
        include: { contact: { select: { id: true, prenom: true, nom: true, email: true } } },
      },
    },
  });

  if (!sessionRow) return NextResponse.json({ error: "Session introuvable" }, { status: 404 });
  if (sessionRow.formateurId !== formateurId) {
    return NextResponse.json({ error: "Vous n'êtes pas le formateur de cette session" }, { status: 403 });
  }

  // Vérifie que la date demandée tombe dans la fenêtre de la session.
  const debut = new Date(sessionRow.dateDebut);
  debut.setUTCHours(0, 0, 0, 0);
  const fin = new Date(sessionRow.dateFin);
  fin.setUTCHours(0, 0, 0, 0);
  if (dateObj < debut || dateObj > fin) {
    return NextResponse.json(
      { error: `La date ${dateStr} n'est pas dans la période de la session (${debut.toISOString().slice(0, 10)} → ${fin.toISOString().slice(0, 10)}).` },
      { status: 400 },
    );
  }

  if (sessionRow.inscriptions.length === 0) {
    return NextResponse.json({ error: "Aucun stagiaire confirmé sur cette session" }, { status: 400 });
  }

  const baseUrl = process.env.NEXTAUTH_URL || "https://projetrfc.netlify.app";
  let sent = 0;
  let skipped = 0;
  const errors: { stagiaire: string; raison: string }[] = [];
  const creneauLabel = creneau === "matin" ? "matin" : "après-midi";

  for (const insc of sessionRow.inscriptions) {
    const contact = insc.contact;
    if (!contact?.email) {
      skipped++;
      errors.push({ stagiaire: `${contact?.prenom} ${contact?.nom}`.trim() || insc.contactId, raison: "Email manquant" });
      continue;
    }

    // Skip si un token non utilisé non-expiré existe déjà pour ce slot
    const existing = await prisma.emargementToken.findFirst({
      where: {
        sessionId: sessionRow.id,
        contactId: contact.id,
        date: dateObj,
        creneau,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    });
    if (existing) {
      skipped++;
      continue;
    }

    const token = randomBytes(24).toString("hex");
    await prisma.emargementToken.create({
      data: {
        sessionId: sessionRow.id,
        contactId: contact.id,
        date: dateObj,
        creneau,
        token,
        expiresAt: addHours(new Date(), 24),
      },
    });

    const lien = `${baseUrl}/emargement/${token}`;

    try {
      const tpl = await renderMessageTemplate("emargement_otp", {
        stagiaire: { prenom: contact.prenom, nom: contact.nom },
        formation: { titre: sessionRow.formation.titre },
        session: { dateDebut: dateStr, lieu: sessionRow.lieu || "" },
        lien,
      });
      if (tpl) {
        await sendEmail({
          to: contact.email,
          subject: tpl.subject,
          html: tpl.html,
          log: { sessionId: sessionRow.id, contactId: contact.id },
        });
      } else {
        await sendEmail({
          to: contact.email,
          subject: `Émargement — ${sessionRow.formation.titre} (${creneauLabel})`,
          html: `<p>Bonjour ${contact.prenom},</p><p>Veuillez signer votre feuille de présence du ${creneauLabel} du ${dateStr} :</p><p><a href="${lien}" style="background:#dc2626;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Signer ma présence</a></p><p style="color:#666;font-size:12px;margin-top:24px;">Lien valable 24h.</p>`,
          log: { sessionId: sessionRow.id, contactId: contact.id },
        });
      }
      sent++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur envoi";
      logger.warn("formateur.envoyer-emargement.send-failed", { contactId: contact.id, error: msg });
      errors.push({ stagiaire: `${contact.prenom} ${contact.nom}`, raison: msg });
    }
  }

  return NextResponse.json({
    date: dateStr,
    creneau,
    sent,
    skipped,
    total: sessionRow.inscriptions.length,
    errors,
  });
});
