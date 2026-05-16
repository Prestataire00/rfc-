# Refactor "Besoin" — clarification métier

**Date** : 2026-05-16
**Auteur** : Ismael Lepennec
**Statut** : Design approuvé, à implémenter
**Origine** : session brainstorming UX/IA — l'utilisateur a identifié que le concept "Besoin" est utilisé pour 3 choses différentes, créant une confusion métier et navigationnelle.

---

## Problème

Le mot **"Besoin"** est utilisé dans 5 endroits différents du code pour 3 concepts métier distincts :

| Code actuel | Vrai sens métier | Phase du cycle |
|------------|------------------|----------------|
| `BesoinFormation` (modèle) + `/besoins` (page) + `/api/besoins` | Lead commercial : l'entreprise dit "j'ai besoin d'une formation" | **Avant signature devis** |
| `BesoinClient` (modèle) + `/fiches-besoin` (page admin onglet) + `/fiche-besoin-client/[token]` (page publique) + `/api/besoin-client` | Fiche Qualiopi pré-formation : l'entreprise précise le contexte (effectif, secteur, objectifs) | **Après signature, avant formation** |
| `BesoinStagiaire` (modèle) + `/fiches-besoin` (page admin onglet) + `/fiche-besoin-stagiaire/[token]` (page publique) + `/api/besoin-stagiaire` | Fiche Qualiopi pré-formation : chaque stagiaire précise son profil (NSS, RQTH, prérequis) | **Après signature, avant formation** |

