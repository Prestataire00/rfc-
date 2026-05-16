# Refactor Besoin → Demande + FichePreFormation* Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Renommer le concept "Besoin" éparpillé en 3 modèles + 5 routes vers `Demande` (commercial) + `FichePreFormationEntreprise/Stagiaire` (Qualiopi), sans perte de données ni casse des liens emails déjà envoyés.

**Architecture:** Renommage Prisma avec `@@map` (0 migration SQL) + renommage routes Next.js App Router + redirects 301 sur les anciennes routes publiques jusqu'au 2026-11-16. Refactor de code uniquement, pas de changement de schéma DB.

**Tech Stack:** Prisma 5, Next.js 14 App Router, TypeScript strict, Vitest, date-fns.

**Spec source :** [`docs/superpowers/specs/2026-05-16-refactor-besoin-design.md`](../specs/2026-05-16-refactor-besoin-design.md)

**Inventaire au démarrage** (`grep -rEl "BesoinFormation|BesoinClient|BesoinStagiaire|besoinFormation|besoinClient|besoinStagiaire"` + `grep -rEl '/besoins?|/fiches?-besoin|/api/besoin'`) :
- ~27 fichiers référencent les modèles
- ~28 fichiers référencent les URLs
- ~35-40 fichiers uniques au total (overlap)

---

## Task 0: Setup branche dédiée + baseline

**Files:**
- Modify: (aucun, opérations git)

- [ ] **Step 1: Vérifier qu'on est sur main à jour**

```bash
git checkout main
git pull --ff-only
git status --short
```

Expected: working tree clean, sur main.

- [ ] **Step 2: Créer la branche dédiée**

```bash
git checkout -b refactor/besoin-naming
```

Expected: `Switched to a new branch 'refactor/besoin-naming'`

- [ ] **Step 3: Baseline tests + typecheck**

```bash
npm test 2>&1 | tail -5
npx tsc --noEmit 2>&1 | tail -5
```

Expected: 71 tests pass, 0 erreur tsc.

---

## Task 1: Rename Prisma models avec @@map (0 migration SQL)

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Renommer `model BesoinFormation` → `model Demande` avec @@map**

Trouver dans `prisma/schema.prisma` la définition `model BesoinFormation { ... }`. La remplacer par :

```prisma
model Demande {
  // ... contenu inchangé ...

  @@map("BesoinFormation")
  // ... autres @@index existants ...
}
```

**IMPORTANT** : ajouter `@@map("BesoinFormation")` AVANT les `@@index` existants. Conserver tous les `@@index` déjà présents.

- [ ] **Step 2: Renommer `model BesoinClient` → `model FichePreFormationEntreprise` avec @@map**

```prisma
model FichePreFormationEntreprise {
  // ... contenu inchangé ...

  @@map("BesoinClient")
  // ... autres @@index existants ...
}
```

- [ ] **Step 3: Renommer `model BesoinStagiaire` → `model FichePreFormationStagiaire` avec @@map**

```prisma
model FichePreFormationStagiaire {
  // ... contenu inchangé ...

  @@map("BesoinStagiaire")
  // ... autres @@index existants ...
}
```

- [ ] **Step 4: Mettre à jour les références de relations dans les autres modèles**

Chercher dans `prisma/schema.prisma` toutes les occurrences de `BesoinFormation`, `BesoinClient`, `BesoinStagiaire` (en tant que type de relation) ET les noms de relations en camelCase (`besoinFormations`, `besoinsClient`, `besoinsStagiaire`, `besoins`, `besoinsStagiaire`, etc.).

Exemple typique dans `model Entreprise` :
```prisma
besoins       BesoinFormation[]
besoinsClient BesoinClient[]
```

À remplacer par :
```prisma
demandes               Demande[]
fichesPreFormation     FichePreFormationEntreprise[]
```

De même dans `model Session`, `model Contact`, `model Formation` : remplacer tous les types `BesoinFormation`, `BesoinClient`, `BesoinStagiaire` et renommer les noms de propriétés (`besoins` → `demandes`, `besoinsClient` → `fichesPreFormation`, `besoinsStagiaire` → `fichesPreFormationStagiaire`).

Astuce : `grep -n "Besoin\|besoin" prisma/schema.prisma` pour lister toutes les occurrences à traiter.

- [ ] **Step 5: Regenerate Prisma client**

```bash
npx prisma generate
```

Expected: `✔ Generated Prisma Client (...)`

- [ ] **Step 6: Vérifier qu'aucun changement structurel SQL n'est requis**

```bash
npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datasource prisma/schema.prisma --exit-code
```

Expected: exit code 0 ET "No difference detected" (les tables existantes en base correspondent toujours au schéma car `@@map` préserve les noms SQL).

Si le diff montre des renames de tables → STOP, `@@map` n'a pas été correctement appliqué.

- [ ] **Step 7: Tsc — attendu plein d'erreurs (les callers ne sont pas encore renommés)**

```bash
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l
```

Expected: plusieurs dizaines d'erreurs `TS2339` ou `TS2551` sur `prisma.besoinFormation`, `BesoinClient`, etc. C'est attendu — les tasks suivantes les corrigent.

- [ ] **Step 8: Commit le schéma renommé**

