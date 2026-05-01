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
  "/entreprises",
  "/formateurs",
  "/lieux-formation",
  "/commercial",
  "/evaluations",
  "/qualiopi",
  "/bpf",
  "/documents",
  "/utilisateurs",
  "/parametres",
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
  if (pathname.startsWith("/catalogue")) return true;
  if (pathname.startsWith("/api/catalogue")) return true;
  if (pathname.startsWith("/badges/")) return true;
  if (pathname.startsWith("/api/badges/verify")) return true;
  if (pathname.startsWith("/presentation")) return true;
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

  // Get the JWT token
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  const isApi = isApiRoute(pathname);

  // No token → unauthenticated
  if (!token) {
    if (isApi) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const role = token.role as string;

  // --- API route authorization ---
  if (isApi) {
    // Admin API routes
    if (adminApiPrefixes.some((prefix) => pathname.startsWith(prefix))) {
      if (role !== "admin") {
        return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
      }
      return NextResponse.next();
    }

    // Client API routes
    if (pathname.startsWith("/api/client")) {
      if (role !== "client" && role !== "admin") {
        return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
      }
      return NextResponse.next();
    }

    // Formateur API routes
    if (pathname.startsWith("/api/formateur")) {
      if (role !== "formateur" && role !== "admin") {
        return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
      }
      return NextResponse.next();
    }

    // Other authenticated API routes
    return NextResponse.next();
  }

  // --- Page authorization ---

  // Admin pages
  if (adminPages.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"))) {
    if (role !== "admin") {
      return redirectToPortal(role, request);
    }
    return NextResponse.next();
  }

  // Formateur pages
  if (pathname.startsWith("/espace-formateur")) {
    if (role !== "formateur" && role !== "admin") {
      return redirectToPortal(role, request);
    }
    return NextResponse.next();
  }

  // Client pages
  if (pathname.startsWith("/espace-client")) {
    if (role !== "client" && role !== "admin") {
      return redirectToPortal(role, request);
    }
    return NextResponse.next();
  }

  // All other authenticated pages
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.svg|logo-icon.svg).*)"],
};
