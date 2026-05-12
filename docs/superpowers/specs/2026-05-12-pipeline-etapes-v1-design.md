# Pipeline d'étapes & tâches assignables — V1

**Date** : 2026-05-12
**Statut** : design — décisions arrêtées en mode autonome (Ismael : « construis de A à Z, sans demande »)
**Auteur** : Claude (session brainstorming)

---

## 1. Problème

RFC pilote un cycle commercial (Prospect → Besoin → Devis → Session) puis pédagogique (Session → émargements → évaluations → facturation), mais le suivi opérationnel se résume aujourd'hui à un champ `statut` string sur chaque entité (`Session.statut`, `Prospect.statut`, `Devis.statut`, `BesoinFormation.statut`). Pas d'étapes ordonnées, pas de tâches checklist par étape, pas d'audit trail Qualiopi des transitions.

Besoin : un **parcours d'étapes** par cycle (pédagogique + commercial), avec sous chaque étape une **checklist de tâches assignables** (notamment aux formateurs).

## 2. Décisions de design (arrêtées)

| # | Décision | Choix retenu | Justification courte |
|---|---|---|---|
| D1 | Entité porteuse | **2 pipelines** : `Session` (pédago) + `Prospect` (commercial) | Lifecycles disjoints, acteurs disjoints, plomberie existante différente |
| D2 | Étapes config | **Hardcodées** (string enum applicatif) | Mono-tenant ; étapes Qualiopi stables ; UI admin = coût pour zéro bénéfice V1 |
| D3 | Sémantique | **State machine** (une étape courante) + log de transitions | Audit Qualiopi exige horodatage des passages, pas seulement état final |
| D4 | Tâches | **Templates en code instanciés au passage** + tâches **ad-hoc** | Démarre avec un golden path solide, garde la flexibilité quotidienne |
| D5 | Visibilité formateur | Onglet « Mes tâches pipeline » = agrège ses `SessionTask` et `ProspectTask` ; **pas d'accès au pipeline global** | Coordinateur pilote, formateur exécute |
| D6 | Rétro-compat `statut` | `statut` existant **inchangé** en V1 ; nouveau champ `etape` parallèle | Évite migration coûteuse et casse cross-codebase |
| D7 | Transitions UI | **Bouton « Avancer »** explicite + dropdown changement libre (admin) | KISS V1 ; drag-drop Kanban → V2 |
| D8 | Permissions | Admin + coordinateur : tout ; formateur : toggle/assign sur tâches qui lui sont assignées | RFC mono-tenant, pas de RLS DB |

## 3. Étapes du pipeline

### Pipeline pédagogique — sur `Session`

Ordre : `preparation → convocations → en_cours → cloture → facturation → clos`.
Terminal alternatif : `annulee`.

| Code | Libellé | Sortie attendue |
|---|---|---|
| `preparation` | Préparation | Programme validé, formateur confirmé, lieu/visio prêt |
| `convocations` | Convocations | Convocations envoyées aux stagiaires |
| `en_cours` | En cours | Formation en train d'être délivrée |
| `cloture` | Clôture pédagogique | Émargements signés + évaluations chaud collectées + attestations générées |
| `facturation` | Facturation | Facture émise + paiement encaissé |
| `clos` | Clos | Plus aucune action attendue |
| `annulee` | Annulée | Terminal alternatif (clôture sans suite) |

### Pipeline commercial — sur `Prospect`

Ordre : `nouveau → qualifie → devis_envoye → relance → signe`.
Terminal alternatif : `perdu`.

| Code | Libellé | Sortie attendue |
|---|---|---|
| `nouveau` | Nouveau lead | Contact établi, besoin à clarifier |
| `qualifie` | Qualifié | Besoin compris, périmètre cadré |
| `devis_envoye` | Devis envoyé | Document envoyé au client |
| `relance` | Relance | Suivi commercial en cours |
| `signe` | Signé | Devis accepté → conversion en Session |
| `perdu` | Perdu | Terminal alternatif |

### Transitions autorisées

- Avant : étape précédente uniquement (linéaire).
- Suivant : étape suivante uniquement (linéaire).
- Saut : autorisé pour admin via dropdown (cas exceptionnels), interdit pour coordinateur via le bouton « Avancer ».
- Terminal alternatif (`annulee`, `perdu`) : autorisé depuis n'importe quelle étape non terminale.
- Pas de retour depuis terminal (`clos`, `annulee`, `perdu`).

## 4. Modèle de données

Ajouts au schéma Prisma. **Les modèles et champs existants ne sont pas modifiés** sauf ajout explicite.

### 4.1. Sur `Session`

```prisma
model Session {
  // ... champs existants inchangés ...
  etape         String   @default("preparation")  // pipeline pédago
  etapeMajAt    DateTime @default(now())          // dernier passage

  tasksPipeline SessionTask[]
  transitions   EtapeTransition[]                  // côté Session uniquement (filtré par entityType)
  @@index([etape])
}
```

