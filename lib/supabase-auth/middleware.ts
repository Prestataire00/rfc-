import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} manquant pour le middleware Supabase.`);
  }
  return value;
}

/**
 * Rafraîchit la session Supabase Auth dans le middleware Next.js et retourne
 * la réponse (avec cookies mis à jour) + le user courant (si présent).
 *
 * À appeler EN AMONT de la logique de gating dans middleware.ts. Pendant la
 * coexistence avec NextAuth, on lit aussi getToken() en parallèle et le helper
 * `getCurrentUser()` côté server arbitre la source d'autorité.
 */
export async function updateSupabaseSession(request: NextRequest): Promise<{
  response: NextResponse;
  user: Awaited<ReturnType<ReturnType<typeof createServerClient>["auth"]["getUser"]>>["data"]["user"];
}> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
