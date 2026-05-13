import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Public paths that don't require authentication
const publicPaths = [
  "/login",
  "/evaluation",
  "/inscription-stagiaire",
];

// Admin-only page prefixes
const adminPages = [
  "/dashboard",
  "/formations",
  "/sessions",
  "/besoins",
  "/fiches-besoin",
  "/contacts",
  "/formateurs",
  "/lieux-formation",
  "/commercial",
  "/evaluations",
  "/qualiopi",
  "/bpf",
  "/documents",
  "/utilisateurs",
  "/parametres",
  "/admin",
];

// Admin-only API prefixes
const adminApiPrefixes = [
  "/api/ai",
  "/api/formations",
  "/api/sessions",
  "/api/contacts",
  "/api/entreprises",
  "/api/formateurs",
  "/api/devis",
  "/api/factures",
  "/api/besoins",
  "/api/besoin-client",
  "/api/besoin-stagiaire",
  "/api/evaluations",
  "/api/bpf",
  "/api/documents",
  "/api/utilisateurs",
  "/api/parametres",
  "/api/email",
  "/api/upload",
  "/api/export",
  "/api/notifications",
  "/api/message-templates",
  "/api/document-templates",
  "/api/automations",
  "/api/automations-v2",
  "/api/tags",
  "/api/campaigns",
  "/api/badges",
  "/api/forum",
  "/api/notes-frais",
  "/api/classes-virtuelles",
  "/api/competences",
  "/api/pdf/template-preview",
  // "/api/pdf" (sauf template-preview) — accessible aux clients et formateurs authentifiés
];

function isPublicPath(pathname: string): boolean {
  if (pathname === "/login") return true;
  if (pathname.startsWith("/api/auth")) return true;
  // /api/cron/* : pas de session NextAuth (appelé par cron externe GitHub Actions).
  // L'authentification est faite par les route handlers eux-mêmes via le Bearer
  // CRON_SECRET — cf .github/workflows/cron.yml + commit d49fc77.
  if (pathname.startsWith("/api/cron/")) return true;
  if (pathname.startsWith("/api/evaluations/public")) return true;
  if (pathname.startsWith("/api/inscription-publique")) return true;
  if (pathname.startsWith("/api/besoin-client/public")) return true;
  if (pathname.startsWith("/api/besoin-stagiaire/public")) return true;
  if (pathname.startsWith("/evaluation/")) return true;
  if (pathname.startsWith("/inscription-stagiaire")) return true;
  if (pathname.startsWith("/fiche-besoin-client/")) return true;
  if (pathname.startsWith("/fiche-besoin-stagiaire/")) return true;
  if (pathname.startsWith("/emargement/")) return true;
  if (pathname.startsWith("/api/emargement/public")) return true;
  if (pathname.startsWith("/api/campaigns/unsubscribe")) return true;
  if (pathname.startsWith("/api/qualite/public/")) return true;
  if (pathname.startsWith("/qualite/share/")) return true;
  if (pathname.startsWith("/api/email-tracking/webhook")) return true;
  if (pathname.startsWith("/catalogue")) return true;
  if (pathname.startsWith("/api/catalogue")) return true;
  if (pathname.startsWith("/badges/")) return true;
  if (pathname.startsWith("/api/badges/verify")) return true;
  if (pathname.startsWith("/presentation")) return true;
  if (pathname.startsWith("/legal/")) return true;
  if (pathname.startsWith("/rgpd/demande")) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname === "/favicon.ico") return true;
  if (pathname === "/logo.svg") return true;
  if (pathname === "/logo-icon.svg") return true;
  if (pathname.match(/\.(pdf|png|jpg|jpeg|svg|gif|ico|webp)$/)) return true;
  return false;
}

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

function redirectToPortal(role: string, request: NextRequest): NextResponse {
  if (role === "formateur") {
    return NextResponse.redirect(new URL("/espace-formateur", request.url));
  }
  if (role === "client") {
    return NextResponse.redirect(new URL("/espace-client", request.url));
  }
  return NextResponse.redirect(new URL("/dashboard", request.url));
}

// ── CSP avec nonce (pattern officiel Next.js 14) ─────────────────────────────
// https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy
//
// script-src : strict nonce + strict-dynamic = vraie protection XSS. Next.js
// auto-injecte le nonce dans ses scripts si le request header est set.
// style-src : 'unsafe-inline' conservé pour compat sonner (CSS-in-JS) +
// ThemeProvider (script anti-flash). À durcir en V2 avec sonner CSS hashes
// ou nonce sur styles.
function buildCsp(nonce: string): string {
  const supabaseHost = (() => {
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      return url ? new URL(url).host : null;
    } catch {
      return null;
    }
  })();

  const connectSrc = [
    "'self'",
    // Upstash REST (rate-limit)
    "https://*.upstash.io",
    // Sentry ingest
    "https://*.sentry.io",
    "https://*.ingest.sentry.io",
  ];
  if (supabaseHost) {
    connectSrc.push(`https://${supabaseHost}`, `wss://${supabaseHost}`);
  }

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
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
}

