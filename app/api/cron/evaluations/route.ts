export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { sendEmail, evaluationEmail } from "@/lib/email";
import { withErrorHandler } from "@/lib/api-wrapper";

// Called by cron job to auto-send evaluations. Les délais chaud/froid sont
// CONFIGURABLES (Parametres.evalOffsetChaud / evalOffsetFroid, en jours après
// la fin de session ; défauts 1 et 21). Distinction chaud/froid conservée.
export const GET = withErrorHandler(async (req: NextRequest) => {
  // CRON_SECRET obligatoire (sinon n'importe qui peut déclencher l'envoi
  // massif d'emails d'évaluation → DoS SMTP + spam stagiaires).
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "Server misconfigured: CRON_SECRET missing" },
      { status: 500 },
    );
  }
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  // Délais configurables (jours après la fin de session). Défauts 1 / 21.
  const parametres = await prisma.parametres.findUnique({
    where: { id: "default" },
    select: { evalOffsetChaud: true, evalOffsetFroid: true },
  });
  const offsetChaud = parametres?.evalOffsetChaud ?? 1;
  const offsetFroid = parametres?.evalOffsetFroid ?? 21;

  // Fenêtre du jour = sessions dont dateFin = (aujourd'hui - offset jours).
  const windowFor = (offsetJours: number): { gte: Date; lte: Date } => {
    const d = new Date(now);
    d.setDate(d.getDate() - offsetJours);
    const gte = new Date(d);
    gte.setHours(0, 0, 0, 0);
    const lte = new Date(d);
    lte.setHours(23, 59, 59, 999);
    return { gte, lte };
  };
  const fenetreChaud = windowFor(offsetChaud);
  const fenetreFroid = windowFor(offsetFroid);

  // Snapshot des templates presets (pour figer le questionnaire au moment de l'envoi)
  const [presetChaud, presetFroid] = await Promise.all([
    prisma.evaluationTemplate.findUnique({ where: { id: "preset_satisfaction_chaud" } }),
    prisma.evaluationTemplate.findUnique({ where: { id: "preset_satisfaction_froid" } }),
  ]);
  const snapshotChaud = presetChaud?.questions || null;
  const snapshotFroid = presetFroid?.questions || null;

  let chaudSent = 0;
  let froidSent = 0;

  // Find sessions for chaud (fin de session il y a `offsetChaud` jours)
  const sessionsChaud = await prisma.session.findMany({
    where: {
      dateFin: { gte: fenetreChaud.gte, lte: fenetreChaud.lte },
      statut: { in: ["terminee", "en_cours"] },
    },
    include: {
      formation: { select: { titre: true } },
      inscriptions: {
        where: { statut: { in: ["confirmee", "presente"] } },
        include: { contact: { select: { id: true, prenom: true, nom: true, email: true } } },
      },
    },
  });

  for (const session of sessionsChaud) {
    for (const inscription of session.inscriptions) {
      if (!inscription.contact.email) continue;

      // Check if already exists
      const existing = await prisma.evaluation.findFirst({
        where: { sessionId: session.id, contactId: inscription.contactId, type: "satisfaction_chaud" },
      });
      if (existing) continue;

      const token = randomBytes(32).toString("hex");
      await prisma.evaluation.create({
        data: {
          type: "satisfaction_chaud",
          cible: "stagiaire",
          sessionId: session.id,
          contactId: inscription.contactId,
          tokenAcces: token,
          questionsSnapshot: snapshotChaud,
        },
      });

      const lien = `${baseUrl}/evaluation/${token}`;
      await sendEmail({
        to: inscription.contact.email,
        ...evaluationEmail({
          stagiaire: { prenom: inscription.contact.prenom, nom: inscription.contact.nom },
          formation: { titre: session.formation.titre },
          type: "satisfaction_chaud",
          lien,
        }),
      });
      chaudSent++;
    }
  }

  // Find sessions for froid (fin de session il y a `offsetFroid` jours)
  const sessionsFroid = await prisma.session.findMany({
    where: {
      dateFin: { gte: fenetreFroid.gte, lte: fenetreFroid.lte },
      statut: "terminee",
    },
    include: {
      formation: { select: { titre: true } },
      inscriptions: {
        where: { statut: { in: ["confirmee", "presente"] } },
        include: { contact: { select: { id: true, prenom: true, nom: true, email: true } } },
      },
    },
  });

  for (const session of sessionsFroid) {
    for (const inscription of session.inscriptions) {
      if (!inscription.contact.email) continue;

      const existing = await prisma.evaluation.findFirst({
        where: { sessionId: session.id, contactId: inscription.contactId, type: "satisfaction_froid" },
      });
      if (existing) continue;

      const token = randomBytes(32).toString("hex");
      await prisma.evaluation.create({
        data: {
          type: "satisfaction_froid",
          cible: "stagiaire",
          sessionId: session.id,
          contactId: inscription.contactId,
          tokenAcces: token,
          questionsSnapshot: snapshotFroid,
        },
      });

      const lien = `${baseUrl}/evaluation/${token}`;
      await sendEmail({
        to: inscription.contact.email,
        ...evaluationEmail({
          stagiaire: { prenom: inscription.contact.prenom, nom: inscription.contact.nom },
          formation: { titre: session.formation.titre },
          type: "satisfaction_froid",
          lien,
        }),
      });
      froidSent++;
    }
  }

  return NextResponse.json({
    chaudSent,
    froidSent,
    sessionsChaud: sessionsChaud.length,
    sessionsFroid: sessionsFroid.length,
    timestamp: now.toISOString(),
  });
});
