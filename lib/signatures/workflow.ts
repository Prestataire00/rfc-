/**
 * Machine à états du document à signer.
 *
 * Voir spec §"Vue d'ensemble — machine à états du document" :
 *
 *   draft → ready → sent → viewed → signed → completed
 *
 * Branches alternatives : expired (timeout), rejected (refus), cancelled (admin).
 * Les états terminaux (completed, expired, cancelled, rejected) n'ont pas de
 * transition sortante — pour rouvrir, créer une nouvelle SignatureRequest.
 *
 * Cette machine est utilisée par les routes API pour valider qu'une transition
 * demandée est cohérente (assertTransition lève une erreur sinon).
 */

export type SignatureStatus =
  | "draft"
  | "ready"
  | "sent"
  | "viewed"
  | "signed"
  | "completed"
  | "expired"
  | "cancelled"
  | "rejected";

const TRANSITIONS: Record<SignatureStatus, SignatureStatus[]> = {
  draft: ["ready", "cancelled"],
  ready: ["sent", "draft", "cancelled"],
  sent: ["viewed", "expired", "rejected", "cancelled"],
  viewed: ["signed", "expired", "rejected"],
  signed: ["completed"],
  completed: [],
  expired: [],
  cancelled: [],
  rejected: [],
};

export function canTransition(from: SignatureStatus, to: SignatureStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: SignatureStatus, to: SignatureStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Transition invalide : ${from} → ${to}`);
  }
}
