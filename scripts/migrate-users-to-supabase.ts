/**
 * Migration one-shot : crée un compte Supabase Auth pour chaque User Prisma
 * actif qui n'en a pas encore.
 *
 * Le password bcrypt existant est importé tel quel via le format `bcrypt` :
 * les utilisateurs peuvent se reconnecter immédiatement avec leur mot de
 * passe actuel, aucun reset n'est nécessaire.
 *
 * USAGE
 *   # Dry-run (par défaut) : aucune écriture, juste un compte rendu
 *   npx ts-node scripts/migrate-users-to-supabase.ts
 *
 *   # Migrer pour de vrai (toute la base)
 *   npx ts-node scripts/migrate-users-to-supabase.ts --apply
 *
 *   # Cibler un email (test)
 *   npx ts-node scripts/migrate-users-to-supabase.ts --apply --email alice@x.com
 *
 *   # Taille de batch (defaults 50)
 *   npx ts-node scripts/migrate-users-to-supabase.ts --apply --batch-size 100
 *
 * IDÉMPOTENT : ré-exécuter ce script ne crée pas de doublons (skip si
 * supabaseId déjà set OU si email déjà connu côté Supabase).
 *
 * PRÉ-REQUIS
 *   - NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans .env
 *   - Disable signups doit être ON côté Supabase (sinon des doublons
 *     pourraient apparaître entre l'import et la phase D)
 *   - La migration Prisma 20260513105500_add_user_supabase_id doit être
 *     appliquée
 *
 * Voir docs/MIGRATION_AUTH.md §Phase G.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { prisma } from "@/lib/prisma";

// On n'importe PAS lib/supabase-auth/admin.ts ici car son `import "server-only"`
// casse les scripts CLI (ts-node, sans webpack). On recrée un client minimal.
function createCliAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis dans .env",
    );
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

type Args = {
  apply: boolean;
  email: string | null;
  batchSize: number;
};

function parseArgs(argv: ReadonlyArray<string>): Args {
  let apply = false;
  let email: string | null = null;
  let batchSize = 50;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--apply") apply = true;
    else if (arg === "--email") email = argv[++i] ?? null;
    else if (arg === "--batch-size") batchSize = Number(argv[++i]) || 50;
  }

  return { apply, email, batchSize };
}

type MigrationStats = {
  scanned: number;
  alreadyMigrated: number;
  migrated: number;
  skippedExistingSupabase: number;
  failed: number;
};

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const mode = args.apply ? "APPLY" : "DRY-RUN";
  console.log(`[migrate-users] Mode: ${mode}  Batch: ${args.batchSize}`);
  if (args.email) console.log(`[migrate-users] Email filter: ${args.email}`);

  const supabase = createCliAdminClient();

  const where = {
    actif: true,
    supabaseId: null,
    ...(args.email ? { email: args.email } : {}),
  };
  const total = await prisma.user.count({ where });
  console.log(`[migrate-users] ${total} compte(s) à traiter`);

  const stats: MigrationStats = {
    scanned: 0,
    alreadyMigrated: 0,
    migrated: 0,
    skippedExistingSupabase: 0,
    failed: 0,
  };

  let cursor: string | undefined;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const batch = await prisma.user.findMany({
      where,
      orderBy: { id: "asc" },
      take: args.batchSize,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      select: {
        id: true,
        email: true,
        password: true,
        role: true,
        formateurId: true,
        entrepriseId: true,
      },
    });
    if (batch.length === 0) break;

    for (const user of batch) {
      stats.scanned++;
      const result = await migrateOne(supabase, user, args.apply);
      stats[result]++;
    }

    cursor = batch[batch.length - 1]?.id;
    if (batch.length < args.batchSize) break;
  }

  console.log("[migrate-users] Done.");
  console.table(stats);
  if (!args.apply) {
    console.log("Dry-run terminé. Relancer avec --apply pour appliquer.");
  }
  await prisma.$disconnect();
}

type MigratableUser = {
  id: string;
  email: string;
  password: string;
  role: string;
  formateurId: string | null;
  entrepriseId: string | null;
};

async function migrateOne(
  supabase: SupabaseClient,
  user: MigratableUser,
  apply: boolean,
): Promise<
  "migrated" | "alreadyMigrated" | "skippedExistingSupabase" | "failed"
> {
  if (!apply) {
    console.log(`[dry-run] would migrate ${user.email} (role=${user.role})`);
    return "migrated";
  }

  // app_metadata est lu par le middleware (edge runtime, pas de Prisma).
  // C'est aussi non modifiable côté client : seul le service-role peut le
  // mettre à jour, donc safe pour stocker des données d'autorisation.
  const appMetadata = {
    role: user.role,
    formateurId: user.formateurId,
    entrepriseId: user.entrepriseId,
  };

  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password_hash: user.password,
      email_confirm: true,
      user_metadata: { prisma_user_id: user.id },
      app_metadata: appMetadata,
    });

    if (error) {
      // 422 = email already exists côté Supabase Auth → on link l'existant.
      if (/already (registered|exists)/i.test(error.message)) {
        return await linkExistingSupabaseUser(supabase, user);
      }
      console.error(`[FAIL] ${user.email} :`, error.message);
      return "failed";
    }

    if (!data?.user?.id) {
      console.error(`[FAIL] ${user.email} : no user id returned`);
      return "failed";
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { supabaseId: data.user.id },
    });
    console.log(`[OK] ${user.email} → ${data.user.id}`);
    return "migrated";
  } catch (err) {
    console.error(`[FAIL] ${user.email} :`, err);
    return "failed";
  }
}

async function linkExistingSupabaseUser(
  supabase: SupabaseClient,
  user: MigratableUser,
): Promise<"skippedExistingSupabase" | "failed"> {
  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1,
  });
  // L'API listUsers ne filtre pas par email directement ; on parcourt jusqu'à
  // trouver le compte. Pour des bases > 1k utilisateurs, préférer un appel
  // direct à `auth.admin.getUserById` après stockage du mapping en CSV.
  const found = (data?.users ?? []).find(
    (u) => u.email?.toLowerCase() === user.email.toLowerCase(),
  );
  if (!found) {
    console.error(
      `[FAIL] ${user.email} : Supabase dit "already exists" mais introuvable via listUsers`,
    );
    if (error) console.error(error.message);
    return "failed";
  }

  // Synchronise app_metadata côté Supabase pour que le middleware edge
  // puisse lire le rôle, même si le user a été créé manuellement.
  await supabase.auth.admin.updateUserById(found.id, {
    app_metadata: {
      role: user.role,
      formateurId: user.formateurId,
      entrepriseId: user.entrepriseId,
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { supabaseId: found.id },
  });
  console.log(`[LINKED] ${user.email} → ${found.id} (existait déjà)`);
  return "skippedExistingSupabase";
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
