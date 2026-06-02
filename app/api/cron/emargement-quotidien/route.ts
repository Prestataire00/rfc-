// GET /api/cron/emargement-quotidien?creneau=matin|apres_midi
//
// Cron déclenché 2× par jour (matin ~7h30 UTC / après-midi ~12h30 UTC)
// via GitHub Actions Scheduled. Pour chaque session de formation en cours
// ce jour, envoie un lien d'émargement individuel à chaque stagiaire
// confirmé.
//
// Workflow :
//   1. Auth Bearer CRON_SECRET
//   2. Détermine le créneau cible (query ?creneau= ou déduit de l'heure UTC)
//   3. Cherche les sessions actives ce jour (dateDebut <= today <= dateFin)
//      ET dont le statut autorise l'émargement (confirmee, en_cours)
//   4. Pour chaque inscription confirmée/présente, vérifie qu'aucun
//      EmargementToken non-utilisé n'existe déjà pour ce slot, sinon crée
//      le token + envoie l'email avec lien /emargement/[token]
//   5. Idempotent : ré-exécution dans la même fenêtre = skip (le token
//      précédent reste valide 24h).
//
// Retourne { sent, skipped, errors, sessions, slots }.

export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { renderMessageTemplate } from "@/lib/message-templates";
import { randomBytes } from "node:crypto";
import { addHours } from "date-fns";

function authCheck(req: Request): NextResponse | null {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET(req: Request) {
  const authErr = authCheck(req);
  if (authErr) return authErr;

  const url = new URL(req.url);
  const creneauParam = url.searchParams.get("creneau");
  const creneau: "matin" | "apres_midi" =
    creneauParam === "matin" || creneauParam === "apres_midi"
      ? creneauParam
      : new Date().getUTCHours() < 12
        ? "matin"
        : "apres_midi";

  // Date du jour (00:00 UTC) — utilisée comme clé pour le token et la
  // détection des sessions actives.
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  // Sessions actives ce jour
  const sessions = await prisma.session.findMany({
    where: {
      statut: { in: ["confirmee", "en_cours"] },
      dateDebut: { lt: tomorrow },
      dateFin: { gte: today },
    },
    include: {
      formation: { select: { titre: true, duree: true } },
      inscriptions: {
        where: { statut: { in: ["confirmee", "presente"] } },
        include: { contact: { select: { id: true, prenom: true, nom: true, email: true } } },
      },
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL || "https://projetrfc.netlify.app";
  let sent = 0;
  let skipped = 0;
  const errors: { sessionId: string; contactId: string; reason: string }[] = [];
  let totalSlots = 0;

  for (const sessionRow of sessions) {
    for (const insc of sessionRow.inscriptions) {
      totalSlots++;
      const contact = insc.contact;
      if (!contact?.email) {
        skipped++;
        errors.push({ sessionId: sessionRow.id, contactId: insc.contactId, reason: "Email manquant" });
        continue;
      }

      // Skip si un token non-utilisé non-expiré existe déjà pour ce slot
      const existing = await prisma.emargementToken.findFirst({
        where: {
          sessionId: sessionRow.id,
          contactId: contact.id,
          date: today,
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
          date: today,
          creneau,
          token,
          expiresAt: addHours(new Date(), 24),
        },
      });

      const lien = `${baseUrl}/emargement/${token}`;
      const dateStr = today.toISOString().slice(0, 10);
      const creneauLabel = creneau === "matin" ? "matin" : "après-midi";

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
        errors.push({ sessionId: sessionRow.id, contactId: contact.id, reason: msg });
      }
    }
  }

  return NextResponse.json({
    creneau,
    date: today.toISOString().slice(0, 10),
    sessions: sessions.length,
    slots: totalSlots,
    sent,
    skipped,
    errors,
  });
}
