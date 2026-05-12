# Plan d'implémentation — Pipeline d'étapes & tâches V1

**Spec** : [`docs/superpowers/specs/2026-05-12-pipeline-etapes-v1-design.md`](../specs/2026-05-12-pipeline-etapes-v1-design.md)
**Branche** : `feat/pipeline-etapes-v1` (basée sur `origin/main` = `4ed2dca`)
**Mode** : autonome (Ismael : « sans demande »)

---

## Sprint 0 — Préparation (déjà fait)

- [x] Stash WIP `next.config.mjs`
- [x] Branche `feat/pipeline-etapes-v1` créée depuis `origin/main`
- [x] Spec écrit + commit

## Sprint 1 — Schéma & migration

### S1.1 — Étendre Prisma schema

Fichier : `prisma/schema.prisma`

Ajouts au `model Session` (juste avant les relations) :
```prisma
  etape         String   @default("preparation")
  etapeMajAt    DateTime @default(now())
```

Et dans le bloc relations de `Session` :
```prisma
  pipelineTasks SessionTask[]
```

Avec index dans le bloc Session :
```prisma
  @@index([etape])
```

Ajouts au `model Prospect` (avant relations) :
```prisma
  etape         String   @default("nouveau")
  etapeMajAt    DateTime @default(now())
```

Et relations + index :
```prisma
  pipelineTasks ProspectTask[]
  @@index([etape])
```

Trois nouveaux modèles à la fin du schéma (avant `KpiHistory` ou en fin de fichier) :
- `SessionTask` (cf. spec section 4.3)
- `ProspectTask` (idem)
- `EtapeTransition` (idem)

### S1.2 — Migration

```bash
cd /Users/anissa/rfc-
pnpm prisma generate
pnpm prisma db push   # local SQLite ou DB de dev
```

**Pas de `prisma migrate`** : RFC utilise `db push` en local (confirmé par le commit `b3eafd7` qui retire `prisma db push` du build Netlify). En prod, Netlify gère via le hook au déploiement.

### S1.3 — Commit
`feat(pipeline): schema Prisma — etape + tasks + transitions`

## Sprint 2 — Couche domaine pure

### S2.1 — `lib/pipeline/stages.ts`

```ts
export const SESSION_STAGES = [
  "preparation", "convocations", "en_cours", "cloture", "facturation", "clos",
] as const;
export type SessionStage = (typeof SESSION_STAGES)[number] | "annulee";

export const PROSPECT_STAGES = [
  "nouveau", "qualifie", "devis_envoye", "relance", "signe",
] as const;
export type ProspectStage = (typeof PROSPECT_STAGES)[number] | "perdu";

export const SESSION_STAGE_LABELS: Record<SessionStage, string> = {
  preparation: "Préparation",
  convocations: "Convocations",
  en_cours: "En cours",
  cloture: "Clôture",
  facturation: "Facturation",
  clos: "Clos",
  annulee: "Annulée",
};

export const PROSPECT_STAGE_LABELS: Record<ProspectStage, string> = {
  nouveau: "Nouveau",
  qualifie: "Qualifié",
  devis_envoye: "Devis envoyé",
  relance: "Relance",
  signe: "Signé",
  perdu: "Perdu",
};

export const SESSION_TERMINAL = ["clos", "annulee"] as const;
export const PROSPECT_TERMINAL = ["signe", "perdu"] as const;
```

### S2.2 — `lib/pipeline/transitions.ts` (logique pure, testable)

```ts
import { SESSION_STAGES, PROSPECT_STAGES, SESSION_TERMINAL, PROSPECT_TERMINAL,
         type SessionStage, type ProspectStage } from "./stages";

type TransitionResult = { ok: true } | { ok: false; reason: string };

export function canTransitionSession(
  from: SessionStage, to: SessionStage, role: "admin" | "formateur" | "client",
): TransitionResult {
  if (role !== "admin") return { ok: false, reason: "Réservé aux admins" };
  if (SESSION_TERMINAL.includes(from as never)) {
    return { ok: false, reason: "Étape terminale, pas de transition" };
  }
  if (to === "annulee") return { ok: true };                   // annulation depuis n'importe quoi de non-terminal
  if (from === "annulee") return { ok: false, reason: "Session annulée" };
  const fromIdx = SESSION_STAGES.indexOf(from as never);
  const toIdx = SESSION_STAGES.indexOf(to as never);
  if (fromIdx === -1 || toIdx === -1) return { ok: false, reason: "Étape inconnue" };
  if (Math.abs(toIdx - fromIdx) !== 1) {
    return { ok: false, reason: "Saut d'étapes interdit (avant/après seulement)" };
  }
  return { ok: true };
}

export function canTransitionProspect(
  from: ProspectStage, to: ProspectStage, role: "admin" | "formateur" | "client",
): TransitionResult {
  // miroir de canTransitionSession avec PROSPECT_* — voir code complet à l'implémentation
  // ...
}
```