### 4.2. Sur `Prospect`

```prisma
model Prospect {
  // ... champs existants inchangés ...
  etape         String   @default("nouveau")
  etapeMajAt    DateTime @default(now())

  tasksPipeline ProspectTask[]
  @@index([etape])
}
```

### 4.3. Nouvelles tables

```prisma
model SessionTask {
  id          String   @id @default(cuid())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  sessionId   String
  session     Session  @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  etape       String                                // étape de rattachement
  titre       String
  description String?
  ordre       Int      @default(0)
  completed   Boolean  @default(false)
  completedAt DateTime?
  dueDate     DateTime?
  assigneeId  String?                                // User assigné (souvent formateur)
  source      String   @default("template")          // "template" | "adhoc"

  @@index([sessionId, etape])
  @@index([assigneeId])
  @@index([completed, dueDate])
}

model ProspectTask {
  id          String   @id @default(cuid())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  prospectId  String
  prospect    Prospect @relation(fields: [prospectId], references: [id], onDelete: Cascade)
  etape       String
  titre       String
  description String?
  ordre       Int      @default(0)
  completed   Boolean  @default(false)
  completedAt DateTime?
  dueDate     DateTime?
  assigneeId  String?
  source      String   @default("template")

  @@index([prospectId, etape])
  @@index([assigneeId])
  @@index([completed, dueDate])
}

model EtapeTransition {
  id         String   @id @default(cuid())
  createdAt  DateTime @default(now())

  entityType String                                  // "session" | "prospect"
  entityId   String                                  // FK applicative (pas Prisma)
  fromEtape  String?
  toEtape    String
  byUserId   String?
  notes      String?

  @@index([entityType, entityId])
}
```

Choix de modélisation :

- **Deux tables `*Task` séparées** (pas de polymorphism via JSON discriminator) → FK Prisma propres, requêtes simples, type-safety.
- **Une seule table `EtapeTransition`** avec discriminateur `entityType` → la lecture est minoritaire (audit Qualiopi annuel), pas d'enjeu de perf, factorise le code de log.
- `assigneeId` reste un `String?` non FK pour s'aligner sur le pattern existant (`Prospect.attribueA`, `TaskItem.userId`). Pas de relation Prisma pour ne pas exiger un FK qui casserait si le User est supprimé.
- Champ `source` sur les tâches → distingue templates auto-créés vs ajouts manuels (utile en UI : icône, droit de suppression).

### 4.4. Pas de modification destructive

- `Session.statut`, `Prospect.statut` : **conservés tels quels**. Ils continuent de représenter l'état technique (« planifiée », « confirmée »…). Le champ `etape` est ajouté en parallèle pour le suivi opérationnel.
- En V2 on pourra dériver `statut` depuis `etape` et déprécier l'un des deux. Pas en V1.

## 5. Templates de tâches par étape

Fichier : `lib/pipeline/templates.ts`.

```ts
type StageTaskTemplate = { titre: string; description?: string };

export const SESSION_STAGE_TASKS: Record<string, StageTaskTemplate[]> = {
  preparation: [
    { titre: "Valider le programme avec le formateur" },
    { titre: "Confirmer le lieu ou la classe virtuelle" },
    { titre: "Préparer le kit pédagogique" },
  ],
  convocations: [
    { titre: "Envoyer les convocations aux stagiaires" },
    { titre: "Vérifier les confirmations de présence" },
  ],
  en_cours: [
    { titre: "Animer la formation (signer en fin de journée)" },
  ],
  cloture: [
    { titre: "Récupérer toutes les feuilles d'émargement signées" },
    { titre: "Envoyer le questionnaire d'évaluation à chaud" },
    { titre: "Générer et envoyer les attestations" },
  ],
  facturation: [
    { titre: "Émettre la facture" },
    { titre: "Suivre le paiement (échéance + relances)" },
  ],
  clos: [],
  annulee: [],
};

export const PROSPECT_STAGE_TASKS: Record<string, StageTaskTemplate[]> = {
  nouveau: [
    { titre: "Premier appel de qualification" },
  ],
  qualifie: [
    { titre: "Rédiger et envoyer le devis" },
  ],
  devis_envoye: [
    { titre: "Programmer une relance à J+7" },
  ],
  relance: [
    { titre: "Relancer le client" },
  ],
  signe: [
    { titre: "Convertir en Session (créer la programmation)" },
  ],
  perdu: [],
};

export const SESSION_STAGES = [
  "preparation", "convocations", "en_cours", "cloture", "facturation", "clos",
] as const;
export const SESSION_TERMINAL_ALT = "annulee" as const;

export const PROSPECT_STAGES = [
  "nouveau", "qualifie", "devis_envoye", "relance", "signe",
] as const;
export const PROSPECT_TERMINAL_ALT = "perdu" as const;
```

