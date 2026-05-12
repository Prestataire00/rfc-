// Sentry init côté serveur (Node.js runtime — route handlers, server actions, RSC).
// Importé par instrumentation.ts. Désactivé silencieusement si DSN absent.

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: !!dsn,
  environment: process.env.NODE_ENV,

  // 10% des transactions tracées (Netlify Functions = court, coût Sentry maîtrisé).
  // Augmenter si besoin de plus de visibilité perf, baisser si quota Sentry serré.
  tracesSampleRate: 0.1,

  // Évite de spammer Sentry avec les erreurs prévisibles côté serveur.
  ignoreErrors: [
    // Erreurs métier 4xx (gérées par les routes handlers via NextResponse.json)
    /^Non autorisé$/,
    /^Acces interdit$/,
    /^Lien invalide$/,
  ],

  // Pas de logs PII automatiques (NextAuth, Prisma). À activer ponctuellement
  // pour debug, mais désactivé par défaut pour conformité RGPD.
  sendDefaultPii: false,
});
