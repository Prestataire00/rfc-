import { sha256Hex } from "./hash";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

// Chaîne d'événements hashée — voir spec §"SignatureEvent".
// eventHash = SHA256({type, actorType, actorId, payload, createdAt, previousEventHash})
// Toute modification rétroactive d'un event casse les hashes suivants.

export type EventInput = {
  type: string;
  actorType: "admin" | "signataire" | "system";
  actorId: string | null;
  payload: Record<string, unknown>;
  createdAt: Date;
  previousEventHash: string | null;
};

export function computeEventHash(input: EventInput): string {
  // Sérialisation stable : clés triées, ISO date, payload via JSON.stringify
  // (les clés de payload doivent être déterministes côté caller — on n'impose pas de tri profond ici)
  const canonical = JSON.stringify({
    type: input.type,
    actorType: input.actorType,
    actorId: input.actorId,
    payload: input.payload,
    createdAt: input.createdAt.toISOString(),
    previousEventHash: input.previousEventHash,
  });
  return sha256Hex(canonical);
}

/**
 * Append un événement à la chaîne d'audit d'une SignatureRequest.
 * Met à jour SignatureRequest.lastEventHash atomiquement.
 *
 * Si tx est passé (cas où on est déjà dans une transaction Prisma plus large),
 * utilise cette transaction. Sinon ouvre une nouvelle transaction.
 */
export async function appendEvent(
  requestId: string,
  event: {
    type: string;
    actorType: "admin" | "signataire" | "system";
    actorId?: string | null;
    payload?: Record<string, unknown> | null;
  },
  tx?: Prisma.TransactionClient,
): Promise<{ eventHash: string }> {
  const runner = async (client: Prisma.TransactionClient) => {
    const req = await client.signatureRequest.findUniqueOrThrow({
      where: { id: requestId },
      select: { lastEventHash: true },
    });
    const previousEventHash = req.lastEventHash;
    const createdAt = new Date();
    const eventHash = computeEventHash({
      type: event.type,
      actorType: event.actorType,
      actorId: event.actorId ?? null,
      payload: (event.payload ?? {}) as Record<string, unknown>,
      createdAt,
      previousEventHash,
    });
    await client.signatureEvent.create({
      data: {
        requestId,
        type: event.type,
        actorType: event.actorType,
        actorId: event.actorId ?? null,
        payload: (event.payload ?? null) as Prisma.InputJsonValue,
        previousEventHash,
        eventHash,
        createdAt,
      },
    });
    await client.signatureRequest.update({
      where: { id: requestId },
      data: { lastEventHash: eventHash },
    });
    return { eventHash };
  };

  if (tx) return runner(tx);
  return prisma.$transaction(runner);
}

/**
 * Charge la chaîne d'événements depuis la BD et vérifie son intégrité.
 * Retourne `{ valid: true }` si OK, sinon `{ valid: false, brokenAt }` avec l'ID
 * du 1er event corrompu (ou "lastEventHash" si la tête ne correspond pas).
 *
 * Utilisé par :
 *  - /api/signature-requests/[id]/verify-audit (admin)
 *  - /api/signatures/verify (public, après upload PDF par tiers)
 *  - generateProofCertificate (encart "audit log integrity OK")
 */
export async function verifyAuditChain(
  requestId: string,
): Promise<{ valid: boolean; brokenAt?: string }> {
  const events = await prisma.signatureEvent.findMany({
    where: { requestId },
    orderBy: { createdAt: "asc" },
  });
  const corruptedRank = verifyChain(
    events.map((e) => ({
      type: e.type,
      actorType: e.actorType,
      actorId: e.actorId,
      payload: e.payload as unknown,
      createdAt: e.createdAt,
      previousEventHash: e.previousEventHash,
      eventHash: e.eventHash,
    })),
  );
  if (corruptedRank !== -1) {
    return { valid: false, brokenAt: events[corruptedRank]?.id ?? "unknown" };
  }
  const req = await prisma.signatureRequest.findUniqueOrThrow({
    where: { id: requestId },
    select: { lastEventHash: true },
  });
  const expectedTail = events.length === 0 ? null : events[events.length - 1].eventHash;
  if (req.lastEventHash !== expectedTail) {
    return { valid: false, brokenAt: "lastEventHash" };
  }
  return { valid: true };
}

// Vérifie que la chaîne est intacte. Renvoie le rank du 1er event corrompu, ou -1 si OK.
export function verifyChain(
  events: Array<{ type: string; actorType: string; actorId: string | null; payload: unknown; createdAt: Date; previousEventHash: string | null; eventHash: string }>,
): number {
  let expectedPrev: string | null = null;
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (e.previousEventHash !== expectedPrev) return i;
    const recomputed = computeEventHash({
      type: e.type,
      actorType: e.actorType as EventInput["actorType"],
      actorId: e.actorId,
      payload: e.payload as Record<string, unknown>,
      createdAt: e.createdAt,
      previousEventHash: e.previousEventHash,
    });
    if (recomputed !== e.eventHash) return i;
    expectedPrev = e.eventHash;
  }
  return -1;
}
