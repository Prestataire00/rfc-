export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/historique";
import { triggerAutomation } from "@/lib/automations-trigger";
import { notifyAdmins } from "@/lib/notifications";
import { withErrorHandlerParams } from "@/lib/api-wrapper";
import { parseBody } from "@/lib/validations/helpers";
import { logger } from "@/lib/logger";

const inscriptionPostSchema = z.object({
  contactId: z.string().min(1, "contactId requis"),
  statut: z.string().optional().default("en_attente"),
  notes: z.string().optional().nullable(),
});

const inscriptionPatchSchema = z.object({
  inscriptionId: z.string().min(1, "inscriptionId requis"),
  statut: z.string().min(1, "statut requis"),
});

export const GET = withErrorHandlerParams(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  const inscriptions = await prisma.inscription.findMany({
    where: { sessionId: params.id },
    include: {
      contact: { include: { entreprise: { select: { nom: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(inscriptions);
});

export const POST = withErrorHandlerParams(async (req: NextRequest, { params }: { params: { id: string } }) => {
  const { contactId, statut, notes } = await parseBody(req, inscriptionPostSchema);

  const session = await prisma.session.findUnique({
    where: { id: params.id },
    include: { _count: { select: { inscriptions: true } } },
  });

  if (!session) return NextResponse.json({ error: "Session non trouvée" }, { status: 404 });

  if (session._count.inscriptions >= session.capaciteMax) {
    return NextResponse.json({ error: "Session complète" }, { status: 409 });
  }

  const existing = await prisma.inscription.findUnique({
    where: { contactId_sessionId: { contactId, sessionId: params.id } },
  });

  if (existing) {
    return NextResponse.json({ error: "Contact déjà inscrit" }, { status: 409 });
  }

  const sessionWithFormation = await prisma.session.findUnique({
    where: { id: params.id },
    include: { formation: true },
  });
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    select: { nom: true, prenom: true, entrepriseId: true },
  });

  const inscription = await prisma.inscription.create({
    data: { contactId, sessionId: params.id, statut, notes },
    include: { contact: true },
  });

  if (sessionWithFormation && contact) {
    try {
      await logAction({
        action: "inscription_creee",
        label: contact.prenom + " " + contact.nom + " inscrit à " + sessionWithFormation.formation.titre,
        lien: "/sessions/" + params.id,
        entrepriseId: contact.entrepriseId ?? undefined,
        contactId: contactId,
        sessionId: params.id,
      });
    } catch (logErr) {
      logger.warn("historique.inscription_creee_failed", { error: String(logErr) });
    }
  }

  triggerAutomation("inscription_created", {
    inscriptionId: inscription.id,
    sessionId: params.id,
    contactId,
    entrepriseId: contact?.entrepriseId ?? undefined,
    formationId: sessionWithFormation?.formation.id,
  }).catch((err) => logger.error("automation.inscription_created_failed", err));

  const traineeName = contact ? `${contact.prenom} ${contact.nom}` : "Un stagiaire";
  const sessionTitle = sessionWithFormation?.formation.titre ?? "une session";

  notifyAdmins({
    titre: "Nouvelle inscription",
    message: `${traineeName} inscrit(e) a ${sessionTitle}`,
    type: "info",
    lien: `/sessions/${params.id}`,
  }).catch(() => {});

  return NextResponse.json(inscription, { status: 201 });
});

export const PATCH = withErrorHandlerParams(async (req: NextRequest, _ctx: { params: { id: string } }) => {
  const { inscriptionId, statut } = await parseBody(req, inscriptionPatchSchema);

  const inscription = await prisma.inscription.update({
    where: { id: inscriptionId },
    data: { statut },
  });

  return NextResponse.json(inscription);
});