```bash
git add prisma/schema.prisma
git commit -m "refactor(prisma): rename Besoin* models with @@map (no SQL migration)

- BesoinFormation → Demande
- BesoinClient → FichePreFormationEntreprise
- BesoinStagiaire → FichePreFormationStagiaire

@@map preserves SQL table names → 0 data migration needed.
prisma migrate diff --exit-code returns 0.

Typecheck breaks on callers — fixed in subsequent commits.
"
```

---

## Task 2: Update lib/validations (Zod schemas)

**Files:**
- Modify: `lib/validations/besoin-formation.ts` → renommer fichier en `lib/validations/demande.ts`
- Modify: `lib/validations/besoin-client.ts` → renommer en `lib/validations/fiche-pre-formation-entreprise.ts`
- Modify: `lib/validations/besoin-stagiaire.ts` → renommer en `lib/validations/fiche-pre-formation-stagiaire.ts`

- [ ] **Step 1: Renommer les 3 fichiers**

```bash
git mv lib/validations/besoin-formation.ts lib/validations/demande.ts
git mv lib/validations/besoin-client.ts lib/validations/fiche-pre-formation-entreprise.ts
git mv lib/validations/besoin-stagiaire.ts lib/validations/fiche-pre-formation-stagiaire.ts
```

- [ ] **Step 2: Renommer les `export const` dans chaque fichier**

Dans `lib/validations/demande.ts` : chercher `besoinFormationSchema` (ou similaire) → renommer en `demandeSchema`.

Dans `lib/validations/fiche-pre-formation-entreprise.ts` : `besoinClientSchema` → `fichePreFormationEntrepriseSchema` (et toutes les variantes).

Dans `lib/validations/fiche-pre-formation-stagiaire.ts` : `besoinStagiaireSchema` / `besoinStagiaireReponseSchema` → `fichePreFormationStagiaireSchema` / `fichePreFormationStagiaireReponseSchema`.

Pour chaque fichier : `grep -n "besoin" lib/validations/<fichier>.ts` pour identifier toutes les occurrences à renommer.

- [ ] **Step 3: tsc — vérifier que les fichiers eux-mêmes sont OK**

```bash
npx tsc --noEmit 2>&1 | grep "lib/validations" | head -5
```

Expected: 0 erreur dans les 3 fichiers renommés (les erreurs restantes sont dans les consumers).

- [ ] **Step 4: Commit**

```bash
git add lib/validations/
git commit -m "refactor(validations): rename Zod schemas Besoin* → Demande/FichePreFormation*"
```

---

## Task 3: Rename API directories — Demandes (commercial)

**Files:**
- Move: `app/api/besoins/` → `app/api/demandes/`

- [ ] **Step 1: Bouger le dossier**

```bash
git mv app/api/besoins app/api/demandes
```

- [ ] **Step 2: Dans `app/api/demandes/route.ts` et `app/api/demandes/[id]/route.ts`** :

Remplacer toutes les occurrences de :
- `prisma.besoinFormation` → `prisma.demande`
- `BesoinFormation` (import type) → `Demande`
- Import `besoinFormationSchema` → `demandeSchema` depuis `@/lib/validations/demande`
- Toute string `"besoin"` dans des labels/logs → `"demande"`

```bash
grep -n "besoin\|Besoin" app/api/demandes/route.ts app/api/demandes/[id]/route.ts
```

Vérifier que toutes les occurrences sont gérées.

- [ ] **Step 3: tsc sur le dossier**

```bash
npx tsc --noEmit 2>&1 | grep "app/api/demandes" | head -5
```

Expected: 0 erreur dans ces fichiers.

- [ ] **Step 4: Commit**

```bash
git add app/api/demandes/
git commit -m "refactor(api): /api/besoins → /api/demandes"
```

---

## Task 4: Rename API directories — Fiches pré-formation entreprise

**Files:**
- Move: `app/api/besoin-client/` → `app/api/qualiopi/fiches-entreprise/`

- [ ] **Step 1: Bouger le dossier**

```bash
mkdir -p app/api/qualiopi
git mv app/api/besoin-client app/api/qualiopi/fiches-entreprise
```

- [ ] **Step 2: Dans `app/api/qualiopi/fiches-entreprise/route.ts`, `[id]/route.ts`, `[id]/generate-devis/route.ts`, `public/[token]/route.ts`** :

Remplacer :
- `prisma.besoinClient` → `prisma.fichePreFormationEntreprise`
- `BesoinClient` → `FichePreFormationEntreprise`
- Import `besoinClientSchema` → `fichePreFormationEntrepriseSchema` depuis `@/lib/validations/fiche-pre-formation-entreprise`
- URL strings : `"/api/besoin-client"` → `"/api/qualiopi/fiches-entreprise"` si présent dans des appels internes
- Toutes les références `besoin` dans les variables locales / commentaires liés à ce contexte

```bash
grep -rn "besoin\|Besoin" app/api/qualiopi/fiches-entreprise/
```

Itérer jusqu'à 0 occurrence indésirable.

- [ ] **Step 3: Vérifier que le wire `decryptNSS` est conservé dans `public/[token]/route.ts`**

```bash
grep -n "decryptNSS\|encryptNSS\|numeroSecuriteSociale" app/api/qualiopi/fiches-entreprise/public/\[token\]/route.ts
```

Expected: les imports + appels `decryptNSS`/`encryptNSS` sont préservés.

- [ ] **Step 4: tsc + commit**

