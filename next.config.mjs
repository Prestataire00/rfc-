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
  async headers() {
    const supabaseHost = (() => {
      try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        return url ? new URL(url).host : null;
      } catch {
        return null;
      }
    })();

    // CSP — démarre permissive (compatibilité Next 14 App Router + Tailwind +
    // shadcn/ui). À durcir via nonce middleware dans un sprint dédié.
    //
    // Audit 2026-05-19 §P2 ROADMAP — Migration vers CSP nonce-based :
    // 1. Générer un nonce cryptographique par requête dans middleware.ts
    //    (crypto.randomUUID() ou randomBytes(16).toString("base64"))
    // 2. Stocker le nonce dans un header (ex: x-nonce) lu côté Server Components
    //    pour l'injecter dans tous les <Script>/<style> inline
    // 3. Remplacer 'unsafe-inline' par 'nonce-XXX' dans script-src + style-src
    // 4. Audit côté codebase : repérer les <script> sans nonce qui casseraient
    // 5. Pour 'unsafe-eval' : audit shadcn/ui + react-pdf si possible le retirer
    //
    // Sources : https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy
    const connectSrc = ["'self'", "https://recherche-entreprises.api.gouv.fr"];
    if (supabaseHost) {
      connectSrc.push(`https://${supabaseHost}`, `wss://${supabaseHost}`);
    }
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      `connect-src ${connectSrc.join(" ")}`,
      // 'self' (au lieu de 'none') autorise les iframes same-origin —
      // requis pour la preview PDF dans /documents et /commercial/devis.
      // Clickjacking par tiers reste bloqué.
      "frame-ancestors 'self'",
      "form-action 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          // SAMEORIGIN (au lieu de DENY) : équivalent legacy de frame-ancestors 'self'
          // — autorise les iframes same-origin pour les previews PDF.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
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
