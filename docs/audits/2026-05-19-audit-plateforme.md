# Audit plateforme — 2026-05-19

Audit transverse de la plateforme RFC sur 4 axes indépendants (Routes & UX,
Sécurité & Auth, Qualité code & Dette, Schéma Prisma & API), conduit par
4 agents en parallèle puis consolidé. Read-only, aucun fichier modifié.

## TL;DR

| Axe | P0 | P1 | P2 |
| --- | --- | --- | --- |
| Routes & UX | 4 | 4 | 3 |
| Sécurité & Auth | 4 | 4 | 6 |
| Qualité code & Dette | 3 | 5 | 7 |
| Schéma Prisma & API | 5 | 5 | 3 |
| **Total** | **16** | **18** | **19** |

**Constat global** — La plateforme est globalement saine sur les fondamentaux
(NSS chiffré, force-dynamic systématique, CSP/HSTS en place, 0 secret committé,
96 % des routes wrappées, 0 console.log oublié, 0 @ts-ignore, 0 import relatif
long). Les risques se concentrent sur trois fronts :

1. **Cloisonnement multi-rôles incomplet** côté API (middleware d'auth ne
   couvre pas toutes les routes financières → fuite cross-tenant possible).
2. **Cascades Prisma trop agressives** sur des entités à valeur légale
   (Inscription, Attestation, Paiement, Facture, Session) — risque
   conformité Qualiopi / RGPD / comptable.
3. **404 actifs** dans la navigation existante (3 routes manquantes +
   `/entreprises/[id]` déjà identifié, soit 4 au total).

Un plan d'action prioritaire est proposé en fin de rapport.

---

## 1. Routes & UX

### P0 — 404 actifs visibles utilisateur

#### 1.1 `/entreprises/[id]` — déjà identifié hors audit
- **Référencé** : 11 fichiers (prospects, contacts, devis, factures,
  utilisateurs, certifications, entreprises/page.tsx, etc.)
- **Action** : page détail entreprise à créer (brainstorm en cours).

