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
    const connectSrc = ["'self'"];
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
      "frame-ancestors 'none'",
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

export default nextConfig;
