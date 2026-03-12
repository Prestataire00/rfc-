import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const authConfig = {
  pages: {
    signIn: "/connexion",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize() {
        // Handled in auth.ts
        return null;
      },
    }),
  ],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnAuth = nextUrl.pathname.startsWith("/connexion");

      if (isOnAuth) {
        if (isLoggedIn) {
          const role = (auth?.user as { role?: string })?.role;
          const redirectUrl = getRedirectForRole(role);
          return Response.redirect(new URL(redirectUrl, nextUrl));
        }
        return true;
      }

      if (!isLoggedIn) {
        return false;
      }

      // Role-based route protection
      const role = (auth?.user as { role?: string })?.role;
      const pathname = nextUrl.pathname;

      if (pathname.startsWith("/portail-formateur") && role !== "FORMATEUR" && role !== "ADMIN") {
        return Response.redirect(new URL(getRedirectForRole(role), nextUrl));
      }
      if (pathname.startsWith("/portail-client") && role !== "CLIENT" && role !== "ADMIN") {
        return Response.redirect(new URL(getRedirectForRole(role), nextUrl));
      }
      if (pathname.startsWith("/portail-stagiaire") && role !== "STAGIAIRE" && role !== "ADMIN") {
        return Response.redirect(new URL(getRedirectForRole(role), nextUrl));
      }
      // Dashboard routes (/) — admin only
      if (!pathname.startsWith("/portail-") && role !== "ADMIN") {
        return Response.redirect(new URL(getRedirectForRole(role), nextUrl));
      }

      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string }).role = token.role as string;
        session.user.id = token.id as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

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
