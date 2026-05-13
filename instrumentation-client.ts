// Sentry init côté navigateur (component clients + erreurs React non-catched).
// Désactivé silencieusement si NEXT_PUBLIC_SENTRY_DSN absent.

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: !!dsn,
  environment: process.env.NODE_ENV,

  // 10% des transactions tracées côté client.
  tracesSampleRate: 0.1,

  // Session Replay désactivé par défaut (privacy + coût).
  // À activer ponctuellement pour debug bug UX critique.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,

  // Ignore les bruits du navigateur (extensions, scripts tiers, etc.).
  ignoreErrors: [
    // Extensions navigateur
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    // Adblocks / extensions qui injectent du code
    /chrome-extension:/,
    /moz-extension:/,
    // Erreurs de réseau intermittentes (souvent pas un bug applicatif)
    "Network request failed",
    "Load failed",
    "Failed to fetch",
  ],

  sendDefaultPii: false,
});

// Capte les transitions de routes Next.js App Router pour Sentry tracing.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