```bash
npx tsc --noEmit 2>&1 | grep "app/api/qualiopi/fiches-entreprise" | head -5
git add app/api/qualiopi/fiches-entreprise/
git commit -m "refactor(api): /api/besoin-client → /api/qualiopi/fiches-entreprise"
```

---

## Task 5: Rename API directories — Fiches pré-formation stagiaire

**Files:**
- Move: `app/api/besoin-stagiaire/` → `app/api/qualiopi/fiches-stagiaire/`

Suivre exactement la même procédure que Task 4 avec `besoinStagiaire` → `fichePreFormationStagiaire`, `BesoinStagiaire` → `FichePreFormationStagiaire`, schéma `besoinStagiaireReponseSchema` → `fichePreFormationStagiaireReponseSchema`.

- [ ] **Step 1: Bouger le dossier**

```bash
git mv app/api/besoin-stagiaire app/api/qualiopi/fiches-stagiaire
```

- [ ] **Step 2: Update internal references** (idem Task 4)

```bash
grep -rn "besoin\|Besoin" app/api/qualiopi/fiches-stagiaire/
```

- [ ] **Step 3: Vérifier le wire `encryptNSS` toujours présent (STORY-TD-001)**

```bash
grep -n "encryptNSS\|decryptNSS\|numeroSecuriteSociale" app/api/qualiopi/fiches-stagiaire/public/\[token\]/route.ts
```

Expected: imports + appels préservés. **Ce point est critique** — c'est le sync du chiffrement NSS livré dans la PR #95.

- [ ] **Step 4: tsc + commit**

```bash
npx tsc --noEmit 2>&1 | grep "app/api/qualiopi/fiches-stagiaire" | head -5
git add app/api/qualiopi/fiches-stagiaire/
git commit -m "refactor(api): /api/besoin-stagiaire → /api/qualiopi/fiches-stagiaire"
```

---

## Task 6: Rename pages admin — Demandes

**Files:**
- Move: `app/besoins/` → `app/demandes/`

- [ ] **Step 1: Bouger le dossier**

```bash
git mv app/besoins app/demandes
```

- [ ] **Step 2: Dans tous les fichiers du dossier** (`page.tsx`, `nouveau/page.tsx`, `[id]/page.tsx`, `[id]/modifier/page.tsx`) :

Remplacer :
- URLs : `/besoins` → `/demandes` (Link href, router.push, fetch)
- URLs API : `/api/besoins` → `/api/demandes`
- Types TypeScript : `BesoinFormation` → `Demande`
- Variables locales : `besoin` → `demande` (avec discernement — ne pas casser les labels UI ambiguës)
- UI strings : "Besoin" / "besoin" → "Demande" / "demande" dans les labels visibles

```bash
grep -rn "besoin\|Besoin\|/besoins\|/api/besoins" app/demandes/
```

Itérer jusqu'à propre.

- [ ] **Step 3: tsc + commit**

```bash
npx tsc --noEmit 2>&1 | grep "app/demandes" | head -5
git add app/demandes/
git commit -m "refactor(pages): /besoins → /demandes (pages admin)"
```

---

## Task 7: Rename pages admin — Fiches pré-formation

**Files:**
- Move: `app/fiches-besoin/` → `app/qualiopi/fiches-pre-formation/`

- [ ] **Step 1: Bouger le dossier**

```bash
mkdir -p app/qualiopi
git mv app/fiches-besoin app/qualiopi/fiches-pre-formation
```

- [ ] **Step 2: Update internal references** dans `app/qualiopi/fiches-pre-formation/page.tsx` :

Remplacer :
- URLs : `/fiches-besoin` → `/qualiopi/fiches-pre-formation`
- URLs publiques (générées par window.location.origin + ...) : `/fiche-besoin-client/${token}` → `/qualiopi/fiche-entreprise/${token}` et `/fiche-besoin-stagiaire/${token}` → `/qualiopi/fiche-stagiaire/${token}`
- API URLs : `/api/besoin-client` → `/api/qualiopi/fiches-entreprise`, idem stagiaire
- Types : `FicheClient` / `FicheStagiaire` (interfaces locales) — peuvent être conservés si nom de variable, OU renommés en `FichePreFormationEntreprise` pour cohérence
- UI strings labels : "Fiche besoin" → "Fiche pré-formation", "Fiches besoin Qualiopi" → "Fiches pré-formation"

```bash
grep -rn "besoin\|Besoin\|/fiches-besoin\|/fiche-besoin\|/api/besoin" app/qualiopi/fiches-pre-formation/
```

- [ ] **Step 3: tsc + commit**

```bash
npx tsc --noEmit 2>&1 | grep "app/qualiopi/fiches-pre-formation" | head -5
git add app/qualiopi/fiches-pre-formation/
git commit -m "refactor(pages): /fiches-besoin → /qualiopi/fiches-pre-formation"
```

---

## Task 8: Rename pages publiques — Fiches entreprise + stagiaire (tokens)

**Files:**
- Move: `app/fiche-besoin-client/[token]/page.tsx` → `app/qualiopi/fiche-entreprise/[token]/page.tsx`
- Move: `app/fiche-besoin-stagiaire/[token]/page.tsx` → `app/qualiopi/fiche-stagiaire/[token]/page.tsx`

- [ ] **Step 1: Bouger les 2 dossiers**

