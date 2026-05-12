// Pipeline pédagogique (sur Session) et commercial (sur Prospect).
// Étapes hardcodées en V1 (cf. spec section 2 décision D2).

export const SESSION_STAGES = [
  "preparation",
  "convocations",
  "en_cours",
  "cloture",
  "facturation",
  "clos",
] as const;
export const SESSION_TERMINAL_ALT = "annulee" as const;

export type SessionStage =
  | (typeof SESSION_STAGES)[number]
  | typeof SESSION_TERMINAL_ALT;

export const SESSION_STAGE_LABELS: Record<SessionStage, string> = {
  preparation: "Préparation",
  convocations: "Convocations",
  en_cours: "En cours",
  cloture: "Clôture",
  facturation: "Facturation",
  clos: "Clos",
  annulee: "Annulée",
};

export const SESSION_TERMINAL: readonly SessionStage[] = ["clos", "annulee"];

export const PROSPECT_STAGES = [
  "nouveau",
  "qualifie",
  "devis_envoye",
  "relance",
  "signe",
] as const;
export const PROSPECT_TERMINAL_ALT = "perdu" as const;

export type ProspectStage =
  | (typeof PROSPECT_STAGES)[number]
  | typeof PROSPECT_TERMINAL_ALT;

export const PROSPECT_STAGE_LABELS: Record<ProspectStage, string> = {
  nouveau: "Nouveau",
  qualifie: "Qualifié",
  devis_envoye: "Devis envoyé",
  relance: "Relance",
  signe: "Signé",
  perdu: "Perdu",
};

export const PROSPECT_TERMINAL: readonly ProspectStage[] = ["signe", "perdu"];

export function isSessionStage(s: string): s is SessionStage {
  return (
    (SESSION_STAGES as readonly string[]).includes(s) ||
    s === SESSION_TERMINAL_ALT
  );
}

export function isProspectStage(s: string): s is ProspectStage {
  return (
    (PROSPECT_STAGES as readonly string[]).includes(s) ||
    s === PROSPECT_TERMINAL_ALT
  );
}
