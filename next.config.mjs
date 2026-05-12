/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["http://rfc.local:3001", "http://127.0.0.1:3001"],

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
