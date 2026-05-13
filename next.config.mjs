import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["http://rfc.local:3001", "http://127.0.0.1:3001"],

  // ── Perf build ─────────────────────────────────────────────────────────────
  // ESLint reste actif en dev (`next dev`) et doit l'être en CI (GitHub Actions
  // à ajouter si pas déjà fait). Le re-jouer au build Netlify coûte 30-60s pour
  // un gain quasi nul : si le code ne lint pas, on le voit avant de merger.
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Tree-shake les packages à beaucoup d'exports (lucide-react = 1000+ icônes,
  // date-fns = 100+ fonctions). Ne bundle que ce qui est effectivement importé.
  // Gain : bundle client plus petit + build un peu plus rapide.
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns"],
  },

  // Retire le header "X-Powered-By: Next.js" (cosmétique + leak de version)
  poweredByHeader: false,

  // Source maps prod désactivés (gain ~5-15s build + bundle plus petit côté
  // client). Pour debug prod, réactiver ponctuellement via une env var.
  productionBrowserSourceMaps: false,

  // ── Security headers (OWASP baseline) ──────────────────────────────────────
  // Documentation : https://owasp.org/www-project-secure-headers/
  //
  // ⚠️ Content-Security-Policy est désormais émis par middleware.ts (nonce
  // dynamique par requête + strict-dynamic sur script-src). NE PAS la remettre
  // ici, sinon double CSP en conflit.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

// Wrap Sentry si DSN configuré, sinon passthrough silencieux (pas de overhead build).
// Sans SENTRY_AUTH_TOKEN, l'upload de source maps est skip mais l'instrumentation
// Next.js (route handlers, server actions, RSC) reste active.
export default process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, {
      silent: true,
      widenClientFileUpload: false,
      hideSourceMaps: true,
      disableLogger: true,
      reactComponentAnnotation: { enabled: false },
      // Pour activer l'upload source maps (debug stack traces minifiées) :
      // ajouter SENTRY_ORG, SENTRY_PROJECT, SENTRY_AUTH_TOKEN dans Netlify env vars.
    })
  : nextConfig;
