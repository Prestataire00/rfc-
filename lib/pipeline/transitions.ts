import {
  SESSION_STAGES,
  SESSION_TERMINAL,
  SESSION_TERMINAL_ALT,
  PROSPECT_STAGES,
  PROSPECT_TERMINAL,
  PROSPECT_TERMINAL_ALT,
  isSessionStage,
  isProspectStage,
  type SessionStage,
  type ProspectStage,
} from "./stages";

export type UserRole = "admin" | "formateur" | "client";

export type TransitionResult =
  | { ok: true }
  | { ok: false; reason: string };

// Règles communes :
// - admin uniquement
// - pas de transition depuis un terminal
// - terminal alternatif (annulee/perdu) atteignable depuis n'importe quel non-terminal
// - sinon, avance/recule d'une seule étape dans l'ordre linéaire

export function canTransitionSession(
  from: SessionStage,
  to: SessionStage,
  role: UserRole,
): TransitionResult {
  if (role !== "admin") return { ok: false, reason: "Réservé aux admins" };
  if (!isSessionStage(from) || !isSessionStage(to)) {
    return { ok: false, reason: "Étape inconnue" };
  }
  if (from === to) return { ok: false, reason: "Déjà à cette étape" };
  if (SESSION_TERMINAL.includes(from)) {
    return { ok: false, reason: "Étape terminale, pas de transition" };
  }
  if (to === SESSION_TERMINAL_ALT) return { ok: true };
  const stages = SESSION_STAGES as readonly string[];
  const fromIdx = stages.indexOf(from);
  const toIdx = stages.indexOf(to);
  if (fromIdx === -1 || toIdx === -1) {
    return { ok: false, reason: "Transition non autorisée" };
  }
  if (Math.abs(toIdx - fromIdx) !== 1) {
    return {
      ok: false,
      reason: "Saut d'étapes interdit (avant/arrière d'un cran seulement)",
    };
  }
  return { ok: true };
}

export function canTransitionProspect(
  from: ProspectStage,
  to: ProspectStage,
  role: UserRole,
): TransitionResult {
  if (role !== "admin") return { ok: false, reason: "Réservé aux admins" };
  if (!isProspectStage(from) || !isProspectStage(to)) {
    return { ok: false, reason: "Étape inconnue" };
  }
  if (from === to) return { ok: false, reason: "Déjà à cette étape" };
  if (PROSPECT_TERMINAL.includes(from)) {
    return { ok: false, reason: "Étape terminale, pas de transition" };
  }
  if (to === PROSPECT_TERMINAL_ALT) return { ok: true };
  const stages = PROSPECT_STAGES as readonly string[];
  const fromIdx = stages.indexOf(from);
  const toIdx = stages.indexOf(to);
  if (fromIdx === -1 || toIdx === -1) {
    return { ok: false, reason: "Transition non autorisée" };
  }
  if (Math.abs(toIdx - fromIdx) !== 1) {
    return {
      ok: false,
      reason: "Saut d'étapes interdit (avant/arrière d'un cran seulement)",
    };
  }
  return { ok: true };
}

export function nextSessionStage(from: SessionStage): SessionStage | null {
  const stages = SESSION_STAGES as readonly string[];
  const idx = stages.indexOf(from);
  if (idx === -1 || idx >= stages.length - 1) return null;
  return stages[idx + 1] as SessionStage;
}

export function prevSessionStage(from: SessionStage): SessionStage | null {
  const stages = SESSION_STAGES as readonly string[];
  const idx = stages.indexOf(from);
  if (idx <= 0) return null;
  return stages[idx - 1] as SessionStage;
}

export function nextProspectStage(from: ProspectStage): ProspectStage | null {
  const stages = PROSPECT_STAGES as readonly string[];
  const idx = stages.indexOf(from);
  if (idx === -1 || idx >= stages.length - 1) return null;
  return stages[idx + 1] as ProspectStage;
}

export function prevProspectStage(from: ProspectStage): ProspectStage | null {
  const stages = PROSPECT_STAGES as readonly string[];
  const idx = stages.indexOf(from);
  if (idx <= 0) return null;
  return stages[idx - 1] as ProspectStage;
}
