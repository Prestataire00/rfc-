// POST /api/formateur/sessions/[id]/envoyer-evaluations
//
// Permet au formateur d'envoyer des questionnaires d'évaluation aux
// stagiaires inscrits sur SES sessions. Body : { type: "satisfaction_chaud"
// | "satisfaction_froid" | "acquis" }.
//
// Workflow :
//   1. Auth formateur + check ownership (session.formateurId = user.formateurId)
//   2. Pour chaque inscription confirmée/présente :
//      - Si une Evaluation du même type existe et est complète → skip
//      - Sinon : crée Evaluation (avec tokenAcces unique) + envoie l'email
//   3. Retourne { sent, created, skipped, errors }
//
// Réutilise sendEmail + evaluationEmail de lib/email pour cohérence avec
// l'envoi auto admin (/api/email/evaluation, /api/cron/evaluations).

export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { z } from "zod";
import { sendEmail, evaluationEmail } from "@/lib/email";
import { randomBytes } from "node:crypto";
import { logger } from "@/lib/logger";

const TYPES_AUTORISES = ["satisfaction_chaud", "satisfaction_froid", "acquis"] as const;

const bodySchema = z.object({
  type: z.enum(TYPES_AUTORISES),
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
      { error: "Type d'évaluation invalide", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }
  const { type } = parsed.data;

  // 1. Charger la session + check ownership
  const sessionRow = await prisma.session.findUnique({
    where: { id: params.id },
    include: {
      formation: { select: { titre: true } },
      inscriptions: {
        where: { statut: { in: ["confirmee", "presente"] } },
        include: { contact: { select: { id: true, prenom: true, nom: true, email: true } } },
      },
      evaluations: { where: { type }, select: { id: true, contactId: true, estComplete: true, tokenAcces: true } },
    },
  });

  if (!sessionRow) return NextResponse.json({ error: "Session introuvable" }, { status: 404 });
  if (sessionRow.formateurId !== formateurId) {
    return NextResponse.json({ error: "Vous n'êtes pas le formateur de cette session" }, { status: 403 });
  }

  if (sessionRow.inscriptions.length === 0) {
    return NextResponse.json({ error: "Aucun stagiaire confirmé sur cette session" }, { status: 400 });
  }

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  let sent = 0;
  let created = 0;
  let skipped = 0;
  const errors: { stagiaire: string; raison: string }[] = [];

  for (const insc of sessionRow.inscriptions) {
    const contact = insc.contact;
    if (!contact?.email) {
      skipped++;
      errors.push({ stagiaire: `${contact?.prenom} ${contact?.nom}`.trim() || insc.contactId, raison: "Email manquant" });
      continue;
    }

    // Évaluation existante (même type, même contact)
    let evaluation = sessionRow.evaluations.find((e) => e.contactId === contact.id);
    if (evaluation?.estComplete) {
      skipped++;
      continue; // déjà répondue, on ne renvoie pas
    }
    if (!evaluation) {
      // Création : token aléatoire URL-safe
      const tokenAcces = randomBytes(24).toString("base64url");
      const newEval = await prisma.evaluation.create({
        data: {
          type,
          cible: "stagiaire",
          sessionId: sessionRow.id,
          contactId: contact.id,
          tokenAcces,
        },
        select: { id: true, contactId: true, estComplete: true, tokenAcces: true },
      });
      evaluation = newEval;
      created++;
    }

    if (!evaluation.tokenAcces) {
      skipped++;
      errors.push({ stagiaire: `${contact.prenom} ${contact.nom}`, raison: "Token manquant" });
      continue;
    }

    try {
      const mail = evaluationEmail({
        stagiaire: { prenom: contact.prenom, nom: contact.nom },
        formation: { titre: sessionRow.formation.titre },
        type,
        lien: `${baseUrl}/evaluation/${evaluation.tokenAcces}`,
      });
      const result = await sendEmail({
        to: contact.email,
        subject: mail.subject,
        html: mail.html,
        log: { sessionId: sessionRow.id, contactId: contact.id },
      });
      if (result.skipped) {
        skipped++;
      } else {
        sent++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur envoi";
      logger.warn("formateur.envoyer-evaluations.send-failed", { contactId: contact.id, error: msg });
      errors.push({ stagiaire: `${contact.prenom} ${contact.nom}`, raison: msg });
    }
  }

  return NextResponse.json({
    sent,
    created,
    skipped,
    total: sessionRow.inscriptions.length,
    errors,
  });
});
