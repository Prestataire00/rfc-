# Migration auth — NextAuth → Supabase Auth

> Stratégie : **Strangler Fig**. NextAuth reste fonctionnel pendant toute la
> durée de la migration. Supabase Auth est ajouté en parallèle, les API/UI
> migrent par lots, NextAuth est retiré en dernier.
>
> Aucune fenêtre où le site est cassé. Aucun gros bang.

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