```bash
git mv app/fiche-besoin-client app/qualiopi/fiche-entreprise
git mv app/fiche-besoin-stagiaire app/qualiopi/fiche-stagiaire
```

- [ ] **Step 2: Update internal references** dans chacune des 2 pages :

Remplacer :
- API URLs : `/api/besoin-client/public/${token}` → `/api/qualiopi/fiches-entreprise/public/${token}` (idem stagiaire)
- Types `BesoinClient` / `BesoinStagiaire` (interfaces locales) → renommer pour cohérence
- UI strings : "fiche besoin" → "fiche pré-formation"

```bash
grep -rn "besoin\|Besoin\|/api/besoin" app/qualiopi/fiche-entreprise/ app/qualiopi/fiche-stagiaire/
```

- [ ] **Step 3: tsc + commit**

```bash
npx tsc --noEmit 2>&1 | grep "app/qualiopi/fiche-" | head -5
git add app/qualiopi/fiche-entreprise/ app/qualiopi/fiche-stagiaire/
git commit -m "refactor(pages): /fiche-besoin-{client,stagiaire} → /qualiopi/fiche-{entreprise,stagiaire}"
```

---

## Task 9: Backward compat — Redirects 301 pour les anciennes URLs publiques

**Files:**
- Create: `app/fiche-besoin-client/[token]/page.tsx` (server component qui redirect)
- Create: `app/fiche-besoin-stagiaire/[token]/page.tsx` (idem)
- Create: `app/api/besoin-client/public/[token]/route.ts` (route handler qui redirect)
- Create: `app/api/besoin-stagiaire/public/[token]/route.ts` (idem)

Pourquoi ces 4 fichiers : les emails déjà envoyés contiennent les anciennes URLs publiques. On les garde fonctionnelles via redirect 301 jusqu'au 2026-11-16.

- [ ] **Step 1: Créer le redirect page pour /fiche-besoin-client/[token]**

```bash
mkdir -p app/fiche-besoin-client/\[token\]
```

Créer `app/fiche-besoin-client/[token]/page.tsx` :

```tsx
// Redirect 301 (permanent) vers la nouvelle URL — backward compat pour
// les emails déjà envoyés avec l'ancien lien. Suppression prévue le 2026-11-16
// (cf. docs/superpowers/specs/2026-05-16-refactor-besoin-design.md).
import { permanentRedirect } from "next/navigation";

export default function LegacyFicheBesoinClientPage({
  params,
}: {
  params: { token: string };
}) {
  permanentRedirect(`/qualiopi/fiche-entreprise/${params.token}`);
}
```

- [ ] **Step 2: Créer le redirect page pour /fiche-besoin-stagiaire/[token]**

Idem avec target `/qualiopi/fiche-stagiaire/${params.token}`.

- [ ] **Step 3: Créer le redirect API handler pour /api/besoin-client/public/[token]**

```bash
mkdir -p app/api/besoin-client/public/\[token\]
```

Créer `app/api/besoin-client/public/[token]/route.ts` :

```ts
// Redirect 301 vers la nouvelle URL API — backward compat (cf. STORY refactor-besoin).
// À supprimer le 2026-11-16.
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  return NextResponse.redirect(
    new URL(`/api/qualiopi/fiches-entreprise/public/${params.token}`, _req.url),
    { status: 301 },
  );
}

export function POST(req: NextRequest, { params }: { params: { token: string } }) {
  // Pour POST on ne peut pas vraiment redirect (le body est perdu). On forward.
  // Mais en pratique le POST est fait par le formulaire de la page publique, qui
  // appellera désormais la nouvelle URL. Donc ce POST ne devrait plus être appelé.
  // On retourne un 410 Gone avec un message clair pour debug.
  return NextResponse.json(
    {
      error: "Cette URL d'API est dépréciée. Le formulaire doit appeler /api/qualiopi/fiches-entreprise/public/" + params.token,
      legacyUrl: req.url,
      newUrl: `/api/qualiopi/fiches-entreprise/public/${params.token}`,
    },
    { status: 410 },
  );
}
```

- [ ] **Step 4: Créer le redirect API handler pour /api/besoin-stagiaire/public/[token]**

Idem avec target `/api/qualiopi/fiches-stagiaire/public/${params.token}`.

- [ ] **Step 5: Mettre à jour middleware.ts — garder ces routes publiques**

Dans `middleware.ts > isPublicPath()`, garder les anciens patterns :

```ts
if (pathname.startsWith("/api/besoin-client/public")) return true;
if (pathname.startsWith("/api/besoin-stagiaire/public")) return true;
if (pathname.startsWith("/fiche-besoin-client/")) return true;
if (pathname.startsWith("/fiche-besoin-stagiaire/")) return true;
// Nouvelles routes Qualiopi publiques :
if (pathname.startsWith("/api/qualiopi/fiches-entreprise/public")) return true;
if (pathname.startsWith("/api/qualiopi/fiches-stagiaire/public")) return true;
if (pathname.startsWith("/qualiopi/fiche-entreprise/")) return true;
if (pathname.startsWith("/qualiopi/fiche-stagiaire/")) return true;
```

- [ ] **Step 6: tsc + commit**

