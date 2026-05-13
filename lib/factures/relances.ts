/**
 * Politique de relance des factures impayées.
 *
 * Décide, pour une facture donnée, quel niveau de relance déclencher MAINTENANT
 * — ou aucun. Pure fonction, sans I/O ni DB, donc testable sans mock lourd.
 *
 * Paliers fixes par défaut :
 *   - J+7  jours de retard → relance courtoise   (palier 1)
 *   - J+14 jours de retard → relance ferme       (palier 2)
 *   - J+30 jours de retard → mise en demeure     (palier 3, final)
 *
 * `nbRappelsEnvoyes` agit comme palier déjà atteint. On ne descend jamais —
 * une facture qui a déjà eu sa mise en demeure ne déclenche plus rien.
 */

export type ReminderTier = 1 | 2 | 3;

export type RelancePolicy = {
  /** Jours de retard minimum pour déclencher chaque palier. */
  thresholds: Record<ReminderTier, number>;
  /** Délai minimum entre deux relances (anti-spam). */
  minDaysBetweenReminders: number;
};

export const DEFAULT_POLICY: RelancePolicy = {
  thresholds: { 1: 7, 2: 14, 3: 30 },
  minDaysBetweenReminders: 3,
};

export type RelanceDecision =
  | { kind: "skip"; reason: string }
  | { kind: "send"; tier: ReminderTier };

export type RelanceInput = {
  now: Date;
  dateEcheance: Date;
  statut: string;
  nbRappelsEnvoyes: number;
  dernierRappelEnvoyeAt: Date | null;
};

export function daysBetween(a: Date, b: Date): number {
  const ms = a.getTime() - b.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/**
 * Décide si une relance doit être envoyée maintenant pour cette facture.
 *
 * Règles :
 *   1. Statut doit être "en_retard" (le cron facture-statut a déjà passé
 *      les "envoyee" échues en "en_retard" avant nous).
 *   2. Palier suivant = nbRappelsEnvoyes + 1, capé à 3.
 *   3. Le palier suivant n'est éligible que si joursRetard >= seuil du palier.
 *   4. Anti-spam : minDaysBetweenReminders depuis le dernier rappel.
 */
export function decideRelance(
  input: RelanceInput,
  policy: RelancePolicy = DEFAULT_POLICY,
): RelanceDecision {
  if (input.statut !== "en_retard") {
    return { kind: "skip", reason: "statut_not_en_retard" };
  }

  if (input.nbRappelsEnvoyes >= 3) {
    return { kind: "skip", reason: "all_tiers_sent" };
  }

  const nextTier = (input.nbRappelsEnvoyes + 1) as ReminderTier;
  const threshold = policy.thresholds[nextTier];
  const joursRetard = daysBetween(input.now, input.dateEcheance);

  if (joursRetard < threshold) {
    return { kind: "skip", reason: "tier_threshold_not_reached" };
  }

  if (input.dernierRappelEnvoyeAt) {
    const daysSinceLast = daysBetween(input.now, input.dernierRappelEnvoyeAt);
    if (daysSinceLast < policy.minDaysBetweenReminders) {
      return { kind: "skip", reason: "too_soon_since_last_reminder" };
    }
  }

  return { kind: "send", tier: nextTier };
}

/**
 * Libellé humain du palier — utilisé dans l'objet et le corps de l'email.
 */
export function tierLabel(tier: ReminderTier): {
  short: string;
  subject: string;
} {
  switch (tier) {
    case 1:
      return {
        short: "Relance courtoise",
        subject: "Relance — paiement de votre facture",
      };
    case 2:
      return {
        short: "Relance ferme",
        subject: "Relance ferme — facture impayée",
      };
    case 3:
      return {
        short: "Mise en demeure",
        subject: "Mise en demeure — facture en souffrance",
      };
  }
}
