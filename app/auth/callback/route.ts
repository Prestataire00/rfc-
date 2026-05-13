import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase-auth/server";
import { prisma } from "@/lib/prisma";
import {
  destinationByRole,
  sanitizeNext,
} from "@/lib/auth/post-login-redirect";

/**
 * Callback Supabase Auth (code → session).
 *
 * Appelé par Supabase après :
 * - sign-in OAuth / magic link (?code=...)
 * - confirmation email (?code=...)
 * - reset password (?code=...)
 *
 * 1. Échange le code contre une session (cookies posés par @supabase/ssr).
 * 2. Synchronise le supabaseId sur le User Prisma si la jointure par email
 *    n'a pas encore été faite (cas des comptes pré-migration G).
 * 3. Redirige vers le `next` validé ou vers la home selon le rôle.
 *
 * NextAuth reste fonctionnel en parallèle ; ce callback ne le touche pas.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextParam = url.searchParams.get("next");
  const errorParam = url.searchParams.get("error");

  if (errorParam) {
    const errorDesc = url.searchParams.get("error_description") ?? errorParam;
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorDesc)}`, request.url),
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=missing_code", request.url),
    );
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session || !data.user.email) {
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(error?.message ?? "exchange_failed")}`,
        request.url,
      ),
    );
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: data.user.email },
    select: { id: true, role: true, actif: true, supabaseId: true },
  });

  if (!dbUser || !dbUser.actif) {
    // Compte côté Supabase mais inexistant/désactivé côté Prisma :
    // on refuse, on signout pour pas laisser de session orpheline.
    await supabase.auth.signOut();
    return NextResponse.redirect(
      new URL("/login?error=account_not_found", request.url),
    );
  }

  if (!dbUser.supabaseId) {
    await prisma.user.update({
      where: { id: dbUser.id },
      data: { supabaseId: data.user.id },
    });
  }

  const destination = sanitizeNext(nextParam) ?? destinationByRole(dbUser.role);
  return NextResponse.redirect(new URL(destination, request.url));
}
