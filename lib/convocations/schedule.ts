/**
 * Politique de planification des convocations stagiaires.
 *
 * Pure functions, sans I/O. Décide quelles sessions doivent recevoir leurs
 * convocations MAINTENANT en fonction de la date de début, du statut, et
 * d'un éventuel envoi déjà effectué.
 *
 * Pourquoi une politique configurable : certaines formations courtes (1
 * jour) peuvent vouloir une convocation à J-3, des formations longues à
 * J-14. Par défaut J-7.
 */

export type ConvocationPolicy = {
  /** Jours d'anticipation par rapport au dateDebut de la session. */
  daysBeforeSession: number;
  /** Fenêtre de tolérance en jours (le cron tourne 1×/jour, ±1j de marge). */
  windowDays: number;
  /** Statuts de session éligibles (les autres sont skip). */
  eligibleStatuts: ReadonlyArray<string>;
};

export const DEFAULT_POLICY: ConvocationPolicy = {
  daysBeforeSession: 7,
  windowDays: 1,
  eligibleStatuts: ["planifiee", "confirmee"],
};

export type SessionRow = {
  id: string;
  dateDebut: Date;
  statut: string;
  modeExpress: boolean;
  convocationsEnvoyeesAt: Date | null;
};

export type ConvocationDecision =
  | { kind: "send" }
  | { kind: "skip"; reason: string };

export function daysUntil(target: Date, now: Date): number {
  const ms = target.getTime() - now.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/**
 * Décide si la session reçoit ses convocations maintenant.
 *
 * Règles :
 *   1. Déjà envoyé (convocationsEnvoyeesAt != null) → skip.
 *   2. Mode express (< 48h) → skip (l'envoi se fait à la création).
 *   3. Statut hors eligibleStatuts → skip.
 *   4. Date de début passée → skip (on ne convoque pas un événement passé).
 *   5. Fenêtre cible = [daysBeforeSession - windowDays, daysBeforeSession + windowDays]
 *      autour du jour d'aujourd'hui.
 */
export function shouldSendConvocations(
  session: SessionRow,
  now: Date,
  policy: ConvocationPolicy = DEFAULT_POLICY,
): ConvocationDecision {
  if (session.convocationsEnvoyeesAt) {
    return { kind: "skip", reason: "already_sent" };
  }
  if (session.modeExpress) {
    return { kind: "skip", reason: "mode_express" };
  }
  if (!policy.eligibleStatuts.includes(session.statut)) {
    return { kind: "skip", reason: "statut_ineligible" };
  }
  const days = daysUntil(session.dateDebut, now);
  if (days < 0) {
    return { kind: "skip", reason: "session_passed" };
  }
  const min = policy.daysBeforeSession - policy.windowDays;
  const max = policy.daysBeforeSession + policy.windowDays;
  if (days < min || days > max) {
    return { kind: "skip", reason: "outside_window" };
  }
  return { kind: "send" };
}

/**
 * Filtre une liste de sessions pour ne garder que celles à convoquer.
 *
 * Garde le mapping avec la raison du skip pour audit/observability si
 * besoin (caller peut logger les skip pour comprendre pourquoi telle
 * session n'a pas été touchée).
 */
export function selectSessionsToConvoke(
  sessions: ReadonlyArray<SessionRow>,
  now: Date,
  policy: ConvocationPolicy = DEFAULT_POLICY,
): { toSend: SessionRow[]; skipped: Array<{ session: SessionRow; reason: string }> } {
  const toSend: SessionRow[] = [];
  const skipped: Array<{ session: SessionRow; reason: string }> = [];
  for (const session of sessions) {
    const decision = shouldSendConvocations(session, now, policy);
    if (decision.kind === "send") toSend.push(session);
    else skipped.push({ session, reason: decision.reason });
  }
  return { toSend, skipped };
}