```bash
npx tsc --noEmit 2>&1 | grep "app/fiche-besoin\|app/api/besoin" | head -5
git add app/fiche-besoin-client/ app/fiche-besoin-stagiaire/ app/api/besoin-client/ app/api/besoin-stagiaire/ middleware.ts
git commit -m "refactor(compat): redirects 301 sur les anciennes URLs publiques (deprecation 2026-11-16)"
```

---

## Task 10: Update middleware.ts — admin paths + API prefixes

**Files:**
- Modify: `middleware.ts`

- [ ] **Step 1: Mettre à jour `adminPages`**

Dans `middleware.ts`, dans la liste `adminPages` :
- Remplacer `"/besoins"` par `"/demandes"`
- Remplacer `"/fiches-besoin"` par `"/qualiopi/fiches-pre-formation"`

- [ ] **Step 2: Mettre à jour `adminApiPrefixes`**

- Remplacer `"/api/besoins"` par `"/api/demandes"`
- Remplacer `"/api/besoin-client"` par `"/api/qualiopi/fiches-entreprise"`
- Remplacer `"/api/besoin-stagiaire"` par `"/api/qualiopi/fiches-stagiaire"`

Garder également les anciens prefixes API pour les redirects fonctionnent (déjà fait en Task 9 step 5).

- [ ] **Step 3: Vérifier la cohérence**

```bash
grep -n "besoin\|/api/besoin\|/fiches-besoin\|/fiche-besoin" middleware.ts
```

Doit montrer uniquement les patterns dans `isPublicPath()` (backward compat) + les nouveaux paths. Pas dans `adminPages` ni `adminApiPrefixes`.

- [ ] **Step 4: tsc + commit**

```bash
npx tsc --noEmit 2>&1 | grep middleware | head -5
git add middleware.ts
git commit -m "refactor(middleware): adminPages + adminApiPrefixes pointent sur nouvelles URLs"
```

---

## Task 11: Update Sidebar (composants nav)

**Files:**
- Modify: `components/layout/Sidebar.tsx`

- [ ] **Step 1: Mettre à jour les `href` Besoin*** dans la sidebar

Dans `components/layout/Sidebar.tsx` :
- `{ href: "/besoins", label: "Besoins & demandes", icon: ClipboardList }` → `{ href: "/demandes", label: "Demandes", icon: ClipboardList }`
- `{ href: "/fiches-besoin", label: "Fiches Qualiopi", icon: BadgeCheck }` → `{ href: "/qualiopi/fiches-pre-formation", label: "Fiches pré-formation", icon: BadgeCheck }`

- [ ] **Step 2: Vérifier**

```bash
grep -n "besoin\|/fiches-besoin\|/fiche-besoin" components/layout/Sidebar.tsx
```

Expected: 0 occurrence.

- [ ] **Step 3: tsc + commit**

```bash
npx tsc --noEmit 2>&1 | grep Sidebar | head -3
git add components/layout/Sidebar.tsx
git commit -m "refactor(nav): sidebar pointe sur /demandes et /qualiopi/fiches-pre-formation"
```

---

## Task 12: Update internal callers — Link hrefs + fetch URLs partout

**Files:** (tous les fichiers identifiés par grep)
- Modify: `app/projets/[id]/page.tsx`
- Modify: `app/contacts/[id]/page.tsx`
- Modify: `app/commercial/devis/nouveau/page.tsx`
- Modify: `app/dashboard/page.tsx`
- Modify: `app/sessions/[id]/page.tsx`
- Modify: `app/sessions/[id]/types.ts`
- Modify: `app/sessions/[id]/FichesBesoinSection.tsx` (+ renommer en `FichesPreFormationSection.tsx` pour cohérence)
- Modify: `app/api/search/route.ts`
- Modify: `app/api/dashboard/tasks/route.ts`
- Modify: `app/api/dashboard/stats/route.ts`
- Modify: `app/api/sessions/[id]/envoyer-fiches-besoin/route.ts` (+ renommer en `envoyer-fiches-pre-formation`)
- Modify: `app/api/ai/chat/route.ts`
- Modify: `app/api/pdf/analyse-besoins/[besoinId]/route.ts` (renommer en `analyse-demandes/[demandeId]` ?)
- Modify: `prisma/seed.ts`
- Modify: `lib/email.ts`
- Modify: `components/layout/AppShell.tsx`
- Modify: `components/shared/CommandPalette.tsx`
- Modify: `components/dashboard/MaJournee.tsx`

- [ ] **Step 1: Lister tous les fichiers à mettre à jour**

```bash
grep -rEl "BesoinFormation|BesoinClient|BesoinStagiaire|besoinFormation|besoinClient|besoinStagiaire|/besoins?|/fiches?-besoin|/api/besoin" --include="*.ts" --include="*.tsx" -- . 2>/dev/null | grep -v node_modules | grep -v ".next" | grep -v "app/fiche-besoin\|app/api/besoin-client/public\|app/api/besoin-stagiaire/public" > /tmp/besoin-callers.txt
wc -l /tmp/besoin-callers.txt
cat /tmp/besoin-callers.txt
```

Expected : ~15-20 fichiers à modifier (les routes déjà renommées sont exclues, les redirects sont exclus aussi).

- [ ] **Step 2: Pour CHAQUE fichier** dans la liste, appliquer les remplacements :

