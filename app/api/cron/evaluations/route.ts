import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { sendEmail, evaluationEmail } from "@/lib/email";

// Called by cron job to auto-send evaluations
// - satisfaction_chaud: J+1 after session ends
// - satisfaction_froid: J+21 (3 weeks) after session ends
export async function GET(req: NextRequest) {
  try {
    // Optional: protect with a secret
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    // J+1: sessions ended yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const startOfYesterday = new Date(yesterday.setHours(0, 0, 0, 0));
    const endOfYesterday = new Date(yesterday.setHours(23, 59, 59, 999));

    // J+21: sessions ended 3 weeks ago
    const day21ago = new Date(now);
    day21ago.setDate(day21ago.getDate() - 21);
    const startOf21 = new Date(day21ago.setHours(0, 0, 0, 0));
    const endOf21 = new Date(day21ago.setHours(23, 59, 59, 999));

    let chaudSent = 0;
    let froidSent = 0;

    // Find sessions for chaud (ended yesterday)
    const sessionsChaud = await prisma.session.findMany({
      where: {
        dateFin: { gte: startOfYesterday, lte: endOfYesterday },
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

    // Find sessions for froid (ended 3 weeks ago)
    const sessionsFroid = await prisma.session.findMany({
      where: {
        dateFin: { gte: startOf21, lte: endOf21 },
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
  } catch (err: unknown) {
    console.error("Erreur cron evaluations:", err);
    return NextResponse.json({ error: "Erreur lors de l'envoi automatique des evaluations" }, { status: 500 });
  }
}
