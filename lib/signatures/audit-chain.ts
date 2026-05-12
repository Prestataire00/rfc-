import { sha256Hex } from "./hash";

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