Pourquoi un fichier de constantes plutôt qu'un modèle DB : on veut que la modif du template soit traçable en git, revue, et déployée en bloc — pas un état mutable en prod accessible à tout admin.

## 6. Endpoints API REST

**Convention RFC** (vérifiée : aucune Server Action dans le repo, tout passe par `app/api/*` + `withErrorHandler`). Les nouvelles routes :

| Méthode + chemin | Comportement |
|---|---|
| `POST /api/sessions/[id]/avancer-etape` | body `{ toEtape, notes? }`. Valide transition autorisée → update `Session.etape`+`etapeMajAt` → insert `EtapeTransition` → instancie templates de `toEtape` dans `SessionTask` (idempotent via check) |
| `POST /api/prospects/[id]/avancer-etape` | idem pour `Prospect` |
| `GET /api/sessions/[id]/pipeline` | renvoie `{ etape, tasks: SessionTask[], transitions: EtapeTransition[] }` |
| `GET /api/prospects/[id]/pipeline` | idem |
| `POST /api/sessions/[id]/tasks` | body `{ etape, titre, description?, dueDate?, assigneeId? }` → crée `SessionTask` ad-hoc |
| `POST /api/prospects/[id]/tasks` | idem |
| `PATCH /api/sessions/tasks/[taskId]` | body `{ completed? , assigneeId? , titre? , description? , dueDate? }` selon perms |
| `PATCH /api/prospects/tasks/[taskId]` | idem |
| `DELETE /api/sessions/tasks/[taskId]` | autorisé si `source = "adhoc"` |
| `DELETE /api/prospects/tasks/[taskId]` | idem |
| `GET /api/formateur/mes-taches-pipeline` | (espace formateur) agrège `SessionTask`+`ProspectTask` `assigneeId = currentUser.id`, non complétées en priorité |

Validation des bodies : Zod schemas centralisés dans `lib/pipeline/schemas.ts`. Toutes les routes wrappées par `withErrorHandler` / `withErrorHandlerParams`.

## 7. UI

### 7.1. Fiche Session — nouvel onglet « Pipeline »

Sur la page `/dashboard/sessions/[id]` (ou équivalent flat actuel), ajouter :

- **Stepper horizontal** en haut de la page, affichant les 6 étapes principales. Étape courante = bullet plein orange (couleur brand RFC ?). Étapes passées = check vert. Étapes à venir = grisées. `annulee` rend tout le stepper barré rouge.
- Sous le stepper, **un panneau « Étape courante : X »** avec :
  - Titre + description de l'étape (depuis un libellé en `templates.ts`).
  - Liste des tâches de l'étape courante : checkbox (toggle), assignee (avatar+nom, clic pour changer si admin), dueDate, bouton corbeille (si source=adhoc).
  - Bouton « + Ajouter une tâche » → modal (titre, description, dueDate, assignee).
  - Bouton **« Avancer à l'étape suivante »** (vert, primary) → confirme transition.
  - Lien « Annuler la session » → modal de confirmation → passe à `annulee`.
- **Historique des étapes** (collapsible) : la liste des `EtapeTransition` triées desc, format « 12/05 14:32 — Jean a fait passer de Préparation à Convocations ».

### 7.2. Fiche Prospect — idem

Même pattern, étapes commerciales, terminal alternatif = `perdu`.

### 7.3. Vue Kanban Sessions (V1 simple)

Page `/dashboard/pipeline/sessions`. Une colonne par étape (6 colonnes + colonne pliée « Annulées »). Chaque carte = Session avec titre formation + entreprise + date début + nb tâches non complétées de l'étape. **Pas de drag-drop V1** — clic sur carte → fiche Session pour avancer. Drag-drop = V2.

### 7.4. Côté formateur

L'onglet « Tâches » actuel sur la fiche Formateur (issu du commit `a14117f`) montre déjà ses `TaskItem` libres. On **ajoute une section** « Tâches du pipeline » qui agrège : `SessionTask` + `ProspectTask` où `assigneeId = formateur.userId`, regroupées par Session/Prospect, avec lien profond. Pas de drag-drop, juste toggle.

