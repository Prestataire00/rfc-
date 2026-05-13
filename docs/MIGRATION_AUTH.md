# Migration auth — NextAuth → Supabase Auth

> Stratégie : **Strangler Fig**. NextAuth reste fonctionnel pendant toute la
> durée de la migration. Supabase Auth est ajouté en parallèle, les API/UI
> migrent par lots, NextAuth est retiré en dernier.
>
> Aucune fenêtre où le site est cassé. Aucun gros bang.

## État actuel (branche `feat/supabase-auth-migration`)

| Phase | Statut | Livrable |
|---|---|---|
| A — Fondations utilities | ✅ Livré | `lib/supabase-auth/*`, `lib/current-user.ts` |
| B — Schéma `User.supabaseId` | ✅ Livré (migration non encore appliquée en prod) | `prisma/migrations/20260513105500_*` |
| C — Setup dashboard Supabase | ⚠️ À faire manuellement | Voir §Runbook prod |
| D — Route `/auth/callback` | ✅ Livré | `app/auth/callback/route.ts` |
| D-UI — Formulaire login | 🔲 À faire (sprint dédié, casse l'UX si mal fait) | — |
| E — Helper `withAuth` | ✅ Livré (helper seul, routes pas migrées) | `lib/auth/with-auth.ts` |
| E-routes — Migration des 30+ routes | 🔲 À faire (sprint dédié avec E2E) | — |
| F — Middleware coexistence | ✅ Livré | `middleware.ts` |
| G — Script migration users | ✅ Livré (non exécuté) | `scripts/migrate-users-to-supabase.ts` |
| H — Cleanup NextAuth | 🔲 À faire après G + 14j de stabilité | — |

## État cible

| Composant | Avant | Après |
|---|---|---|
| Authentification | NextAuth v4 + JWT | Supabase Auth (cookies) |
| Source de rôle | `token.role` (JWT signé `NEXTAUTH_SECRET`) | Prisma `User.role` (lookup par email) |
| RBAC middleware | `getToken(... NEXTAUTH_SECRET)` | `updateSupabaseSession` + `getCurrentUser` |
| Helper API | `getServerSession(authOptions)` | `getCurrentUser()` / `requireRole([...])` |
| Storage | Supabase (inchangé) | Supabase (inchangé) |
| Persistance user | Prisma `User` (inchangée hors ajout d'un `supabaseId`) | Prisma `User` |

## Variables d'env à ajouter

```bash
# Locale (.env.local) et Netlify (prod)
NEXT_PUBLIC_SUPABASE_URL=...        # déjà présent (utilisé pour storage)
NEXT_PUBLIC_SUPABASE_ANON_KEY=...   # NEW — clé anon publique
SUPABASE_SERVICE_ROLE_KEY=...       # déjà présent
```

Le service-role reste réservé au backend (`lib/supabase-auth/admin.ts`,
`lib/supabase.ts` storage). Ne JAMAIS l'exposer côté navigateur.

## Phases

### Phase A — Fondations en coexistence (CETTE BRANCHE)

- [x] `lib/supabase-auth/server.ts` — client SSR App Router
- [x] `lib/supabase-auth/browser.ts` — client navigateur
- [x] `lib/supabase-auth/admin.ts` — client service-role
- [x] `lib/supabase-auth/middleware.ts` — `updateSupabaseSession()` pour le middleware
- [x] `lib/current-user.ts` — helper unifié (`getCurrentUser`, `requireCurrentUser`, `requireRole`)
- [x] Tests Vitest

**Effet :** zéro. Rien n'est branché. NextAuth continue de gérer 100 % du trafic.

### Phase B — Schéma : lier les deux identités

Ajouter à `prisma/schema.prisma` :

```prisma
model User {
  // ... existant
  supabaseId String? @unique  // auth.users.id côté Supabase
}
```

Migration : `prisma migrate dev --name add_user_supabase_id`. Champ nullable
le temps que la sync soit terminée.

Pourquoi pas joindre sur `email` durablement ? Parce qu'un user peut changer
d'email, et qu'on veut une clé stable pour les triggers webhook
(`auth.users` → `User`). Pendant la phase de coexistence, le helper joint
sur email ; après migration, on basculera sur `supabaseId`.

### Phase C — Setup Supabase Auth (dashboard)

1. Activer le provider Email (password + magic link désactivable plus tard).
2. Désactiver les sign-ups publics (`Disable signups`) — création users
   réservée aux admins via `/api/utilisateurs` qui appellera
   `supabase.auth.admin.createUser`.
3. Configurer le SMTP custom (réutiliser Nodemailer/SES — voir `lib/email.ts`).
4. Templates emails (reset password, confirm) en FR.
5. Site URL : `https://projetrfc.netlify.app` + redirect `/auth/callback`.

### Phase D — UI login bascule sur Supabase

1. `app/login/page.tsx` : remplacer `signIn("credentials", ...)` par
   `supabase.auth.signInWithPassword({ email, password })`.
2. Créer `app/auth/callback/route.ts` (échange code → session côté serveur).
3. `app/api/utilisateurs/route.ts` (POST) : créer dans Supabase Auth d'abord,
   puis dans Prisma avec `supabaseId` lié.
4. Reset password : route dédiée utilisant `supabase.auth.resetPasswordForEmail`.

NextAuth reste branché. Si pour une raison X la session Supabase manque,
`getCurrentUser()` fallback sur NextAuth — pas de régression.

### Phase E — API routes : `getServerSession` → `getCurrentUser`

Lot par lot (~30 routes), substitution mécanique :

```ts
// AVANT
const session = await getServerSession(authOptions);
if (!session?.user) return new Response("Unauthorized", { status: 401 });
if ((session.user as any).role !== "admin") return new Response("Forbidden", { status: 403 });

// APRÈS
const user = await requireRole(["admin"]).catch((e) => e);
if (user instanceof Error) {
  return new Response(user.message, {
    status: user.message === "UNAUTHORIZED" ? 401 : 403,
  });
}
```

Ordre suggéré : modules les plus testés d'abord (signature, upload), modules
critiques (paiement, devis) en dernier — moins de surface de régression à
chaque commit.

### Phase F — Middleware

Brancher `updateSupabaseSession()` en tête du middleware, lire le user via
Supabase d'abord, fallback `getToken()` NextAuth. Conserver la logique de
routing par rôle telle quelle. Quand 100 % des sessions actives sont sur
Supabase (vérifier en prod via logs), supprimer le bloc NextAuth.

### Phase G — Migration des comptes existants

Script one-shot `scripts/migrate-users-to-supabase.ts` :

1. Lire tous les `User` Prisma actifs.
2. Pour chacun, `supabase.auth.admin.createUser({ email, password_hash: bcryptHash, password_hash_format: "bcrypt" })` — Supabase Auth accepte les hash bcrypt en import.
3. Mettre à jour `User.supabaseId`.
4. Notifier les utilisateurs (email) qu'ils peuvent se reconnecter
   normalement (leur mot de passe est préservé).

À tester sur staging avec un export anonymisé avant la prod.

### Phase H — Cleanup NextAuth

Une fois tous les users migrés ET 0 fallback NextAuth observé sur 14 jours :

- `npm uninstall next-auth`
- Supprimer `lib/auth.ts`, `app/api/auth/[...nextauth]/route.ts`,
  `User.password` (devenu inutile — Supabase Auth gère).
- Retirer `NEXTAUTH_SECRET`, `NEXTAUTH_URL` des env.
- Migration Prisma `drop_user_password`.

## Risques & mitigations

| Risque | Mitigation |
|---|---|
| Session Supabase orpheline (user supprimé Prisma) | `getCurrentUser` refuse explicitement — pas de fallback NextAuth dans ce cas |
| Désynchro `auth.users` ↔ Prisma `User` | Trigger Postgres ou webhook auth events → sync `supabaseId`/email |
| Rate-limit perdu (NextAuth `authorize` avait double rate-limit) | Re-implémenter en frontend de l'endpoint `signInWithPassword` |
| Sessions JWT actives invalidées | Pendant la phase D-E, garder NextAuth comme fallback ; après phase G, expirer les vieux JWT en changeant `NEXTAUTH_SECRET` |
| Tests E2E qui injectent un cookie NextAuth | Migrer les helpers de test au moment de la phase F |

## Critères de complétion (Definition of Done)

- [ ] Aucune référence à `getServerSession` dans `app/api/**`
- [ ] Aucune référence à `next-auth` dans `package.json`
- [ ] `User.supabaseId` non-null pour 100 % des comptes actifs
- [ ] Smoke tests login admin / formateur / client passent en prod
- [ ] Logs : 0 hit du fallback NextAuth dans `lib/current-user.ts` sur 14 j

---

## Runbook prod (à exécuter dans l'ordre)

### 1. Setup dashboard Supabase

Avant tout déploiement de cette branche :

1. Dashboard → Authentication → Providers → activer **Email** (password).
2. Authentication → Settings → désactiver **Enable signups** (création
   réservée aux admins via `/api/utilisateurs` qui passera par
   `supabase.auth.admin.createUser`).
3. Email templates → traduire en FR (Confirm signup, Magic link,
   Reset password, Email change).
4. URL Configuration → **Site URL** = `https://projetrfc.netlify.app`.
   **Redirect URLs** = `https://projetrfc.netlify.app/auth/callback`.
5. SMTP → configurer le SMTP custom (réutiliser le SES/Nodemailer
   existant — cf `lib/email.ts`). Sinon l'envoi par défaut Supabase est
   rate-limité à 3 emails/heure et inutilisable en prod.
6. Récupérer `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Project Settings → API).

### 2. Variables d'env Netlify

```bash
NEXT_PUBLIC_SUPABASE_URL=...        # déjà présent
NEXT_PUBLIC_SUPABASE_ANON_KEY=...   # NEW — depuis le dashboard
SUPABASE_SERVICE_ROLE_KEY=...       # déjà présent
```

À ajouter via `netlify env:set` ou le dashboard Netlify, sur tous les
environnements (production, branch-deploy, deploy-preview).

### 3. Déployer cette branche

Merger `feat/supabase-auth-migration` après code review. Aucune action
utilisateur visible — le middleware reste en fallback NextAuth tant
que la phase G n'a pas tourné.

### 4. Appliquer la migration Prisma

```bash
# Sur Netlify, ajouter ça au build command si pas déjà fait :
npx prisma migrate deploy
```

Cela applique `20260513105500_add_user_supabase_id` (ADD COLUMN
nullable + UNIQUE INDEX — non-destructif).

### 5. Exécuter le script de migration (phase G)

```bash
# Local, avec DATABASE_URL pointant vers la prod (ou via Netlify CLI)

# 5.1 — Dry-run sur toute la base
npx ts-node scripts/migrate-users-to-supabase.ts

# 5.2 — Test sur un compte admin
npx ts-node scripts/migrate-users-to-supabase.ts --apply --email admin@x.com

# 5.3 — Si OK, full apply
npx ts-node scripts/migrate-users-to-supabase.ts --apply
```

Sortie attendue : `migrated: N, alreadyMigrated: 0, failed: 0`. Toute
ligne `failed` doit être investiguée avant de passer à l'étape 6.

### 6. Activer le formulaire login Supabase (phase D-UI)

À ce stade, les comptes existent côté Supabase mais le formulaire
`/login` utilise encore NextAuth. Sprint dédié :

- `app/login/page.tsx` : `signIn("credentials", ...)` →
  `supabase.auth.signInWithPassword({ email, password })`
- Conserver le double rate-limit Upstash existant côté endpoint
  (`lib/rate-limit-presets.ts`) — Supabase Auth a son propre rate-limit
  mais on garde le nôtre par défense en profondeur.
- `/forgot-password` → `supabase.auth.resetPasswordForEmail`.

Smoke test post-déploiement : login admin + formateur + client.

### 7. Migrer les API routes (phase E)

Pour chaque route avec `getServerSession`, remplacer par `withAuth`.
Faire par lots (UI / module métier) avec tests E2E à chaque fois.
Ordre suggéré dans §Phase E.

### 8. Surveiller pendant 14 jours

Logger côté `lib/current-user.ts` quand la branche `nextauth` est
utilisée. Un Sentry breadcrumb suffit. Quand le compteur atteint 0
sur 14 jours glissants : passer à l'étape 9.

### 9. Cleanup phase H

```bash
npm uninstall next-auth
```

Supprimer :
- `lib/auth.ts`
- `app/api/auth/[...nextauth]/route.ts`
- Le bloc `getToken` du middleware (lignes 153-167)
- `NEXTAUTH_SECRET` / `NEXTAUTH_URL` des env Netlify
- `User.password` (créer une migration `drop_user_password`)

Smoke test final. Si OK, fermer la migration.

---

## Rollback

Chaque phase est rétrocompatible. Pour annuler :

| Phase | Rollback |
|---|---|
| F (middleware) | Revert le commit ; NextAuth gère seul à nouveau |
| G (script) | `UPDATE "User" SET "supabaseId" = NULL WHERE ...`, puis dans Supabase Auth → supprimer les users importés |
| D (callback) | Revert le commit ; route 404 mais aucun flux ne l'utilise tant que phase D-UI pas faite |
| B (schéma) | Migration inverse `DROP COLUMN "supabaseId"` |

Une fois en phase H, le rollback NextAuth n'est plus possible sans
restauration de backup. C'est le point de non-retour.
