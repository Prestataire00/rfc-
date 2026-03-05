import { type NextRequest, NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "./lib/auth.config";

const { auth } = NextAuth(authConfig);

function getRedirectForRole(role?: string): string {
  switch (role) {
    case "ADMIN":
      return "/";
    case "FORMATEUR":
      return "/portail-formateur";
    case "CLIENT":
      return "/portail-client";
    case "STAGIAIRE":
      return "/portail-stagiaire";
    default:
      return "/connexion";
  }
}

export default auth(function middleware(request) {
  const { pathname } = request.nextUrl;
  const session = request.auth;
  const isLoggedIn = !!session?.user;

  // Public paths
  if (pathname.startsWith("/connexion") || pathname.startsWith("/api/auth")) {
    if (isLoggedIn && pathname.startsWith("/connexion")) {
      const role = (session?.user as { role?: string })?.role;
      return NextResponse.redirect(new URL(getRedirectForRole(role), request.url));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/connexion", request.url));
  }

  const role = (session?.user as { role?: string })?.role;

  // Role-based route protection
  if (pathname.startsWith("/portail-formateur") && role !== "FORMATEUR" && role !== "ADMIN") {
    return NextResponse.redirect(new URL(getRedirectForRole(role), request.url));
  }
  if (pathname.startsWith("/portail-client") && role !== "CLIENT" && role !== "ADMIN") {
    return NextResponse.redirect(new URL(getRedirectForRole(role), request.url));
  }
  if (pathname.startsWith("/portail-stagiaire") && role !== "STAGIAIRE" && role !== "ADMIN") {
    return NextResponse.redirect(new URL(getRedirectForRole(role), request.url));
  }
  if (!pathname.startsWith("/portail-") && role !== "ADMIN") {
    return NextResponse.redirect(new URL(getRedirectForRole(role), request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
