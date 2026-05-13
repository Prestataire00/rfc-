import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

import { updateSupabaseSession } from "@/lib/supabase-auth/middleware";

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
  // Callback Supabase Auth (code → session). Cf docs/MIGRATION_AUTH.md.
  if (pathname.startsWith("/auth/callback")) return true;
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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const isApi = isApiRoute(pathname);

  // 1) Supabase Auth d'abord. Si une session existe, on lit le rôle depuis
  //    app_metadata (écrit par le script de migration G ou par la création
  //    de compte via supabase.auth.admin.createUser). app_metadata est non
  //    modifiable côté client → safe pour les décisions d'autorisation.
  let role: string | null = null;
  let supabaseResponse: NextResponse | null = null;

  try {
    const result = await updateSupabaseSession(request);
    supabaseResponse = result.response;
    if (result.user) {
      const meta = result.user.app_metadata as
        | { role?: string }
        | undefined;
      role = meta?.role ?? null;
    }
  } catch {
    // Si Supabase est indisponible / ENV manquante, on retombe sur NextAuth.
  }

  // 2) Fallback NextAuth tant que la phase G n'est pas terminée pour 100%
  //    des comptes. Voir docs/MIGRATION_AUTH.md §Phase H pour le cleanup.
  if (!role) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (!token) {
      if (isApi) {
        return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/login", request.url));
    }
    role = (token.role as string) ?? "";
  }

  // Réponse "autorisée" propage les cookies Supabase refreshés s'ils existent.
  const allow = () => supabaseResponse ?? NextResponse.next();

  // --- API route authorization ---
  if (isApi) {
    // Admin API routes
    if (adminApiPrefixes.some((prefix) => pathname.startsWith(prefix))) {
      if (role !== "admin") {
        return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
      }
      return allow();
    }

    // Client API routes
    if (pathname.startsWith("/api/client")) {
      if (role !== "client" && role !== "admin") {
        return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
      }
      return allow();
    }

    // Formateur API routes
    if (pathname.startsWith("/api/formateur")) {
      if (role !== "formateur" && role !== "admin") {
        return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
      }
      return allow();
    }

    // Other authenticated API routes
    return allow();
  }

  // --- Page authorization ---

  // Admin pages
  if (adminPages.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"))) {
    if (role !== "admin") {
      return redirectToPortal(role, request);
    }
    return allow();
  }

  // Formateur pages
  if (pathname.startsWith("/espace-formateur")) {
    if (role !== "formateur" && role !== "admin") {
      return redirectToPortal(role, request);
    }
    return allow();
  }

  // Client pages
  if (pathname.startsWith("/espace-client")) {
    if (role !== "client" && role !== "admin") {
      return redirectToPortal(role, request);
    }
    return allow();
  }

  // All other authenticated pages
  return allow();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.svg|logo-icon.svg).*)"],
};
