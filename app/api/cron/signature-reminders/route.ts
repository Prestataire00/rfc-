// Cron quotidien 9h UTC — envoie rappels J-3 et J-1 aux signataires des
// SignatureRequest statut "sent" ou "viewed" qui n'ont pas encore signé.
// Spec §"Cas d'erreur" (Expiration → rappels). Auth Bearer CRON_SECRET.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

async function authCheck(req: Request): Promise<NextResponse | null> {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

// Fenêtre : "expire dans T jours ± 12h" pour matcher quel que soit le moment de la journée.
const HOUR = 60 * 60_000;
const DAY = 24 * HOUR;
const WINDOW_HOURS = 12;

async function run() {
  const now = new Date();
  const targets: Array<{ days: number; label: string }> = [
    { days: 3, label: "dans 3 jours" },
    { days: 1, label: "demain" },
  ];

  let sent = 0;
  for (const t of targets) {
    const target = now.getTime() + t.days * DAY;
    const min = new Date(target - WINDOW_HOURS * HOUR);
    const max = new Date(target + WINDOW_HOURS * HOUR);
    const due = await prisma.signatureRequest.findMany({
      where: {
        statut: { in: ["sent", "viewed"] },
        expiresAt: { gte: min, lte: max },
      },
      include: { signataire: true },
      take: 200,
    });
    for (const r of due) {
      if (!r.signataire || r.signataire.statut === "signed" || r.signataire.statut === "declined") {
        continue;
      }
      await sendEmail({
        to: r.signataire.email,
        subject: `Rappel : document à signer — expire ${t.label}`,
        html: `<p>Bonjour ${r.signataire.nom},</p><p>Vous n'avez pas encore signé le document <b>${r.titre}</b>. Il expire ${t.label}.</p><p>Le lien magique vous a été envoyé précédemment par email. Si vous ne le retrouvez pas, contactez l'expéditeur.</p>`,
      });
      sent++;
    }
  }
  return { remindersSent: sent };
}

export async function GET(req: Request) {
  const u = await authCheck(req);
  if (u) return u;
  return NextResponse.json(await run());
}

export async function POST(req: Request) {
  const u = await authCheck(req);
  if (u) return u;
  return NextResponse.json(await run());
}