**Conséquences observées** :
- Confusion navigationnelle (l'admin ne sait pas où aller pour quel concept)
- Confusion lors de la lecture du code (un dev qui voit "BesoinClient" pense "lead client" alors que c'est une fiche Qualiopi)
- Onboarding plus lent pour tout nouveau dev/admin

---

## Solution retenue

Renommage clair distinguant la **phase commerciale** ("Demande") de la **phase Qualiopi** ("FichePreFormation"). Choix utilisateur parmi 3 alternatives proposées en brainstorming.

### Renames Prisma (modèles)

| Avant | Après | SQL table (inchangé via `@@map`) |
|-------|-------|----------------------------------|
| `BesoinFormation` | `Demande` | `BesoinFormation` |
| `BesoinClient` | `FichePreFormationEntreprise` | `BesoinClient` |
| `BesoinStagiaire` | `FichePreFormationStagiaire` | `BesoinStagiaire` |

**Critère clé** : utiliser le décorateur `@@map("<ancien_nom>")` sur les nouveaux modèles → **0 migration SQL nécessaire**, **0 perte de données**. Seul le code TypeScript change.

### Renames routes admin (pages)

Les pages admin sont **supprimées** (pas de redirect — ces URLs ne sont jamais partagées hors de l'app, seul le sidebar y pointe et il est mis à jour).

| Avant (supprimé) | Après |
|------------------|-------|
| `/besoins` | `/demandes` |
| `/besoins/nouveau` | `/demandes/nouveau` |
| `/fiches-besoin` | `/qualiopi/fiches-pre-formation` |

### Renames routes publiques (avec backward compat critique)

Les tokens publics sont envoyés par email aux clients/stagiaires — **on ne peut pas casser les liens des emails déjà envoyés**.

| Avant (déprécié) | Après | Stratégie |
|------------------|-------|-----------|
| `/fiche-besoin-client/[token]` | `/qualiopi/fiche-entreprise/[token]` | Garder l'ancienne route comme redirect 301 jusqu'au **2026-11-16** (6 mois) |
| `/fiche-besoin-stagiaire/[token]` | `/qualiopi/fiche-stagiaire/[token]` | Idem, suppression le 2026-11-16 |

Le champ `tokenAcces` en base reste inchangé → les tokens restent valides, seule l'URL change.

Une TODO datée doit être inscrite dans `docs/operations/README.md` pour planifier la suppression des routes deprecated le 2026-11-16.

### Renames API

| Avant | Après |
|-------|-------|
| `/api/besoins`, `/api/besoins/[id]` | `/api/demandes`, `/api/demandes/[id]` |
| `/api/besoin-client/*` | `/api/qualiopi/fiches-entreprise/*` |
| `/api/besoin-stagiaire/*` | `/api/qualiopi/fiches-stagiaire/*` |

Les anciennes routes API sont supprimées **sans redirect** (l'API n'est consommée que par le frontend qu'on contrôle).

### Mise à jour du middleware

`middleware.ts` doit être mis à jour pour :
- Remplacer les références aux anciens prefixes dans `adminPages` et `adminApiPrefixes`
- Garder les anciens prefixes `/api/besoin-client/public` et `/api/besoin-stagiaire/public` dans `isPublicPath()` pour les redirects backward compat

### Sidebar

(Mise à jour cohérente avec les renames — partiellement adressé dans PR #99 par renommage des labels.)

- Groupe **Commercial** → label "Demandes" (au lieu de "Besoins & demandes")
- Groupe **Qualité** → label "Fiches pré-formation" (au lieu de "Fiches Qualiopi")
- Nouveaux `href` pointent sur les nouvelles routes

### `STORY-TD-001` chiffrement NSS — vérification

Le wire du chiffrement NSS (PR #95, story TD-001) touche `app/api/besoin-stagiaire/public/[token]/route.ts`. Lors du rename → vérifier que la nouvelle route `/api/qualiopi/fiches-stagiaire/public/[token]` garde le wire encryptNSS/decryptNSS, et que la route legacy (redirect) reste fonctionnelle pendant la période de coexistence.

---

## Hors scope (explicitement)

Ce refactor traite **uniquement** la confusion "Besoin". Pas touché par cette spec :

- `Document` / `DocumentTemplate` / `GeneratedDocument` / `DocumentCategory` / `Attestation` / `FeuillePresence` (autre overlap potentiel)
- `Contact` polymorphe (`type: prospect|client|stagiaire`) + modèle `Prospect` séparé
- Linkage `Devis ↔ Session` (pas de FK actuellement)
- `AutomationRule` (v1) cohabite avec `AutomationRuleV2`
- Restructuration sidebar globale (déjà adressée en partie par PR #99)
- Toutes les autres pages

Ces points sont des candidats pour des refactors séparés, à brainstormer indépendamment si besoin.

---

## Critères d'acceptation

- [ ] `npx tsc --noEmit` retourne 0 erreur
- [ ] `npm test` : 71 tests existants passent
- [ ] Nouvelles routes admin fonctionnelles : `/demandes`, `/demandes/nouveau`, `/qualiopi/fiches-pre-formation`
- [ ] Nouvelles routes publiques fonctionnelles : `/qualiopi/fiche-entreprise/[token]`, `/qualiopi/fiche-stagiaire/[token]`
- [ ] Anciennes routes publiques redirigent (301) vers les nouvelles : `/fiche-besoin-client/[token]` → `/qualiopi/fiche-entreprise/[token]`
- [ ] Aucun lien interne ne pointe sur les anciennes routes (audit grep)
- [ ] Sidebar pointe sur les nouvelles routes
- [ ] Chiffrement NSS toujours actif sur la nouvelle route fiche stagiaire (test : créer une fiche, vérifier que le NSS est chiffré en base)
- [ ] Smoke test prod : créer une demande, envoyer une fiche entreprise depuis une session, envoyer une fiche stagiaire, vérifier que le statut passe à "repondu" après soumission

---

## Risques et mitigations

| Risque | Sévérité | Mitigation |
|--------|----------|------------|
| Lien email déjà envoyé casse | **Haute** | Redirect 301 sur les anciennes routes publiques, période de coexistence 6 mois |
| Breaking API non documentée consommée par un script externe | Moyenne | Aucune API externe documentée → risque faible. Si découvert post-déploiement : ajouter un redirect API. |
| Oubli d'un import lors du refactor → typecheck casse en CI | Moyenne | `tsc --noEmit` + Vitest CI bloquent le merge si oubli |
| Migration Prisma involontaire (oubli `@@map`) → drop puis recréation table = perte de données | **Haute** | Vérifier après modif `prisma migrate diff --from-empty --to-schema-datamodel` → doit montrer 0 changement structurel SQL |
| Refactor incomplet : nouvelles routes ajoutées sans suppression des anciennes → 2 chemins coexistent indéfiniment | Moyenne | Checklist de suppression dans le plan d'implémentation, deprecation timer 6 mois |

---

## Estimation

- **Code** : ~30-50 fichiers à modifier (imports, routes, types, UI strings)
- **Temps** : 4-6h de travail avec tests et vérifications
- **Risque** : moyen — beaucoup de fichiers mais changements mécaniques, surface bien circonscrite

---

## Étapes suivantes

1. ✅ Spec écrite et committée (ce document)
2. ⏳ Revue utilisateur de la spec
3. ⏳ Invocation du skill `writing-plans` pour produire le plan d'implémentation détaillé
4. ⏳ Implémentation sur branche dédiée `refactor/besoin-naming`
5. ⏳ Tests, PR, review CodeRabbit, merge
6. ⏳ Smoke test prod + monitoring sur 24h pour vérifier les redirects
