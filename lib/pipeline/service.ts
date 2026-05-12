// Service Prisma pour le pipeline. Toutes les mutations qui touchent à plus
// d'une table passent par ici (transactions atomiques).

import { prisma } from "@/lib/prisma";
import { SESSION_STAGE_TASKS, PROSPECT_STAGE_TASKS } from "./templates";
import {
  canTransitionSession,
  canTransitionProspect,
  type UserRole,
  type TransitionResult,
} from "./transitions";
import {
  isSessionStage,
  isProspectStage,
  type SessionStage,
  type ProspectStage,
} from "./stages";

type AdvanceContext = {
  notes?: string;
  byUserId?: string;
  role: UserRole;
};

export async function advanceSessionEtape(
  sessionId: string,
  toEtape: string,
  ctx: AdvanceContext,
): Promise<{ ok: true } | { ok: false; status: number; reason: string }> {
  if (!isSessionStage(toEtape)) {
    return { ok: false, status: 400, reason: "Étape inconnue" };
  }
  const sess = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { etape: true },
  });
  if (!sess) return { ok: false, status: 404, reason: "Session introuvable" };
  if (!isSessionStage(sess.etape)) {
    return { ok: false, status: 500, reason: `Étape courante invalide en DB : ${sess.etape}` };
  }
  const check: TransitionResult = canTransitionSession(
    sess.etape as SessionStage,
    toEtape,
    ctx.role,
  );
  if (!check.ok) return { ok: false, status: 403, reason: check.reason };

  const templateTasks = SESSION_STAGE_TASKS[toEtape] ?? [];

  await prisma.$transaction(async (tx) => {
    await tx.session.update({
      where: { id: sessionId },
      data: { etape: toEtape, etapeMajAt: new Date() },
    });
    await tx.etapeTransition.create({
      data: {
        entityType: "session",
        entityId: sessionId,
        fromEtape: sess.etape,
        toEtape,
        byUserId: ctx.byUserId ?? null,
        notes: ctx.notes ?? null,
      },
    });

    // Instancie les tâches template manquantes — idempotent
    if (templateTasks.length > 0) {
      const existing = await tx.sessionTask.findMany({
        where: { sessionId, etape: toEtape, source: "template" },
        select: { titre: true },
      });
      const existingTitres = new Set(existing.map((t) => t.titre));
      const toCreate = templateTasks
        .filter((t) => !existingTitres.has(t.titre))
        .map((t, i) => ({
          sessionId,
          etape: toEtape,
          titre: t.titre,
          description: t.description ?? null,
          ordre: i,
          source: "template",
        }));
      if (toCreate.length > 0) {
        await tx.sessionTask.createMany({ data: toCreate });
      }
    }
  });

  return { ok: true };
}

export async function advanceProspectEtape(
  prospectId: string,
  toEtape: string,
  ctx: AdvanceContext,
): Promise<{ ok: true } | { ok: false; status: number; reason: string }> {
  if (!isProspectStage(toEtape)) {
    return { ok: false, status: 400, reason: "Étape inconnue" };
  }
  const pro = await prisma.prospect.findUnique({
    where: { id: prospectId },
    select: { etape: true },
  });
  if (!pro) return { ok: false, status: 404, reason: "Prospect introuvable" };
  if (!isProspectStage(pro.etape)) {
    return { ok: false, status: 500, reason: `Étape courante invalide en DB : ${pro.etape}` };
  }
  const check: TransitionResult = canTransitionProspect(
    pro.etape as ProspectStage,
    toEtape,
    ctx.role,
  );
  if (!check.ok) return { ok: false, status: 403, reason: check.reason };

  const templateTasks = PROSPECT_STAGE_TASKS[toEtape] ?? [];

  await prisma.$transaction(async (tx) => {
    await tx.prospect.update({
      where: { id: prospectId },
      data: { etape: toEtape, etapeMajAt: new Date() },
    });
    await tx.etapeTransition.create({
      data: {
        entityType: "prospect",
        entityId: prospectId,
        fromEtape: pro.etape,
        toEtape,
        byUserId: ctx.byUserId ?? null,
        notes: ctx.notes ?? null,
      },
    });

    if (templateTasks.length > 0) {
      const existing = await tx.prospectTask.findMany({
        where: { prospectId, etape: toEtape, source: "template" },
        select: { titre: true },
      });
      const existingTitres = new Set(existing.map((t) => t.titre));
      const toCreate = templateTasks
        .filter((t) => !existingTitres.has(t.titre))
        .map((t, i) => ({
          prospectId,
          etape: toEtape,
          titre: t.titre,
          description: t.description ?? null,
          ordre: i,
          source: "template",
        }));
      if (toCreate.length > 0) {
        await tx.prospectTask.createMany({ data: toCreate });
      }
    }
  });

  return { ok: true };
}

export async function getSessionPipeline(sessionId: string) {
  const [session, tasks, transitions] = await Promise.all([
    prisma.session.findUnique({
      where: { id: sessionId },
      select: { id: true, etape: true, etapeMajAt: true },
    }),
    prisma.sessionTask.findMany({
      where: { sessionId },
      orderBy: [{ etape: "asc" }, { ordre: "asc" }, { createdAt: "asc" }],
    }),
    prisma.etapeTransition.findMany({
      where: { entityType: "session", entityId: sessionId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);
  if (!session) return null;
  return { session, tasks, transitions };
}

export async function getProspectPipeline(prospectId: string) {
  const [prospect, tasks, transitions] = await Promise.all([
    prisma.prospect.findUnique({
      where: { id: prospectId },
      select: { id: true, etape: true, etapeMajAt: true },
    }),
    prisma.prospectTask.findMany({
      where: { prospectId },
      orderBy: [{ etape: "asc" }, { ordre: "asc" }, { createdAt: "asc" }],
    }),
    prisma.etapeTransition.findMany({
      where: { entityType: "prospect", entityId: prospectId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);
  if (!prospect) return null;
  return { prospect, tasks, transitions };
}