#### 1.2 `/projets/[id]` cassé dans le formulaire session
- **Emplacement** : [app/sessions/nouveau/page.tsx:188](app/sessions/nouveau/page.tsx#L188)
- **Problème** : bouton "Retour au projet" pointe vers `/projets/${projetId}`
  alors que le module Projets a été supprimé (commit `5fe601c`).
- **Impact** : tout utilisateur qui arrive sur `/sessions/nouveau?projetId=...`
  depuis un lien historique (devis, email, bookmark) → 404.
- **Action** : supprimer la branche `projetId` + nettoyer le composant
  `projetCtx` (bandeau vert juste en dessous).

#### 1.3 `/sessions/[id]/inscriptions/new` inexistante
- **Emplacement** : [app/prospects/[id]/page.tsx:783](app/prospects/[id]/page.tsx#L783)
- **Problème** : le bouton "Ajouter" de la section Inscriptions sur la fiche
  prospect pointe vers une route qui n'existe pas (`new` au lieu de `nouveau` ?).
- **Action** : soit créer `app/sessions/[id]/inscriptions/new/page.tsx`,
  soit ouvrir une Dialog inline (cohérent avec `sessions/[id]`).

#### 1.4 `/espace-client/roi` exposée dans la sidebar
- **Emplacement** : [components/layout/Sidebar.tsx:165](components/layout/Sidebar.tsx#L165)
- **Problème** : item "ROI formation" → `/espace-client/roi` qui n'existe pas.
- **Impact** : visible en permanence pour tous les clients.
- **Action** : créer un placeholder OU retirer l'entrée de la sidebar tant
  que la feature n'est pas livrée.

#### 1.5 `/parametres/automations-v2/nouveau` inexistante
- **Référencée** dans le code mais le dossier ne contient que `page.tsx` et `[id]/page.tsx`.
- **Action** : créer la page ou pointer vers une Dialog dans la liste.

### P1 — Incohérences UX

#### 1.6 Patterns d'édition divergents
- **Avec page `/[id]/modifier`** (9) : formations, contacts, formateurs,
  sessions, lieux-formation, demandes, utilisateurs, commercial/devis,
  commercial/factures.
- **Sans page d'édition dédiée** (9) : prospects, parcours, evaluations,
  evaluations/modeles, signatures, commercial/campagnes,
  formateurs/factures, parametres/automations-v2, utilisateurs.
- **Bonus confusion** : commit `315faeb` introduisait `/projets/[id]/editer`
  (3ème pattern : `editer` vs `modifier`).
- **Action** : standardiser sur `/modifier` partout. Commencer par
  prospects/parcours.

#### 1.7 Breadcrumb absent sur 16 pages détail
Pages **avec** Breadcrumb (12) : formations, contacts, formateurs,
commercial/devis, commercial/factures, sessions (+ leurs `/modifier`).

Pages **sans** Breadcrumb : prospects/[id], demandes/[id], evaluations/[id],
evaluations/modeles/[id], parcours/[id], lieux-formation/[id],
signatures/[id], commercial/campagnes/[id], utilisateurs/[id],
formateurs/factures/[id], parametres/automations-v2/[id],
espace-formateur/sessions/[id], etc.

**Action** : ajouter `<Breadcrumb>` au sommet (sauf espaces externes :
`sign/`, `espace-formateur/`).

#### 1.8 Bouton "Nouveau X" hors `PageHeader actionLabel/actionHref`
- [app/utilisateurs/page.tsx:86](app/utilisateurs/page.tsx#L86) — "Nouveau compte"
- [app/signatures/page.tsx:54](app/signatures/page.tsx#L54) — "Nouvelle demande"
- [app/evaluations/modeles/page.tsx:131](app/evaluations/modeles/page.tsx#L131) — "Nouveau"
- [app/parcours/page.tsx:131](app/parcours/page.tsx#L131) — "Nouveau parcours" via Dialog

**Action** : migrer ces 4 vers `actionLabel/actionHref` de `PageHeader`.

#### 1.9 Pages liste sans `EmptyState`
12 pages utilisent `<EmptyState>` correctement. 8 autres affichent un
"Aucun X" inline dans `<td>` : utilisateurs, signatures, notifications,
tasks, admin/notes-frais, evaluations, finance/paiements,
evaluations/modeles.

**Action** : remplacer par `<EmptyState>` avec `actionHref` cohérent.

### P2 — Polish

- **Loading state manquant** sur [app/finance/paiements/page.tsx:72-90](app/finance/paiements/page.tsx#L72-L90) :
  4 appels `useApi` mais `isLoading` jamais consommé → tableau vide affiché
  pendant le fetch ("Aucun paiement" à tort).
- **Sidebar hrefs paramétrés** (`/commercial?tab=devis`, etc.) : vérifier
  que `isLinkActive` ([components/layout/Sidebar.tsx:207](components/layout/Sidebar.tsx#L207))
  gère le state actif sinon l'item n'est jamais surligné.

---

## 2. Sécurité & Auth

### P0 — Critique

#### 2.1 Routes financières/sensibles hors `adminApiPrefixes`
- **Emplacement** : [middleware.ts:37-80](middleware.ts#L37-L80) + plusieurs
  handlers API.
- **Problème** : le middleware applique la whitelist `adminApiPrefixes` puis
  `return NextResponse.next()` (ligne 203) pour toute autre route
  authentifiée. Plusieurs routes critiques tombent dans ce fallback sans
  scoping par tenant :
  - [app/api/paiements/route.ts](app/api/paiements/route.ts)
  - [app/api/transactions-bancaires/route.ts](app/api/transactions-bancaires/route.ts)
  - [app/api/echeanciers/route.ts](app/api/echeanciers/route.ts)
  - [app/api/historique/route.ts](app/api/historique/route.ts) (accepte
    `entrepriseId`/`contactId` en query → énumération cross-tenant)
  - [app/api/signatures/route.ts](app/api/signatures/route.ts)
  - [app/api/notes-frais/[id]/route.ts](app/api/notes-frais/[id]/route.ts)
- **Impact** : un compte `client` ou `formateur` peut lire/écrire des
  données financières d'autres entreprises. Violation cloisonnement
  multi-rôles + BPF/Qualiopi.
- **Action** : ajouter ces préfixes à `adminApiPrefixes` (ou faire un check
  inline avec scoping par `entrepriseId`/`formateurId`). Audit complet de
  la whitelist recommandé.

#### 2.2 `/api/forum` POST — usurpation d'identité
- **Emplacement** : [app/api/forum/route.ts:18-30](app/api/forum/route.ts#L18-L30)
- **Problème** : `auteurId` et `auteurNom` lus depuis le body, sans
  rapprochement avec la session.
- **Action** : récupérer ces champs depuis `getServerSession`, ignorer le body.

#### 2.3 `/api/email-tracking/webhook` sans vérification de signature
- **Emplacement** : [app/api/email-tracking/webhook/route.ts:30](app/api/email-tracking/webhook/route.ts#L30)
- **Problème** : TODO Phase 3 — endpoint public qui mute `logEmail` et insère
  des `emailTrackingEvent` sans valider `svix-signature`.
- **Impact** : pollution du tracking BPF, fausses preuves de delivery, DoS
  amplifié potentiel.
- **Action** : vérifier la signature svix avant écriture, sinon 401.

#### 2.4 `/api/utilisateurs` POST — pas de whitelist `role` ni politique mdp
- **Emplacement** : [app/api/utilisateurs/route.ts:27-55](app/api/utilisateurs/route.ts#L27-L55)
- **Problème** : `role` inséré tel quel (pas de `z.enum(["admin","formateur","client"])`).
  Reset password à 6 caractères ([app/api/utilisateurs/[id]/reset-password/route.ts:10](app/api/utilisateurs/%5Bid%5D/reset-password/route.ts#L10)).
  Aucun rate-limit, aucune politique de complexité.
- **Action** : Zod schema avec enum role + mot de passe ≥ 12 caractères
  + classes ANSSI-like + journalisation `historique`.

### P1 — Important

#### 2.5 `/api/conversations/[id]/messages` POST — pas de check participant
- **Emplacement** : [app/api/conversations/[id]/messages/route.ts:14-37](app/api/conversations/%5Bid%5D/messages/route.ts#L14-L37)
- **Action** : vérifier que `session.user.id ∈ conversationParticipant`.

#### 2.6 ~70 routes POST/PUT/PATCH sans validation Zod
- **Ratio** : 94/236 routes utilisent `parseBody`/Zod (≈40%).
- **Routes critiques sans Zod** : `/api/email/devis`, `/api/email/convocation`,
  `/api/email/facture`, `/api/badges/[id]/award`, `/api/contacts/[id]` (PATCH NSS),
  `/api/forum`, `/api/utilisateurs`, `/api/ai/chat`, `/api/factures`, …
- **Risque IDOR** : les routes email acceptent `devisId`/`sessionId`/`contactId`
  sans vérif d'appartenance.
- **Action** : schéma Zod systématique + check d'autorisation par ressource.

#### 2.7 `/api/inscription-publique/[token]` — pas de Zod, NSS sans regex
- **Emplacement** : [app/api/inscription-publique/[token]/route.ts:57-77](app/api/inscription-publique/%5Btoken%5D/route.ts#L57-L77)
- **Action** : Zod + regex NSS française (15 chiffres).

#### 2.8 Reset password politique faible (cf. 2.4)

### P2 — Hardening

- **`decryptNSS` fallback legacy silencieux** ([lib/encryption.ts:43](lib/encryption.ts#L43))
  → ajouter warning + métrique de migration.
- **CSP `script-src 'unsafe-inline' 'unsafe-eval'`** ([next.config.mjs:49](next.config.mjs#L49))
  → roadmap nonce-based.
- **Injection HTML dans emails** ([app/api/badges/[id]/award/route.ts:48-65](app/api/badges/%5Bid%5D/award/route.ts#L48-L65))
  → interpolation brute de `badge.nom`, `contact.prenom`. Echaper dans `lib/email`.
- **Tokens publics stockés en clair** (`qualiopi/fiches-stagiaire/public/[token]`,
  `inscription-publique/[token]`, `qualite/public/[token]`) →
  stocker `sha256(token)`, comparer le hash (cf. pattern `/sign/[token]` qui
  utilise déjà HMAC + tokenHash).
- **`/api/ai/chat` SSE sans timeout** → timeout 60 s côté serveur.
- **`numeroPasseportPrevention` non chiffré** (`schema.prisma`) — à évaluer.

**Points positifs notables** : middleware NextAuth centralisé, NSS AES-256-GCM
versionné, signature électronique HMAC, CSP/HSTS/Permissions-Policy en place,
rate-limit sur endpoints publics, opt-out RGPD respecté dans les campagnes,
`force-dynamic` systématique (236/236).

---

## 3. Qualité code & Dette technique

### P0 — Bug latent

#### 3.1 Dead code : dossier `prospects/nouveau/sections/`
- **Emplacement** : [app/prospects/nouveau/sections/](app/prospects/nouveau/sections/)
- **Problème** : 5 composants react-hook-form-based (`ContactSection`,
  `EntrepriseSection`, `DemandeSection`, `BesoinsParticulierssSection`
  — typo double `s` —, `NotesSection`) jamais importés. Le `page.tsx`
  voisin utilise des inputs contrôlés sans RHF.
- **Action** : `rm -rf app/prospects/nouveau/sections/`.

#### 3.2 `useEffect` mass-fetch fragile dans session détail
- **Emplacement** : [app/sessions/[id]/page.tsx:164](app/sessions/%5Bid%5D/page.tsx#L164)
- **Problème** : 5 fetchs déclenchés ensemble, deps = 5 callbacks
  `useCallback([id])`. Ajouter un fetcher sans `useCallback` re-déclenchera
  toutes les fetchs à chaque render.
- **Action** : migrer vers SWR (déjà utilisé 107× ailleurs).

#### 3.3 Cast douteux `as unknown as NextRequest`
- **Emplacement** : [app/sign/[token]/page.tsx:48](app/sign/%5Btoken%5D/page.tsx#L48)
- **Problème** : `{ headers: h } as unknown as NextRequest` passé à
  `enforceRateLimit`. Si la fonction évolue et accède à `req.ip`/`req.nextUrl`,
  crash runtime non typé → faille de rate-limit.
- **Action** : refactorer `enforceRateLimit` pour accepter `{ headers: Headers }`.

### P1 — Dette significative

#### 3.4 Top fichiers à découper (>800 lignes)
| Fichier | Lignes | Rôle |
| --- | --- | --- |
| [app/sessions/[id]/page.tsx](app/sessions/%5Bid%5D/page.tsx) | 1391 | 36 useState, 5 fetchers, automations, présence, évaluations |
| [app/prospects/nouveau/page.tsx](app/prospects/nouveau/page.tsx) | 1225 | 16 useState, 5 useEffect, recherche SIRET |
| [app/prospects/[id]/page.tsx](app/prospects/%5Bid%5D/page.tsx) | 874 | Détail prospect |
| [app/contacts/[id]/page.tsx](app/contacts/%5Bid%5D/page.tsx) | 858 | 22 useState, 3 useEffect, 5 modales |
| [app/formateurs/[id]/page.tsx](app/formateurs/%5Bid%5D/page.tsx) | 856 | Détail formateur |
| [app/qualite/amelioration/page.tsx](app/qualite/amelioration/page.tsx) | 848 | |
| [app/parametres/templates-documents/page.tsx](app/parametres/templates-documents/page.tsx) | 777 | |
| [app/inscription-stagiaire/[token]/page.tsx](app/inscription-stagiaire/%5Btoken%5D/page.tsx) | 677 | |
| [components/layout/Sidebar.tsx](components/layout/Sidebar.tsx) | 664 | |

**Priorité** : `sessions/[id]` et `contacts/[id]` (concentration de state élevée).

#### 3.5 Duplication 1 — fetch+loading+error manuel alors que SWR est en place
- 4 fichiers utilisent encore `useState(true)` + `useEffect+fetch+finally` :
  `app/contacts/[id]/page.tsx:39-48`, `app/sessions/[id]/page.tsx:97-164`,
  `app/inscription-stagiaire/[token]/page.tsx:541`, `app/login/page.tsx`.
- **Action** : harmoniser sur `useApiQuery`/`useSWR`.

#### 3.6 Duplication 2 — Réponse PDF `as unknown as BodyInit`
- 12 routes `app/api/pdf/**` répètent ce pattern.
- **Action** : factoriser en `pdfResponse(buffer, filename)`.

#### 3.7 Duplication 3 — Recherche SIRET API gouv
- Code identique (debounce + fetch `recherche-entreprises.api.gouv.fr` +
  dropdown + listener `mousedown`) dans :
  - [app/prospects/nouveau/page.tsx:266-291](app/prospects/nouveau/page.tsx#L266-L291)
  - [app/inscription-stagiaire/[token]/page.tsx:541-575](app/inscription-stagiaire/%5Btoken%5D/page.tsx#L541-L575)
- Un composant `EntrepriseAutocomplete` existe déjà — l'extraire pour les deux.

#### 3.8 Composants candidats à `useReducer`
- `sessions/[id]/page.tsx` : 36 useState (groupes `{addOpen, adding, addError, ...}`).
- `contacts/[id]/page.tsx` : 22 useState (sous-état "convertir client" : 10 vars).
- `prospects/nouveau/page.tsx` : 16 useState.

### P2 — Hygiène (état du code généralement très propre)

| Métrique | Valeur |
| --- | --- |
| `console.log` dans `app/`+`components/` | **0** |
| `@ts-ignore`/`@ts-expect-error` | **0** |
| `Function`/`Object` typage | **0** |
| Imports relatifs longs (`../../../`) | **0** |
| Fichiers `*-old`/`*-backup`/`.bak` | **0** |
| `: any` explicite | 42 (à réduire ; concentré dans `app/api/bpf/route.ts`, `lib/pdf/devis.ts`) |
| `as unknown as` | 16 (12 légitimes PDF, 1 douteux P0, 3 helpers) |
| TODO/FIXME/HACK | 9 dont 2 vrais TODO (1 sécurité = 2.3) |

---

## 4. Schéma Prisma & API

### P0 — Risque conformité / fuite données

#### 4.1 Cascade Contact → suppression historique Qualiopi
- **Emplacement** : `prisma/schema.prisma` lignes 292 (Inscription),
  555 (Attestation), 590 (FeuillePresence), 615 (EmargementToken),
  812 (CertificationStagiaire).
- **Problème** : tous `onDelete: Cascade` sur `contactId`. Supprimer un
  contact détruit toutes les preuves d'émargement et attestations.
- **Impact** : violation Qualiopi 7.1 (conservation des preuves 3 ans) +
  RGPD (anonymiser ≠ supprimer en cascade).
- **Action** : passer en `SetNull` + anonymiser le contact ; conserver
  feuilles/attestations.

#### 4.2 Cascade Facture → Paiement & Échéancier
- **Emplacement** : `prisma/schema.prisma:1590, 1608`
- **Problème** : si une facture est supprimée par erreur (UI), l'historique
  financier disparaît.
- **Impact** : CGI art. 286 — conservation 10 ans des pièces comptables.
- **Action** : `SetNull` + bloquer la suppression de Facture après émission
  (au niveau service, faire un avoir à la place).

#### 4.3 Cascade Formation → Sessions / Certifications
- **Emplacement** : `prisma/schema.prisma:246, 815, 1372`
- **Problème** : supprimer une formation efface tout son historique
  (sessions passées, certifications stagiaires délivrées).
- **Impact** : perte de preuves Qualiopi + certifications RNCP
  (validité 3-5 ans).
- **Action** : `SetNull` ou bloquer la suppression si sessions/certifs
  existantes.

#### 4.4 Fuite NSS dans `findMany` contacts
- **Emplacement** : [app/api/contacts/route.ts:32-38](app/api/contacts/route.ts#L32-L38)
- **Problème** : `findMany` sans `select` → renvoie `numeroSecuriteSociale`
  (chiffré) et `numeroPasseportPrevention` à chaque requête liste.
- **Action** : `select` explicite excluant les champs sensibles.

#### 4.5 N+1 inscriptions en lot
- **Emplacement** : [app/api/sessions/[id]/inscriptions/lot/route.ts:38-55](app/api/sessions/%5Bid%5D/inscriptions/lot/route.ts#L38-L55) +
  `app/api/client/inscriptions/lot/route.ts`
- **Problème** : N `findFirst` + N `create` séquentiels via `Promise.all`.
- **Action** : un seul `findMany({ where: { contactId: { in } } })` +
  `createMany({ skipDuplicates: true })`.

### P1 — Cohérence

#### 4.6 Routes sans wrapper d'erreur
9 routes sans `withErrorHandler*` dont 7 à corriger :
- `besoin-client/public/[token]`, `besoin-stagiaire/public/[token]`,
  `signature-requests/[id]/verify-audit`, 4 routes `cron/*`.

#### 4.7 Routes liste sans pagination (volumes élevés)
- `/api/entreprises`, `/api/formateurs`, `/api/forum`, `/api/automations`,
  `/api/automations-v2`, `/api/catalogue`, `/api/tags`, `/api/attestations`,
  `/api/paiements`, `/api/lieux-formation`.
- **Pire** : [app/api/sessions/route.ts:45](app/api/sessions/route.ts#L45) fait
  `findMany` complet puis paginate en mémoire.

#### 4.8 Mismatchs Zod ↔ Prisma
| Schema Zod | Champ Prisma oublié |
| --- | --- |
| `formateurSchema` | `photo` |
| `sessionSchema` | `lieuFormationId` |
| `demandeSchema` | `devisId`, `projetId` |
| `devisSchema` | `statut`, `dateSigne`, `signatureUrl` |
| `entrepriseSchema` | `effectif`, `typeEntreprise` (déjà connu) |

#### 4.9 Modèles Prisma sans schema Zod
Critiques : `Inscription`, `Facture`, `Paiement`, `LieuFormation` (POST sans
schema), `Tag`, `Notification`, `Attestation`, `Evaluation`, `Document`,
`NoteFrais`.

#### 4.10 Relations sans `onDelete` explicite
- `schema.prisma:27` — `User.formateur`
- `schema.prisma:30` — `User.entreprise`

### P2 — Optimisation

#### 4.11 Index manquants
- `Contact` : pas d'index sur `entrepriseId`, `type`, `createdAt`.
- `Facture` : pas d'index sur `statut`, `entrepriseId`, `createdAt`,
  `dateEcheance`.
- `Entreprise` : pas d'index sur `nom`/`ville` (recherche LIKE).

#### 4.12 `select` trop larges sur findMany liste
- `/api/contacts` (cf. 4.4)
- `/api/devis` renvoie `signatureUrl`, `notes`
- `/api/factures` renvoie `paiements` JSON, `notes`
- `/api/entreprises`, `/api/formateurs` renvoient `notes`, `cv`, `tarifJournalier`

### Modèles Prisma orphelins (0 usage `prisma.<model>.*`)
- `DirectMessage`, `DemandeRgpd`, `ChampPersonnalise`,
  `ValeurChampPersonnalise`, `ApiKey`, `SessionParcours`, `Paiement`
  (utilisé via include uniquement).

---

## Hot zones (où concentrer l'effort)

1. **Couche d'auth API** — `middleware.ts` + routes financières/historique.
   Single point of fix avec gros impact sécurité.
2. **Schéma Prisma — cascades** — 3 P0 conformité, un PR ciblé `prisma migrate`.
3. **Fichiers détail >800 lignes** — `sessions/[id]`, `contacts/[id]`,
   `prospects/nouveau` (à découper en sous-composants).
4. **Validation Zod** — passer de 40 % à 80 %+ de couverture POST/PUT/PATCH.
5. **Navigation cassée** — 4 routes 404 + sidebar `/espace-client/roi`.

---

## Plan d'action proposé (sprint 1)

### Bloc Sécurité (P0 — ~1 jour)
- [ ] Compléter `adminApiPrefixes` (paiements, transactions-bancaires,
  echeanciers, historique, signatures…) **(2.1)**
- [ ] Vérification signature svix sur `/api/email-tracking/webhook` **(2.3)**
- [ ] Whitelist `role` + politique mot de passe sur `/api/utilisateurs` **(2.4)**
- [ ] Fixer usurpation `/api/forum` **(2.2)**

### Bloc Conformité (P0 — ~1 jour, migration Prisma)
- [ ] Cascades Contact → `SetNull` sur Inscription/Attestation/FeuillePresence/
  EmargementToken/CertificationStagiaire **(4.1)**
- [ ] Cascades Facture → `SetNull` + lock soft-delete service **(4.2)**
- [ ] Cascades Formation → `SetNull` ou block **(4.3)**
- [ ] Select explicite sur `/api/contacts` (exclure NSS) **(4.4)**

### Bloc Navigation (P0 — ~0.5 jour)
- [ ] Créer `/entreprises/[id]` (brainstorm en cours)
- [ ] Retirer/fixer `/projets/[id]` dans `sessions/nouveau` **(1.2)**
- [ ] Fixer `/sessions/[id]/inscriptions/new` **(1.3)**
- [ ] Retirer `/espace-client/roi` de la sidebar OU placeholder **(1.4)**
- [ ] Créer `/parametres/automations-v2/nouveau` **(1.5)**

### Bloc Hygiène (P0/P1 — ~0.5 jour)
- [ ] Supprimer `app/prospects/nouveau/sections/` **(3.1)**
- [ ] Refactorer `enforceRateLimit` pour Headers **(3.3)**
- [ ] Migrer `sessions/[id]` vers SWR **(3.2)**

### Sprint 2+ (P1)
- Standardisation Breadcrumb / `/modifier` / `EmptyState` (1.6 – 1.9)
- Couverture Zod 40 % → 80 % (2.6, 4.9)
- Pagination + select sur routes liste (4.7, 4.12)
- Découpe `sessions/[id]`, `contacts/[id]`, `prospects/nouveau` (3.4)
- Index Prisma manquants (4.11)

---

## Méthodologie

Audit exécuté par 4 agents read-only en parallèle, chacun avec un scope
précis et un format de retour standardisé (P0/P1/P2 + chemin:ligne).
Synthèse consolidée par l'agent orchestrateur. Aucun fichier de
l'application modifié pendant l'audit.

- **Routes & UX** — 123 pages explorées, 4 routes 404, 8 incohérences UX.
- **Sécurité & Auth** — 236 routes API, 14 critiques scopées, 70 routes
  sans Zod.
- **Qualité & Dette** — 511 fichiers TS/TSX, top 10 dette identifié.
- **Schéma Prisma & API** — 87 modèles, 7 orphelins, 12 cascades P0/P1
  identifiées.