| Pattern | Remplacement |
|---------|--------------|
| `prisma.besoinFormation` | `prisma.demande` |
| `prisma.besoinClient` | `prisma.fichePreFormationEntreprise` |
| `prisma.besoinStagiaire` | `prisma.fichePreFormationStagiaire` |
| `BesoinFormation` (type/import) | `Demande` |
| `BesoinClient` | `FichePreFormationEntreprise` |
| `BesoinStagiaire` | `FichePreFormationStagiaire` |
| `besoinFormationSchema` | `demandeSchema` |
| `besoinClientSchema` | `fichePreFormationEntrepriseSchema` |
| `besoinStagiaireSchema` | `fichePreFormationStagiaireSchema` |
| `besoinStagiaireReponseSchema` | `fichePreFormationStagiaireReponseSchema` |
| `"/api/besoins"` | `"/api/demandes"` |
| `"/api/besoin-client"` | `"/api/qualiopi/fiches-entreprise"` |
| `"/api/besoin-stagiaire"` | `"/api/qualiopi/fiches-stagiaire"` |
| `"/besoins"` (href) | `"/demandes"` |
| `"/fiches-besoin"` (href) | `"/qualiopi/fiches-pre-formation"` |
| `"/fiche-besoin-client/"` (href ou string concat) | `"/qualiopi/fiche-entreprise/"` |
| `"/fiche-besoin-stagiaire/"` (href ou string concat) | `"/qualiopi/fiche-stagiaire/"` |
| Imports `@/lib/validations/besoin-formation` | `@/lib/validations/demande` |
| Imports `@/lib/validations/besoin-client` | `@/lib/validations/fiche-pre-formation-entreprise` |
| Imports `@/lib/validations/besoin-stagiaire` | `@/lib/validations/fiche-pre-formation-stagiaire` |

**ATTENTION** : ne pas remplacer dans les fichiers de backward compat (`app/fiche-besoin-*/[token]/page.tsx` et `app/api/besoin-*/public/[token]/route.ts`) — ces fichiers DOIVENT garder les anciens noms dans leur path.

- [ ] **Step 3: Renommer FichesBesoinSection → FichesPreFormationSection**

```bash
git mv app/sessions/\[id\]/FichesBesoinSection.tsx app/sessions/\[id\]/FichesPreFormationSection.tsx
```

Mettre à jour l'export dans `FichesPreFormationSection.tsx` (renommer la fonction component) + le import dans `app/sessions/[id]/page.tsx`.

- [ ] **Step 4: Renommer `app/api/sessions/[id]/envoyer-fiches-besoin/` → `envoyer-fiches-pre-formation/`**

```bash
git mv app/api/sessions/\[id\]/envoyer-fiches-besoin app/api/sessions/\[id\]/envoyer-fiches-pre-formation
```

Mettre à jour les imports + références (typiquement appelé depuis le composant Session).

- [ ] **Step 5: Décider sort de `app/api/pdf/analyse-besoins/[besoinId]/route.ts`**

Si cette route génère un PDF d'analyse à partir d'un `BesoinFormation` (= maintenant `Demande`) → renommer :
```bash
git mv app/api/pdf/analyse-besoins app/api/pdf/analyse-demandes
```
Puis renommer le paramètre `besoinId` → `demandeId` dans le path et le code.