// Helper : génère un nonce 128 bits base64. crypto.randomUUID() est assez fort
// pour un nonce (uniquement besoin d'unicité par requête, pas de secret).
const generateNonce = (): string =>
  Buffer.from(crypto.randomUUID()).toString("base64");

// Applique le header CSP sur une réponse existante (redirect, JSON, next).
const applyCsp = (response: NextResponse, csp: string): NextResponse => {
  response.headers.set("Content-Security-Policy", csp);
  return response;
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Génère un nonce frais pour cette requête + CSP correspondante.
  const nonce = generateNonce();
  const csp = buildCsp(nonce);

  // Set le nonce et la CSP dans les request headers pour que Next.js puisse :
  //   - injecter le nonce dans les scripts d'hydratation auto-générés
  //   - exposer le nonce au layout via `headers().get('x-nonce')`
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  // Allow public paths — CSP appliquée quand même
  if (isPublicPath(pathname)) {
    return applyCsp(
      NextResponse.next({ request: { headers: requestHeaders } }),
      csp,
    );
  }

  // Get the JWT token
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  const isApi = isApiRoute(pathname);

  // No token → unauthenticated
  if (!token) {
    if (isApi) {
      return applyCsp(
        NextResponse.json({ error: "Non authentifié" }, { status: 401 }),
        csp,
      );
    }
    return applyCsp(NextResponse.redirect(new URL("/login", request.url)), csp);
  }

  const role = token.role as string;

  // --- API route authorization ---
  if (isApi) {
    // Admin API routes
    if (adminApiPrefixes.some((prefix) => pathname.startsWith(prefix))) {
      if (role !== "admin") {
        return applyCsp(
          NextResponse.json({ error: "Accès interdit" }, { status: 403 }),
          csp,
        );
      }
      return applyCsp(
        NextResponse.next({ request: { headers: requestHeaders } }),
        csp,
      );
    }

    // Client API routes
    if (pathname.startsWith("/api/client")) {
      if (role !== "client" && role !== "admin") {
        return applyCsp(
          NextResponse.json({ error: "Accès interdit" }, { status: 403 }),
          csp,
        );
      }
      return applyCsp(
        NextResponse.next({ request: { headers: requestHeaders } }),
        csp,
      );
    }

    // Formateur API routes
    if (pathname.startsWith("/api/formateur")) {
      if (role !== "formateur" && role !== "admin") {
        return applyCsp(
          NextResponse.json({ error: "Accès interdit" }, { status: 403 }),
          csp,
        );
      }
      return applyCsp(
        NextResponse.next({ request: { headers: requestHeaders } }),
        csp,
      );
    }

    // Other authenticated API routes
    return applyCsp(
      NextResponse.next({ request: { headers: requestHeaders } }),
      csp,
    );
  }

  // --- Page authorization ---

  // Admin pages
  if (adminPages.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"))) {
    if (role !== "admin") {
      return applyCsp(redirectToPortal(role, request), csp);
    }
    return applyCsp(
      NextResponse.next({ request: { headers: requestHeaders } }),
      csp,
    );
  }

  // Formateur pages
  if (pathname.startsWith("/espace-formateur")) {
    if (role !== "formateur" && role !== "admin") {
      return applyCsp(redirectToPortal(role, request), csp);
    }
    return applyCsp(
      NextResponse.next({ request: { headers: requestHeaders } }),
      csp,
    );
  }

  // Client pages
  if (pathname.startsWith("/espace-client")) {
    if (role !== "client" && role !== "admin") {
      return applyCsp(redirectToPortal(role, request), csp);
    }
    return applyCsp(
      NextResponse.next({ request: { headers: requestHeaders } }),
      csp,
    );
  }

  // All other authenticated pages
  return applyCsp(
    NextResponse.next({ request: { headers: requestHeaders } }),
    csp,
  );
}

export const config = {
  matcher: [
    // Exclut les assets statiques pour éviter de générer un nonce inutile à
    // chaque image/font. Inclut tout le reste (pages + API).
    {
      source: "/((?!_next/static|_next/image|favicon.ico|logo.svg|logo-icon.svg).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
