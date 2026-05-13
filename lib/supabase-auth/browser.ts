"use client";

import { createBrowserClient } from "@supabase/ssr";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} manquant. Cette variable doit être exposée côté client (NEXT_PUBLIC_*).`,
    );
  }
  return value;
}

let cachedClient: ReturnType<typeof createBrowserClient> | null = null;

export function createSupabaseBrowserClient() {
  if (cachedClient) return cachedClient;
  cachedClient = createBrowserClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  );
  return cachedClient;
}