### S2.3 — `lib/pipeline/templates.ts` (cf. spec section 5)

### S2.4 — Tests unitaires `lib/pipeline/__tests__/transitions.test.ts`

Avec **vitest** (déjà installé pour le sprint signature). Cas :
- transition forward valide
- transition backward valide
- saut interdit
- depuis terminal interdit
- annulation depuis non-terminal valide
- role formateur refusé
- depuis annulé interdit

### S2.5 — Commit
`feat(pipeline): domaine pur — stages, transitions, templates + tests`

## Sprint 3 — Routes API REST

### S3.1 — `lib/pipeline/schemas.ts` (Zod)

```ts
import { z } from "zod";

export const avancerEtapeSchema = z.object({
  toEtape: z.string().min(1),
  notes: z.string().max(500).optional(),
});

export const createTaskSchema = z.object({
  etape: z.string().min(1),
  titre: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  dueDate: z.string().datetime().optional(),
  assigneeId: z.string().cuid().nullable().optional(),
});

export const patchTaskSchema = z.object({
  completed: z.boolean().optional(),
  assigneeId: z.string().cuid().nullable().optional(),
  titre: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  dueDate: z.string().datetime().nullable().optional(),
});
```

### S3.2 — Service `lib/pipeline/service.ts`

Méthodes :
- `advanceSession(sessionId, toEtape, notes, userId)` → Prisma transaction : update Session, insert EtapeTransition, instancie templates de l'étape cible (skip si déjà présents même `(sessionId, etape, titre, source='template')`).
- `advanceProspect(prospectId, toEtape, notes, userId)` → idem.

### S3.3 — Routes API

À créer (toutes wrappées `withErrorHandler` ou `withErrorHandlerParams`) :

- `app/api/sessions/[id]/avancer-etape/route.ts` — POST
- `app/api/sessions/[id]/pipeline/route.ts` — GET
- `app/api/sessions/[id]/tasks/route.ts` — POST
- `app/api/sessions/tasks/[taskId]/route.ts` — PATCH, DELETE
- `app/api/prospects/[id]/avancer-etape/route.ts` — POST
- `app/api/prospects/[id]/pipeline/route.ts` — GET
- `app/api/prospects/[id]/tasks/route.ts` — POST
- `app/api/prospects/tasks/[taskId]/route.ts` — PATCH, DELETE
- `app/api/formateur/mes-taches-pipeline/route.ts` — GET

Chaque route : auth via `getServerSession(authOptions)`, vérif rôle, parse body via Zod, appel service, retour JSON.

### S3.4 — Commit
`feat(pipeline): routes API — avancer étape, tasks CRUD, audit`

## Sprint 4 — UI fiche Session

### S4.1 — Composant `components/pipeline/PipelineStepper.tsx`

Wrapper autour de `StatusPipeline` existant qui prend `entityType: "session" | "prospect"` + `currentEtape` et passe les bons steps/labels.

### S4.2 — Composant `components/pipeline/PipelinePanel.tsx`

- En-tête « Étape courante : {label} » + bouton « Avancer » (admin uniquement, désactivé si terminal) + bouton « Annuler la session » (admin, ouvre modal).
- Liste des tâches de l'étape courante : checkbox + titre + assignee + dueDate + bouton corbeille (si source=adhoc).
- Bouton « + Ajouter une tâche » → modal (`TaskCreateDialog`).
- Section collapsible « Historique des étapes ».

### S4.3 — Ajouter onglet « Pipeline » sur `app/sessions/[id]/page.tsx`

Le fichier fait 1309 lignes — à ne pas exploser, juste ajouter :
- Un état `tab` (« infos » | « pipeline » | etc.) si pas déjà là, ou un nouveau bloc dans le rendu existant.
- Import du `PipelinePanel` avec `entityType="session"` et `entityId={id}`.

### S4.4 — Commit
`feat(pipeline): UI fiche Session — stepper + panneau étape + tasks`

## Sprint 5 — UI fiche Prospect

