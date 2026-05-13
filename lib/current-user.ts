import "server-only";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase-auth/server";

export type AuthSource = "nextauth" | "supabase";

export type CurrentUser = {
  id: string;
  email: string;
  role: string;
  actif: boolean;
  nom: string;
  prenom: string;
  formateurId: string | null;
  entrepriseId: string | null;
  source: AuthSource;
};

/**
 * Résout l'utilisateur courant depuis Supabase Auth si une session existe,
 * sinon depuis NextAuth (coexistence pendant la phase de migration).
 *
 * Source d'autorité : Prisma `User` reste le modèle métier (rôle, formateurId,
 * entrepriseId, actif). Supabase Auth ne fournit que l'identité (email). Le
 * lookup Prisma sur email garantit qu'un user désactivé (`actif=false`) ne
 * passe jamais, même si sa session Supabase est encore valide.
 *
 * À substituer aux appels `getServerSession(authOptions)` au fil de la phase
 * D (migration des routes API). Voir docs/MIGRATION_AUTH.md.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabaseUser = await tryGetSupabaseEmail();
  if (supabaseUser) {
    const dbUser = await prisma.user.findUnique({
      where: { email: supabaseUser },
    });
    if (dbUser && dbUser.actif) {
      return toCurrentUser(dbUser, "supabase");
    }
    // Session Supabase orpheline (user supprimé/désactivé côté Prisma) :
    // on ne fallback PAS sur NextAuth — l'utilisateur doit se ré-authentifier.
    return null;
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  const dbUser = await prisma.user.findUnique({
    where: { email: session.user.email },
  });
  if (!dbUser || !dbUser.actif) return null;

  return toCurrentUser(dbUser, "nextauth");
}

async function tryGetSupabaseEmail(): Promise<string | null> {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.email ?? null;
  } catch {
    // ENV Supabase Auth non configurée OU erreur réseau : on traite comme
    // "pas de session Supabase" et on laisse NextAuth prendre la main.
    return null;
  }
}

function toCurrentUser(
  dbUser: {
    id: string;
    email: string;
    role: string;
    actif: boolean;
    nom: string;
    prenom: string;
    formateurId: string | null;
    entrepriseId: string | null;
  },
  source: AuthSource,
): CurrentUser {
  return {
    id: dbUser.id,
    email: dbUser.email,
    role: dbUser.role,
    actif: dbUser.actif,
    nom: dbUser.nom,
    prenom: dbUser.prenom,
    formateurId: dbUser.formateurId,
    entrepriseId: dbUser.entrepriseId,
    source,
  };
}

export async function requireCurrentUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

export async function requireRole(
  allowed: ReadonlyArray<string>,
): Promise<CurrentUser> {
  const user = await requireCurrentUser();
  if (!allowed.includes(user.role)) {
    throw new Error("FORBIDDEN");
  }
  return user;
}
