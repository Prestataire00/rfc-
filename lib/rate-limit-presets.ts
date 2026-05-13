// Presets de rate-limit par catégorie d'endpoint.
// Centralise les limites pour éviter la dispersion + faciliter le tuning.

import type { UpstashWindow } from "@/lib/rate-limit";

type Preset = { max: number; window: UpstashWindow };

export const RATE_LIMIT_PRESETS = {
  // Endpoints publics par token (inscription/évaluations/etc.) : 30 req / 5 min par IP.
  // Suffisamment large pour usage normal (un stagiaire qui hésite, revient, valide…),
  // bloque les bots qui spammeraient un endpoint de soumission.
  publicToken: { max: 30, window: "5 m" } satisfies Preset,

  // Login par email : 5 tentatives / 5 min — bloque le brute-force ciblé sur un compte.
  loginByEmail: { max: 5, window: "5 m" } satisfies Preset,

  // Login par IP : 20 tentatives / 5 min — bloque le spray (un même IP qui essaie
  // plein d'emails avec un même mot de passe). Plus large que loginByEmail pour ne
  // pas bloquer les cabinets / espaces co-working où plusieurs users partagent l'IP.
  loginByIp: { max: 20, window: "5 m" } satisfies Preset,

  // Webhooks externes (provider d'emails Postmark/Resend, etc.) : 600 req / min par IP.
  // Les providers peuvent burst lors de gros envois, on autorise large mais pas illimité.
  externalWebhook: { max: 600, window: "1 m" } satisfies Preset,

  // Endpoints publics anonymes (catalogue formations) : 100 req / min par IP.
  publicAnon: { max: 100, window: "1 m" } satisfies Preset,

  // Mutations authentifiées sensibles (création user, transitions devis,
  // génération facture, etc.). Pas pour stopper du burst légitime — plutôt
  // pour empêcher qu'un compte admin compromis enchaîne 1000 actions à la
  // seconde. 60 mutations / minute par user = très largement au-dessus de
  // l'usage humain normal.
  authMutation: { max: 60, window: "1 m" } satisfies Preset,

  // Endpoints qui déclenchent un envoi email (convocations batch, relances,
  // notifications, password reset). Coût SMTP réel, donc denial-of-wallet
  // possible. 10 burst / 5 min par user — un batch légitime tient en 1-2
  // calls (1 par session). Au-delà = scripting → on bloque.
  emailTrigger: { max: 10, window: "5 m" } satisfies Preset,

  // Génération PDF / export volumineux : CPU-intensive. 20 / min par user
  // au-dessus duquel on présume du scripting (un humain ne génère pas 20
  // PDFs en 60s en cliquant).
  heavyExport: { max: 20, window: "1 m" } satisfies Preset,
} as const;

export type RateLimitPreset = (typeof RATE_LIMIT_PRESETS)[keyof typeof RATE_LIMIT_PRESETS];
