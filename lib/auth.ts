import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { RATE_LIMIT_PRESETS } from "@/lib/rate-limit-presets";

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error(
    "NEXTAUTH_SECRET manquant. Générer avec `openssl rand -base64 32` puis l'ajouter à .env (local) ou aux variables d'environnement Netlify (prod).",
  );
}

// NextAuth v4 expose req aux callbacks credentials. Type officiel imprécis
// (record string→string|string[]), on type ici l'accès qu'on en fait.
type AuthorizeReq = { headers?: Record<string, string | string[] | undefined> };

const extractIp = (req: AuthorizeReq | undefined): string => {
  const headers = req?.headers ?? {};
  const pick = (h: string | string[] | undefined): string | undefined => {
    if (!h) return undefined;
    return Array.isArray(h) ? h[0] : h;
  };
  const netlify = pick(headers["x-nf-client-connection-ip"]);
  if (netlify) return netlify.trim();
  const forwarded = pick(headers["x-forwarded-for"]);
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = pick(headers["x-real-ip"]);
  if (real) return real.trim();
  return "anon";
};

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;

        // Rate-limit double : par email (anti-brute-force ciblé) + par IP (anti-spray).
        // Si l'un des deux est dépassé, on refuse — sans révéler lequel à l'attaquant
        // (on retourne null comme pour des credentials invalides → message UI identique).
        const email = credentials.email.toLowerCase();
        const ip = extractIp(req as AuthorizeReq | undefined);
        const [byEmail, byIp] = await Promise.all([
          rateLimit(
            `login:email:${email}`,
            RATE_LIMIT_PRESETS.loginByEmail.max,
            RATE_LIMIT_PRESETS.loginByEmail.window,
          ),
          rateLimit(
            `login:ip:${ip}`,
            RATE_LIMIT_PRESETS.loginByIp.max,
            RATE_LIMIT_PRESETS.loginByIp.window,
          ),
        ]);
        if (!byEmail.ok || !byIp.ok) {
          // Pas de log explicite ici : NextAuth log déjà la tentative côté serveur
          // si on retourne null. Évite que l'attaquant infère le rate-limit du logging.
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { formateur: true, entreprise: true },
        });

        if (!user || !user.actif) return null;

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: `${user.prenom} ${user.nom}`,
          role: user.role,
          formateurId: user.formateurId,
          entrepriseId: user.entrepriseId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.formateurId = user.formateurId;
        token.entrepriseId = user.entrepriseId;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.sub!;
      session.user.role = token.role;
      session.user.formateurId = token.formateurId;
      session.user.entrepriseId = token.entrepriseId;
      return session;
    },
    async redirect({ url, baseUrl }) {
      // After login, the middleware handles role-based redirect from /dashboard
      if (url.startsWith(baseUrl)) return url;
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      return baseUrl + "/dashboard";
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    // TTL 24h : si un compte est désactivé (User.actif = false), l'accès est
    // coupé au prochain refresh (≤ 1h). Cf docs/operations/secret-rotation.md
    // pour la procédure d'invalidation immédiate (rotation NEXTAUTH_SECRET).
    maxAge: 24 * 60 * 60, // 24h
    updateAge: 60 * 60,    // refresh transparent toutes les heures
  },
};
