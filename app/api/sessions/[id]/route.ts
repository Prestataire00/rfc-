export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sessionSchema } from "@/lib/validations/session";
import { sendEmail, evaluationEmail } from "@/lib/email";
import { SESSION_STATUTS } from "@/lib/constants";
import { randomBytes } from "crypto";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { parseBody } from "@/lib/validations/helpers";
import { logger } from "@/lib/logger";

export const GET = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const session = await prisma.session.findUnique({
    where: { id: params.id },
    include: {
      formation: true,
      formateur: true,
      devis: { select: { id: true, numero: true, objet: true, statut: true, montantTTC: true } },
      inscriptions: {
        include: { contact: { include: { entreprise: { select: { id: true, nom: true } } } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!session) return NextResponse.json({ error: "Non trouvé" }, { status: 404 });
  return NextResponse.json(session);
});

export const PUT = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const parsed = await parseBody(req, sessionSchema);
  const { dateDebut, dateFin, formateurId, ...rest } = parsed;

  const sessionAvant = await prisma.session.findUnique({
    where: { id: params.id },
    select: { statut: true },
  });

  const session = await prisma.session.update({
    where: { id: params.id },
    data: {
      ...rest,
      dateDebut: new Date(dateDebut),
      dateFin: new Date(dateFin),
      formateurId: formateurId ?? null,
    },
    include: {
      formation: { select: { titre: true } },
      inscriptions: {
        where: { statut: { in: ["confirmee", "presente"] } },
        include: { contact: { select: { id: true, prenom: true, nom: true, email: true } } },
      },
    },
  });

  if (rest.statut === "terminee" && sessionAvant?.statut !== "terminee") {
    await envoyerQuestionnairesChaud(params.id, session);
  }

  return NextResponse.json(session);
});

export const PATCH = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const body = await req.json();
  const { statut, declarationPasseportPrevention, datePasseportPrevention, modeExpress } = body;

  const data: Record<string, unknown> = {};
  if (statut !== undefined) {
    const VALID = Object.keys(SESSION_STATUTS);
    if (!VALID.includes(statut)) {
      return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
    }
    data.statut = statut;
  }
  if (typeof declarationPasseportPrevention === "boolean") {
    data.declarationPasseportPrevention = declarationPasseportPrevention;
  }
  if (datePasseportPrevention) {
    data.datePasseportPrevention = new Date(datePasseportPrevention);
  }
  if (typeof modeExpress === "boolean") {
    data.modeExpress = modeExpress;
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Aucun champ a mettre a jour" }, { status: 400 });
  }

  const sessionAvant = await prisma.session.findUnique({
    where: { id: params.id },
    select: { statut: true },
  });

  const session = await prisma.session.update({
    where: { id: params.id },
    data,
    include: {
      formation: { select: { titre: true } },
      inscriptions: {
        where: { statut: { in: ["confirmee", "presente"] } },
        include: { contact: { select: { id: true, prenom: true, nom: true, email: true } } },
      },
    },
  });

  if (data.statut === "terminee" && sessionAvant?.statut !== "terminee") {
    await envoyerQuestionnairesChaud(params.id, session);
  }

  return NextResponse.json({ statut: session.statut });
});

export const DELETE = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  await prisma.session.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
});

type SessionWithInscriptions = {
  formation: { titre: string };
  inscriptions: Array<{
    contactId: string;
    contact: { prenom: string; nom: string; email: string | null };
  }>;
};

async function envoyerQuestionnairesChaud(sessionId: string, session: SessionWithInscriptions) {
  const baseUrl = process.env.NEXTAUTH_URL || "https://projetrfc.netlify.app";
  const presetChaud = await prisma.evaluationTemplate.findUnique({ where: { id: "preset_satisfaction_chaud" } });
  const snapshotChaud = presetChaud?.questions || null;

  for (const inscription of session.inscriptions) {
    if (!inscription.contact.email) continue;

    const existing = await prisma.evaluation.findFirst({
      where: { sessionId, contactId: inscription.contactId, type: "satisfaction_chaud" },
    });
    if (existing) continue;

    const token = randomBytes(32).toString("hex");
    await prisma.evaluation.create({
      data: {
        type: "satisfaction_chaud",
        cible: "stagiaire",
        sessionId,
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
    }).catch((e) => logger.error("evaluation.email_failed", e, { sessionId }));
  }
}
