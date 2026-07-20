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
// Audit 2026-05-19 §4.9 : schéma Zod centralisé (validations/inscription.ts).
// sessionId vient de l'URL → on l'omet du body et on valide le reste.
import { inscriptionSchema } from "@/lib/validations/inscription";
import { INSCRIPTION_STATUTS } from "@/lib/constants";

const inscriptionPostSchema = inscriptionSchema.omit({ sessionId: true });

const INSCRIPTION_STATUT_KEYS = Object.keys(INSCRIPTION_STATUTS) as [
  keyof typeof INSCRIPTION_STATUTS,
  ...Array<keyof typeof INSCRIPTION_STATUTS>,
];

const inscriptionPatchSchema = z.object({
  inscriptionId: z.string().min(1, "inscriptionId requis"),
  // Au moins l'un des deux doit être présent. Validation supplémentaire dans
  // le handler car z.object ne couvre pas le "au moins un de" trivialement.
  statut: z.enum(INSCRIPTION_STATUT_KEYS).optional(),
  reussite: z.boolean().nullable().optional(), // null = remettre à zéro
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

  // Phase 3 : auto-création fiche stagiaire si session liée à devis signé (fire-and-forget)
  import("@/lib/automations/auto-fiches-pre-formation")
    .then(({ autoCreateFicheStagiaireOnInscription }) =>
      autoCreateFicheStagiaireOnInscription(inscription.id).catch((err) =>
        logger.warn("phase-3.auto-fiche-stagiaire-failed", { error: String(err) }),
      ),
    )
    .catch((err) => logger.warn("phase-3.import-failed", { error: String(err) }));

  // Auto-envoi de la convention de formation au stagiaire (fire-and-forget).
  // Si le contact n'a pas d'email, skip silencieux (loggé côté helper).
  import("@/lib/automations/auto-convention")
    .then(({ sendConventionOnInscription }) =>
      sendConventionOnInscription(inscription.id).catch((err) =>
        logger.warn("auto-convention.failed", { error: String(err) }),
      ),
    )
    .catch((err) => logger.warn("auto-convention.import_failed", { error: String(err) }));

  // Auto-envoi du programme de formation au stagiaire (fire-and-forget).
  import("@/lib/automations/auto-programme")
    .then(({ sendProgrammeOnInscription }) =>
      sendProgrammeOnInscription(inscription.id).catch((err) =>
        logger.warn("auto-programme.inscription_failed", { error: String(err) }),
      ),
    )
    .catch((err) => logger.warn("auto-programme.import_failed", { error: String(err) }));

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
  const body = await parseBody(req, inscriptionPatchSchema);
  const { inscriptionId, statut, reussite } = body;

  if (statut === undefined && reussite === undefined) {
    return NextResponse.json(
      { error: "Au moins un champ doit être fourni (statut ou reussite)" },
      { status: 400 },
    );
  }

  const data: { statut?: string; reussite?: boolean | null } = {};
  if (statut !== undefined) data.statut = statut;
  if (reussite !== undefined) data.reussite = reussite;

  const inscription = await prisma.inscription.update({
    where: { id: inscriptionId },
    data,
  });

  return NextResponse.json(inscription);
});
