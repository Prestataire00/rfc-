import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/get-client-ip";

/**
 * Liste exhaustive des actions auditables. Notation : `<resource>.<verb>`.
 *
 * En ajouter une = penser à la câbler côté code métier (route, server action,
 * cron…) ET à la documenter dans docs/AUDIT_LOGS.md.
 *
 * À ne PAS auditer : opérations purement lectures (GET), navigation pages,
 * heartbeats, polling. L'audit log n'est pas une trace HTTP — c'est une
 * trace métier.
 */
export type AuditAction =
  // Auth & comptes
  | "auth.login"
  | "auth.login_failed"
  | "auth.logout"
  | "auth.password_reset_request"
  | "auth.password_reset_complete"
  | "user.create"
  | "user.update"
  | "user.deactivate"
  | "user.delete"
  | "user.role_change"
  // Commercial
  | "devis.create"
  | "devis.update"
  | "devis.send"
  | "devis.sign"
  | "devis.refuse"
  | "devis.expire"
  | "facture.create"
  | "facture.send"
  | "facture.paid"
  | "facture.overdue_detected"
  // Formations & sessions
  | "session.create"
  | "session.update"
  | "session.confirm"
  | "session.start"
  | "session.complete"
  | "session.cancel"
  | "inscription.create"
  | "inscription.cancel"
  | "inscription.confirm"
  // Signature électronique
  | "signature.request_create"
  | "signature.signed"
  | "signature.declined"
  | "signature.expired"
  // Documents
  | "document.generate"
  | "document.upload"
  | "document.delete"
  | "attestation.generate"
  | "attestation.validate"
  | "attestation.send"
  // Émargement
  | "emargement.token_issue"
  | "emargement.sign"
  // RGPD / Qualiopi
  | "rgpd.access_request"
  | "rgpd.delete_request"
  | "rgpd.export"
  | "rgpd.consent_change"
  // Système
  | "system.cron_run"
  | "system.bulk_action";

export type AuditActor =
  | {
      id: string;
      email: string;
      role: string;
    }
  | { id?: null; email?: null; role: "system" };

export type LogAuditInput = {
  action: AuditAction;
  actor?: AuditActor | null;
  ip?: string | null;
  resource: {
    type: string;
    id?: string | null;
  };
  metadata?: Record<string, unknown> | null;
};

/**
 * Écrit un AuditLog. Ne JAMAIS throw : un échec d'audit ne doit pas bloquer
 * une opération métier (sinon panique partielle = pire que pas d'audit). Les
 * erreurs vont dans Sentry/console.
 *
 * Append-only : pas d'API d'update/delete exposée — la conformité Qualiopi
 * et RGPD exige que la trace soit immuable. La purge périodique se fait par
 * job dédié, hors de cette fonction.
 */
export async function logAudit(input: LogAuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: input.action,
        actorId: input.actor?.id ?? null,
        actorEmail: input.actor?.email ?? null,
        actorRole: input.actor?.role ?? null,
        actorIp: input.ip ?? null,
        resourceType: input.resource.type,
        resourceId: input.resource.id ?? null,
        metadata: (input.metadata ?? undefined) as
          | Prisma.InputJsonValue
          | undefined,
      },
    });
  } catch (err) {
    // On NE throw PAS. L'audit log est best-effort en cas de panne DB.
    console.error("[audit] write failed", { action: input.action, err });
  }
}

/**
 * Wrapper pratique pour les routes API : extrait l'IP du request et compose
 * automatiquement l'acteur. Préférer cette fonction à logAudit() direct dans
 * un handler de route.
 */
export async function logAuditFromRequest(
  request: { headers: { get(name: string): string | null } },
  input: Omit<LogAuditInput, "ip">,
): Promise<void> {
  const ip = getClientIp(request as Parameters<typeof getClientIp>[0]);
  await logAudit({ ...input, ip });
}

/**
 * Acteur système (cron, webhook, job interne). À utiliser pour les events
 * non déclenchés par un User authentifié.
 */
export const SYSTEM_ACTOR: AuditActor = { role: "system" };

/**
 * Helper pour calculer un diff léger entre deux objets — utile pour les
 * updates où on veut tracer les champs modifiés sans embarquer toute la row.
 *
 * Retourne null si aucun champ ne diffère (skip l'audit ou le marquer no-op).
 */
export function diffFields<T extends Record<string, unknown>>(
  before: T,
  after: T,
  keys: ReadonlyArray<keyof T>,
): { before: Partial<T>; after: Partial<T> } | null {
  const beforeDiff: Partial<T> = {};
  const afterDiff: Partial<T> = {};
  let changed = false;
  for (const key of keys) {
    if (before[key] !== after[key]) {
      beforeDiff[key] = before[key];
      afterDiff[key] = after[key];
      changed = true;
    }
  }
  return changed ? { before: beforeDiff, after: afterDiff } : null;
}
