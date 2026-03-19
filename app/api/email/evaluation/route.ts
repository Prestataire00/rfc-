import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, evaluationEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const { sessionId, type } = await req.json();

  const evaluations = await prisma.evaluation.findMany({
    where: { sessionId, type, estComplete: false },
    include: {
      contact: { select: { prenom: true, nom: true, email: true } },
      session: { include: { formation: { select: { titre: true } } } },
    },
  });

  if (evaluations.length === 0) {
    return NextResponse.json({ error: "Aucune évaluation à envoyer" }, { status: 400 });
  }

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  let sent = 0;
  let skipped = 0;

  for (const evaluation of evaluations) {
    if (!evaluation.contact?.email || !evaluation.tokenAcces) {
      skipped++;
      continue;
    }

    const lien = `${baseUrl}/evaluation/${evaluation.tokenAcces}`;
    const emailContent = evaluationEmail({
      stagiaire: { prenom: evaluation.contact.prenom, nom: evaluation.contact.nom },
      formation: { titre: evaluation.session.formation.titre },
      type: evaluation.type,
      lien,
    });

    const result = await sendEmail({ to: evaluation.contact.email, ...emailContent });
    if ((result as any)?.skipped) {
      skipped++;
    } else {
      sent++;
    }
  }

  return NextResponse.json({ sent, skipped, total: evaluations.length });
}