**Découverte préalable** : `app/prospects/` n'existe pas en V1 (vérifié dans le filesystem). Le `Prospect` est modèle DB sans UI. Cas :
- **Si vraiment pas d'UI** : créer `app/prospects/page.tsx` (liste) + `app/prospects/[id]/page.tsx` (fiche minimale : nom, infos contact, panel pipeline).
- **Si UI cachée ailleurs** : grep `Prospect` dans `app/` et adapter.

### S5.1 — Si fiche Prospect inexistante, créer une fiche minimale

Page client component, structure copiée allégée de `Formateur` fiche. Sections :
1. Infos identité (nom, prénom, email, téléphone, entreprise)
2. **Onglet Pipeline** avec `PipelinePanel entityType="prospect"`

### S5.2 — Liste prospects (V1 minimal)

Page `/dashboard/prospects` ou `/prospects` : tableau filtrable par `etape`.

### S5.3 — Commit
`feat(pipeline): UI fiche Prospect — fiche minimale + onglet pipeline`

## Sprint 6 — Vue Kanban Sessions

### S6.1 — `app/dashboard/pipeline/sessions/page.tsx`

- Client component, fetch `GET /api/sessions?withPipeline=1` (ou nouvelle route si besoin).
- Rendu : 7 colonnes (6 actives + 1 « Annulées »), chaque carte = `<SessionPipelineCard>` avec formation + entreprise + date + nb tâches restantes de l'étape courante.
- Clic carte → navigation vers fiche Session, onglet pipeline.
- **Pas de drag-drop V1.**

### S6.2 — Lien sidebar

Si la sidebar admin a une section « Pipeline », ajouter l'entrée. Sinon, sous « Sessions » : « Vue pipeline ».

### S6.3 — Commit
`feat(pipeline): vue Kanban Sessions click-only`

## Sprint 7 — Côté formateur

### S7.1 — Section « Tâches pipeline » sur fiche formateur

Le commit `a14117f` (sur main local, non sur origin/main) ajoute 4 onglets. Sur la branche V1 (basée sur `origin/main` = `4ed2dca`), la fiche formateur n'a que `informations | sessions`. Donc :
- Si je base sur `origin/main` strict : pas d'onglet « Tâches » existant à enrichir.
- Solution : créer **directement** une section dans la fiche formateur ou créer une page dédiée `/espace-formateur/taches` (autonome, ne dépend pas du commit non-mergé).

V1 : page `/espace-formateur/taches` autonome. Fetch `GET /api/formateur/mes-taches-pipeline`. Liste regroupée par Session/Prospect, toggle completable par le formateur lui-même.

### S7.2 — Lien dans nav espace-formateur

Ajouter entrée « Mes tâches » dans la nav latérale espace-formateur si présente.

### S7.3 — Commit
`feat(pipeline): espace formateur — page Mes tâches pipeline`

## Sprint 8 — Polish & vérifs

### S8.1 — `pnpm typecheck` doit passer
### S8.2 — `pnpm test` (vitest) doit passer pour les tests pipeline
### S8.3 — Smoke manuel en local : créer Session → avancer 6 étapes → vérifier audit + tâches
### S8.4 — Smoke manuel : créer Prospect → avancer jusqu'à signé → vérifier audit
### S8.5 — Commit final si polish nécessaire

## Sprint 9 — Pas de push automatique

**Memory rule** : « jamais de push direct sur main ». Branche `feat/pipeline-etapes-v1` reste locale OU pushed sur origin (`feat/...`), Ismael décidera de l'ouverture PR. Rapport final attendu :
- Liste des commits sur la branche
- Résumé fonctionnel
- Points d'attention (vs WIP Sentry parallèle, vs commit `a14117f` non-mergé sur origin)

---

## Critères de succès V1

1. Sur une fiche Session, je peux voir l'étape courante via stepper.
2. Je peux avancer l'étape via bouton « Avancer » et l'historique se loggue.
3. Les tâches templates de la nouvelle étape s'instancient automatiquement.
4. Je peux ajouter une tâche ad-hoc, l'assigner à un formateur, fixer une date.
5. Un formateur connecté voit ses tâches pipeline dans `/espace-formateur/taches` et peut les cocher.
6. La vue Kanban montre toutes les sessions par étape.
7. Pareil sur Prospect.
8. Les tests unitaires de transitions passent.
9. `pnpm typecheck` ok.

## Hors scope (rappel) — V2

- Drag-drop Kanban
- Notifications (mail / in-app)
- Cron tâches en retard
- Configurabilité étapes via UI
- Métriques pipeline
- Fusion `statut` ↔ `etape`