Page dédiée formateur : `/espace-formateur/taches` montre toutes ses tâches pipeline (au-delà de l'onglet sur la fiche admin). À cabler dans l'espace formateur si existant, sinon V2.

## 8. Convention API alignée sur l'existant

RFC est full **REST API** (routes `app/api/*` + `withErrorHandler`), pas de Server Actions. Les pages détail sont **client components** qui font `fetch()` via `useApi` / `useApiMutation` (cf. `app/sessions/[id]/page.tsx`, `app/formateurs/[id]/page.tsx`). On suit cette convention.

Composant pipeline existant à exploiter : `components/shared/StatusPipeline.tsx` — affiche déjà un stepper horizontal avec `steps[]` + `currentStatus` + `lostStatus` + `successStatus`. Réutilisé tel quel pour les étapes Session/Prospect, alimenté avec `SESSION_STAGES` / `PROSPECT_STAGES`.

## 9. Sécurité / permissions

Pas de RLS DB (mono-tenant, pas de Postgres RLS dans RFC). Permissions appliquées dans les Server Actions :

User RFC a un champ `role: string` à valeurs `"admin" | "formateur" | "client"` (cf. `prisma/schema.prisma:23`). Mapping :

- **`admin`** : tout — avancer étape, assigner, créer/supprimer tâche ad-hoc, toggle toute tâche.
- **`formateur`** : `PATCH` task **uniquement** si `assigneeId = currentUser.id` ET seulement les champs `{completed, completedAt}`. Tout le reste = 403.
- **`client`** : 403 sur l'ensemble des routes pipeline.

Vérification via `getServerSession(authOptions)` dans chaque route handler.

## 9.bis. ⚠️ Découverte tardive : Prospect descopé du CDC

Lors de l'implémentation Sprint 5, découverte du commit `18d3647` (merged sur `main` quelques heures avant) qui **supprime délibérément** `app/prospects/` + `app/api/prospects/` avec mention explicite **« pas de pipeline prospects »** (CDC client RFC).

Conséquence V1 :

- ✅ Conserve : champs `Prospect.etape` + `Prospect.etapeMajAt` + index dans le schéma Prisma (coût zéro ; utile si CDC évolue).
- ✅ Conserve : domaine `canTransitionProspect`, templates `PROSPECT_STAGE_TASKS`, tests unitaires associés (zéro contrainte sur la prod, prêt à réactiver).
- ❌ Retire : les 4 routes API `/api/prospects/[id]/*` créées en Sprint 3.
- ❌ Pas de fiche Prospect, pas de Kanban Prospect, pas d'intégration UI.

Pipeline V1 livré couvre donc **Session uniquement**. Si Prospect revient au CDC : reprendre les 4 routes API depuis l'historique git + ajouter une fiche UI ; le domaine et le schéma sont déjà prêts.

## 10. Hors scope V1 (= V2/V3)

- Drag-drop sur Kanban.
- Notifications email / in-app sur tâche assignée ou en retard (utilisera `Notification` modèle existant).
- Cron quotidien « tâches en retard » (irait dans le workflow GitHub Actions cron existant, cf. `feedback_audit_git_fetch_first`).
- Configurabilité des étapes via UI admin (option 2 du brainstorm — rejetée pour V1).
- Pipeline sur `BesoinFormation` (commercial pré-prospect) — `Prospect` couvre déjà le cas, `Besoin` reste un détail dans la fiche.
- Métriques pipeline (conversion lead→signé, durée moyenne par étape).
- Permission granulaire « voir le pipeline mais pas avancer ».
- Migration `statut` → dérivé de `etape` (rétro-compat conservée en V1).

## 11. Plan d'exécution (résumé — détail dans le plan)

1. Migration Prisma + `prisma db push` local.
2. Templates + types `lib/pipeline/`.
3. Server actions + Zod schemas + tests unitaires sur la logique de transition.
4. UI fiche Session (stepper, panneau étape, historique).
5. UI fiche Prospect (idem).
6. Vue Kanban Sessions (V1 click-only).
7. Section tâches pipeline sur fiche Formateur.
8. Commits séparés par sous-feature, branche `feat/pipeline-etapes-v1`, **pas de push** auto sur main (memory : « jamais de push direct sur main »).

## 12. Risques identifiés

- **Confusion `statut` vs `etape`** : double champ pendant la transition. Mitigation = documentation inline + libellés UI distincts (« Statut technique » vs « Étape pipeline ») + plan V2 pour fusionner.
- **Templates en code → modif = redéploiement** : volontaire. Si Ismael trouve ça pénible en pratique, V2 = table `PipelineStageTemplate` avec seed depuis le code.
- **Polymorphism `EtapeTransition.entityType`** : pas de FK Prisma. Si un Session est supprimé, son audit reste orphelin. Volontaire pour Qualiopi (l'audit doit survivre à la suppression). Si vraiment gênant, garder via `onDelete: SetNull` impossible sans FK Prisma → soit deux tables `SessionEtapeTransition` + `ProspectEtapeTransition`, soit on assume.
- **Idempotence transition** : si on clique 2× « Avancer » rapidement, on risque de créer 2× les templates. Mitigation = check `SELECT COUNT WHERE sessionId AND etape AND source='template'` avant insert, ou unique index `(sessionId, etape, titre, source)`.

---

**Fin du spec — V1.**
