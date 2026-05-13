import "server-only";

import { NextResponse, type NextRequest } from "next/server";

import { getCurrentUser, type CurrentUser } from "@/lib/current-user";

type WithAuthContext<Ctx> = Ctx & { user: CurrentUser };

type WithAuthHandler<Ctx> = (
  req: NextRequest,
  ctx: WithAuthContext<Ctx>,
) => Promise<Response> | Response;

type WithAuthOptions = {
  /**
   * Rôles autorisés. Si absent, n'importe quel user authentifié passe.
   */
  roles?: ReadonlyArray<string>;
};

/**
 * Wrapper d'authentification pour les routes API App Router.
 *
 * Substitut systématique de `getServerSession(authOptions)` + check rôle
 * dupliqué en début de chaque handler. Utilise `getCurrentUser` qui arbitre
 * Supabase Auth puis NextAuth (cf docs/MIGRATION_AUTH.md).
 *
 * Exemple :
 *
 * ```ts
 * export const GET = withAuth<{ params: { id: string } }>(
 *   async (req, { user, params }) => {
 *     return NextResponse.json({ formateurId: user.formateurId, id: params.id });
 *   },
 *   { roles: ["formateur", "admin"] },
 * );
 * ```
 *
 * 401 si non authentifié, 403 si rôle non autorisé. Le body utilise un
 * format JSON stable `{ error: "UNAUTHORIZED" | "FORBIDDEN" }` pour matcher
 * la convention existante côté client.
 */
export function withAuth<Ctx = Record<string, never>>(
  handler: WithAuthHandler<Ctx>,
  options: WithAuthOptions = {},
) {
  return async (req: NextRequest, ctx: Ctx): Promise<Response> => {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    if (options.roles && !options.roles.includes(user.role)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
    return handler(req, { ...ctx, user });
  };
}
