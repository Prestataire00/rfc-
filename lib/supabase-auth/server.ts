import "server-only";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} manquant. Voir docs/MIGRATION_AUTH.md §Setup pour configurer Supabase Auth.`,
    );
  }
  return value;
}

export function createSupabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // RSC contexte lecture seule : Server Components ne peuvent pas écrire
            // de cookies. Le middleware Supabase rafraîchira la session côté edge.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // idem set()
          }
        },
      },
    },
  );
}
