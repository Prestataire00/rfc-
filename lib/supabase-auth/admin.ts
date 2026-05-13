import "server-only";

import { createClient } from "@supabase/supabase-js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} manquant. Le client admin Supabase ne peut pas démarrer sans la service-role key.`,
    );
  }
  return value;
}

let cached: ReturnType<typeof createClient> | null = null;

/**
 * Client Supabase service-role (BYPASS RLS).
 *
 * Réservé aux opérations de migration / administration côté serveur uniquement :
 * création d'utilisateurs (auth.admin.createUser), bulk operations, jobs cron.
 * Ne JAMAIS exposer ce client côté navigateur — il a tous les droits.
 */
export function createSupabaseAdminClient() {
  if (cached) return cached;
  cached = createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
  return cached;
}