Sinon (si c'est sémantiquement autre chose) → laisser tel quel et juste mettre à jour les usages internes.

- [ ] **Step 6: tsc — doit être propre maintenant**

```bash
npx tsc --noEmit 2>&1 | tail -10
```

Expected: 0 erreur. Si erreurs restantes → corriger fichier par fichier.

- [ ] **Step 7: Tests**

```bash
npm test 2>&1 | tail -5
```

Expected: 71 tests passent.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor(callers): update all internal Link hrefs + fetch URLs + imports

Mass refactor following the model + route renames. Affects ~15-20 files
across app/, components/, lib/. Includes:
- Renames FichesBesoinSection → FichesPreFormationSection
- Renames /api/sessions/[id]/envoyer-fiches-besoin → envoyer-fiches-pre-formation
- Updates all imports and string references

Tests: 71/71. Typecheck: 0 error.
"
```

---

## Task 13: Update email templates (templates en DB ET en code)

**Files:**
- Modify: `lib/email.ts` (si des templates inline contiennent les anciennes URLs)
- Vérif: `lib/message-templates.ts` (si templates stockés en DB référencent URLs)
- DB: vérifier `MessageTemplate` rows en prod pour anciens patterns d'URL

- [ ] **Step 1: Grep dans le code des emails**

```bash
grep -rn "/fiche-besoin\|fiche-besoin-" lib/email.ts lib/message-templates.ts emails/ 2>/dev/null
```

Pour chaque match, remplacer par les nouvelles URLs (`/qualiopi/fiche-entreprise/` ou `/qualiopi/fiche-stagiaire/`).

- [ ] **Step 2: Vérifier les templates en DB**

```bash
npx ts-node --compiler-options '{"module":"CommonJS"}' -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
(async () => {
  const tpls = await prisma.messageTemplate.findMany({
    where: { OR: [
      { body: { contains: 'fiche-besoin' } },
      { body: { contains: '/besoins' } },
      { html: { contains: 'fiche-besoin' } },
      { html: { contains: '/besoins' } },
    ]},
    select: { id: true, name: true, type: true },
  }).catch(() => []);
  console.log('Templates with old URLs:', tpls);
  await prisma.\$disconnect();
})();
"
```

Si la requête retourne des templates → noter leurs IDs, les mettre à jour manuellement via l'admin OU via un script de migration.

Si retourne `[]` → aucune action requise.

- [ ] **Step 3: Commit (si modifs)**

```bash
git add lib/email.ts lib/message-templates.ts emails/ 2>/dev/null
git commit -m "refactor(emails): update URLs in email templates" || echo "No changes"
```

---

## Task 14: Update documentation

**Files:**
- Modify: `docs/architecture-rfc-formations-2026-05-16.md`
- Modify: `docs/prd-rfc-formations-2026-05-16.md`
- Modify: `docs/rgpd/registre-traitements.md`
- Modify: `docs/operations/README.md` (TODO suppression redirects 2026-11-16)

- [ ] **Step 1: Mettre à jour architecture**

```bash
grep -n "BesoinClient\|BesoinStagiaire\|BesoinFormation\|/besoins\|/fiches-besoin\|/fiche-besoin\|/api/besoin" docs/architecture-rfc-formations-2026-05-16.md
```

Remplacer toutes les occurrences en gardant des mentions parenthétisées de l'ancien nom pour faciliter la lecture pendant la transition. Ex :
> "**FichePreFormationEntreprise** (anciennement `BesoinClient`) : fiche Qualiopi envoyée à l'entreprise après signature du devis."

- [ ] **Step 2: Mettre à jour PRD**

```bash
grep -n "BesoinClient\|BesoinStagiaire\|BesoinFormation\|FR-004\|FR-017" docs/prd-rfc-formations-2026-05-16.md
```

FR-004 "Pipeline de besoins formations" → renommer en "Pipeline des demandes de formation".
FR-017 et FR-032 si elles mentionnent les anciens noms.

- [ ] **Step 3: Mettre à jour le registre RGPD**

```bash
grep -n "BesoinClient\|BesoinStagiaire\|BesoinFormation" docs/rgpd/registre-traitements.md
```

Remplacer les références aux modèles tout en gardant des mentions parenthétisées de l'ancien nom.

- [ ] **Step 4: Ajouter une TODO datée dans operations/README.md pour la suppression des redirects**

Ajouter une section "TODOs datées" en bas de `docs/operations/README.md` :

```markdown
## TODOs datées

| Échéance | Action |
|----------|--------|
| **2026-11-16** | Supprimer les redirects 301 vers les anciennes routes publiques `/fiche-besoin-{client,stagiaire}/[token]` et `/api/besoin-{client,stagiaire}/public/[token]` (cf. [docs/superpowers/specs/2026-05-16-refactor-besoin-design.md](../superpowers/specs/2026-05-16-refactor-besoin-design.md)). 6 mois après le déploiement du refactor besoin → tous les emails envoyés avant 2026-05-16 ont normalement déjà été ouverts. |
```

- [ ] **Step 5: Commit docs**

```bash
git add docs/
git commit -m "docs: update references after Besoin* refactor + TODO suppression redirects 2026-11-16"
```

---

## Task 15: Final verification

- [ ] **Step 1: Aucune référence Besoin* hors backward compat**

```bash
grep -rEn "BesoinFormation|BesoinClient|BesoinStagiaire|besoinFormation|besoinClient|besoinStagiaire" --include="*.ts" --include="*.tsx" --include="*.prisma" -- . 2>/dev/null | grep -v node_modules | grep -v ".next" | grep -v "@@map" | grep -v "anciennement\|legacy\|backward compat\|deprecation\|app/fiche-besoin\|app/api/besoin-client/public\|app/api/besoin-stagiaire/public"
```

Expected: 0 résultat (ou uniquement des commentaires explicatifs).

- [ ] **Step 2: Aucune URL Besoin* hors backward compat**

```bash
grep -rEn '/besoins?|/fiches?-besoin|/api/besoin' --include="*.ts" --include="*.tsx" -- . 2>/dev/null | grep -v node_modules | grep -v ".next" | grep -v "anciennement\|legacy\|backward compat\|deprecation\|app/fiche-besoin\|app/api/besoin-client/public\|app/api/besoin-stagiaire/public"
```

Expected: 0 résultat.

- [ ] **Step 3: Prisma diff sain**

```bash
npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datasource prisma/schema.prisma --exit-code
```

Expected: exit 0 (aucune migration SQL générée).

- [ ] **Step 4: Tests + typecheck**

```bash
npm test 2>&1 | tail -5
npx tsc --noEmit 2>&1 | tail -3
```

Expected: 71 tests pass, 0 erreur tsc.

- [ ] **Step 5: Smoke test plan en local (manuel)**

Démarrer `npm run dev`. Vérifier :
- [ ] `/demandes` charge (pipeline kanban des demandes)
- [ ] `/qualiopi/fiches-pre-formation` charge (tracking des fiches)
- [ ] Cliquer sur "Devis" depuis une fiche entreprise répondue → génère et redirige (item 1 PR #98 toujours fonctionnel)
- [ ] Ouvrir `/fiche-besoin-client/<token-test>` → redirect 301 vers `/qualiopi/fiche-entreprise/<token-test>` (cf. logs réseau navigateur)
- [ ] Soumettre une fiche entreprise puis stagiaire → vérifier que les statuts passent à "repondu"
- [ ] Vérifier qu'un NSS saisi sur fiche stagiaire est chiffré en base (`enc::v1::` prefix)

- [ ] **Step 6: Listing des commits du refactor**

```bash
git log --oneline main..HEAD
```

Devrait montrer ~14 commits ordonnés selon les tasks.

---

## Task 16: PR + merge

- [ ] **Step 1: Push branche**

```bash
git push -u origin refactor/besoin-naming
```

- [ ] **Step 2: Créer PR avec body détaillé**

```bash
gh pr create --title "refactor(besoin): rename Besoin* → Demande + FichePreFormation* (clarification métier)" --body "$(cat <<'EOF'
## Résumé

Refactor de clarification métier issu d'une session brainstorming (cf. [spec](docs/superpowers/specs/2026-05-16-refactor-besoin-design.md)).

Le mot "Besoin" était utilisé dans 5 endroits pour 3 concepts métier différents (lead commercial + 2 fiches Qualiopi post-signature). Cette PR sépare clairement les 2 phases.

## Changements

- **Prisma** : 3 models renommés avec `@@map` → **0 migration SQL**
  - BesoinFormation → Demande
  - BesoinClient → FichePreFormationEntreprise
  - BesoinStagiaire → FichePreFormationStagiaire
- **Routes admin** : /besoins → /demandes, /fiches-besoin → /qualiopi/fiches-pre-formation
- **Routes publiques** : /fiche-besoin-{client,stagiaire}/[token] → /qualiopi/fiche-{entreprise,stagiaire}/[token]
- **API** : /api/besoins → /api/demandes, /api/besoin-{client,stagiaire} → /api/qualiopi/fiches-{entreprise,stagiaire}
- **Backward compat** : redirect 301 sur les anciennes URLs publiques jusqu'au 2026-11-16 pour ne pas casser les emails déjà envoyés
- **Validations Zod** : 3 fichiers renommés
- **Sidebar + middleware + docs** : mis à jour
- **Templates email** : audit + update si nécessaire

## Vérifications

- [x] `npm test` → 71/71
- [x] `npx tsc --noEmit` → 0 erreur
- [x] `prisma migrate diff` → exit 0 (aucune migration SQL)
- [x] Aucune référence hors backward compat aux anciens noms (grep)
- [ ] Smoke test prod : créer une demande, envoyer une fiche entreprise, soumettre, vérifier statut "repondu"
- [ ] Tester ancien lien tokenisé en prod (depuis un email envoyé avant 2026-05-16) → doit rediriger vers nouvelle URL

## Risques

- **Tokens publics** : les liens dans les emails déjà envoyés continuent de fonctionner grâce aux redirects 301. À tester explicitement post-merge avec un vrai token.
- **Cache navigateur** : les utilisateurs avec une session active n'auront pas de souci (CSRF NextAuth réémis), mais si quelqu'un avait l'ancien URL en bookmark, le bookmark sera mis à jour automatiquement après le 301.

## TODO post-merge

- 2026-11-16 : supprimer les redirects 301 (cf. `docs/operations/README.md` section TODOs datées)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Attendre CI**

Attendre que Vitest + Netlify preview soient verts.

- [ ] **Step 4: Tester sur Netlify Preview**

Ouvrir l'URL Deploy Preview retournée par Netlify, et faire le smoke test manuel (cf. Task 15 Step 5).

- [ ] **Step 5: Merger**

```bash
gh pr merge <PR_NUMBER> --squash --delete-branch
```

- [ ] **Step 6: Vérifier prod après deploy**

```bash
# Attendre fin deploy Netlify (~2-3 min)
curl -s https://projetrfc.netlify.app/api/health
# Tester un redirect (avec un token réel ou bidon)
curl -sI https://projetrfc.netlify.app/fiche-besoin-client/test-token
# Attendu : HTTP/2 301 + location: /qualiopi/fiche-entreprise/test-token
```

- [ ] **Step 7: Cleanup local**

```bash
git checkout main
git pull --ff-only
git branch -d refactor/besoin-naming 2>/dev/null || true
```

---

## Self-Review checklist

Après écriture de ce plan, vérification :

- ✅ **Spec coverage** : tous les renames de la spec sont couverts par des tasks
- ✅ **No placeholders** : pas de "TBD", "à compléter", "TODO" dans les tasks (sauf section TODOs datées dans docs qui est intentionnel)
- ✅ **Type consistency** : `Demande` / `FichePreFormationEntreprise` / `FichePreFormationStagiaire` utilisés systématiquement
- ✅ **Backward compat** : redirects 301 explicites + entrée TODO datée
- ✅ **Tests + typecheck** : checkpoints à chaque task majeure
- ✅ **Commit granularité** : 1 commit par task → revue PR facile

## Risques connus à surveiller

1. **Tâche 1 step 4 (relations Prisma)** : oubli d'un nom de relation → tsc cassé. Mitigation : `grep -n "Besoin\|besoin" prisma/schema.prisma` après modif.
2. **Task 5 step 3 (chiffrement NSS)** : si le wire `encryptNSS`/`decryptNSS` est cassé par le rename → fuite NSS en clair. Mitigation : test explicite sur le smoke test (Task 15 step 5).
3. **Task 12 step 6 (tsc final)** : risque d'erreur résiduelle si un import a été oublié. Mitigation : itérer jusqu'à 0 erreur avant commit.
