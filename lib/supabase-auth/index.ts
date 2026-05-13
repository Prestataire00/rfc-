/**
 * Supabase Auth — utilities partagés.
 *
 * Imports recommandés :
 *   import { createSupabaseServerClient } from "@/lib/supabase-auth/server";
 *   import { createSupabaseBrowserClient } from "@/lib/supabase-auth/browser";
 *
 * Ce barrel n'est PAS un point d'import : `server.ts` et `admin.ts` ont
 * `import "server-only"` et casseraient le bundle client s'ils étaient
 * agrégés ici. Importer directement le sous-chemin requis.
 *
 * Voir docs/MIGRATION_AUTH.md pour la roadmap complète.
 */

export {};
