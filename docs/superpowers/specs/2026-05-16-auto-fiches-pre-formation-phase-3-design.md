# Auto-envoi fiches pré-formation à la signature devis — Phase 3

**Date** : 2026-05-16
**Auteur** : Ismael Lepennec
**Statut** : Design approuvé, à implémenter
**Origine** : suite de Phases 1 (prospect unifié) et 2 (devis auto IA). Vision : "les questionnaires s'envoient en automatique" à la conversion prospect→client.

---

## Problème

Aujourd'hui (post-Phase 2), le flow est :
1. Admin qualifie un prospect → IA génère devis brouillon (Phase 2 ✅)
2. Admin envoie devis pour signature
3. Client signe électroniquement → `Devis.statut = "signe"` (PR #95 sync)
4. **Manuel** : admin doit créer une session, l'associer à un devis, puis cliquer "Envoyer fiches Qualiopi" pour collecter info pré-formation
5. Admin ajoute manuellement les stagiaires → manuel cliquer "Envoyer fiches stagiaires"

**Friction** : 2 actions manuelles supplémentaires (création session + envoi fiches) après chaque signature. Risque d'oubli → audit Qualiopi en pâtit.

**Vision** : à la signature électronique → tout part automatiquement.

---

## Solution retenue

### Trigger 1 — Signature électronique du devis

Hook sur l'event `devis_signed` (déjà fire par `lib/signatures/devis-sync.ts` depuis PR #95).

À ce moment :
1. Charger Devis + Demande liée (`Devis.demande` via relation inverse) + Entreprise + Contact + Formation (via `Demande.formationId` setté par Phase 2)
2. **Si `Demande.formationId === null`** (cas devis créé manuellement hors Phase 2) :
   - Notif admin in-app : *"Devis signé mais pas de formation matchée — créer la session manuellement"*
   - **Ne pas auto-créer de session** (insuffisant d'info)
3. **Sinon, auto-créer une Session brouillon** :
   - `formationId` = `Demande.formationId`
   - `dateDebut` = aujourd'hui + 30 jours (placeholder)
   - `dateFin` = même date (placeholder)
   - `lieu` = `null`
   - `capaciteMax` = `Demande.nbStagiaires ?? 1`
   - `statut` = `"planifiee"`
   - `notes` = "Session brouillon créée auto à la signature devis #X — à compléter (dates/lieu/formateur)"
4. **Auto-créer FichePreFormationEntreprise** liée à cette session :
   - `tokenAcces` généré (cuid ou UUID v4)
   - `entrepriseId` = `Devis.entrepriseId`
   - `destinataireNom` / `destinataireEmail` = contact décideur
   - `statut = "envoye"`, `dateEnvoi = now`
5. **Auto-envoyer email** au contact décideur avec lien `/qualiopi/fiche-entreprise/[token]`
6. Notif admin : *"Session brouillon créée + fiche entreprise envoyée. Complétez la session (dates/lieu/formateur) + ajoutez les stagiaires."*

### Trigger 2 — Création d'une inscription

Hook sur POST `/api/sessions/[id]/inscriptions` (ou équivalent) lors de l'ajout d'un stagiaire à une session.

**Si la session est liée (indirectement via Devis ou Demande) à un devis signé** :
7. **Auto-créer FichePreFormationStagiaire** pour ce stagiaire (contactId) :
   - `tokenAcces` généré
   - `sessionId` = la session
   - `contactId` = le stagiaire ajouté
   - `statut = "envoye"`, `dateEnvoi = now`
8. **Auto-envoyer email** au stagiaire avec lien `/qualiopi/fiche-stagiaire/[token]`

**Comment savoir si la session est "liée à un devis signé"** : la session est issue de l'auto-création Phase 3 si une `Demande` existe avec `Demande.devisId.statut = "signe"` (ou plus loose : si la session a été créée auto, on stocke un flag/note). Simpler : check `Demande.devisId IS NOT NULL AND Devis.statut === "signe"` via `Demande.sessionId` (à ajouter si pas déjà présent ? voir schéma).

**Note** : `Demande.devisId` existe. Pas de `Demande.sessionId` direct. Donc la liaison Demande↔Session se fait via `Demande.devisId → Devis.id ← Session.devisId` (si `Session.devisId` existe) OU via un lookup. À investiguer dans l'implémentation.

### Composants techniques

#### `lib/automations/auto-fiches-pre-formation.ts` (nouveau)

3 fonctions exportées :

```ts
// À la signature devis : crée session brouillon + fiche entreprise + email
export async function autoCreateSessionAndFicheEntrepriseOnDevisSigned(
  devisId: string,
): Promise<{ sessionId: string; ficheEntrepriseId: string } | { error: string; skipped?: boolean }>;

// À l'inscription d'un stagiaire : crée fiche stagiaire + email (si session liée à un devis signé)
export async function autoCreateFicheStagiaireOnInscription(
  inscriptionId: string,
): Promise<{ ficheStagiaireId: string } | { error: string; skipped?: boolean }>;
```

Stratégie email : utiliser les fonctions existantes `fichePreFormationEntrepriseEmail` et `fichePreFormationStagiaireEmail` dans `lib/email.ts` (renommées Task 12 du refactor besoin).

#### `lib/signatures/devis-sync.ts` (modify)

Après `triggerAutomation("devis_signed", ...)`, appeler :

```ts
await import("@/lib/automations/auto-fiches-pre-formation")
  .then(({ autoCreateSessionAndFicheEntrepriseOnDevisSigned }) =>
    autoCreateSessionAndFicheEntrepriseOnDevisSigned(devisId).catch((err) =>
      logger.warn("phase-3.session-fiche-entreprise-failed", { error: String(err) }),
    ),
  );
```

Fire-and-forget : la signature elle-même ne doit pas échouer si Phase 3 échoue.

#### `app/api/sessions/[id]/inscriptions/route.ts` (modify)

Après la création d'une `Inscription`, appeler `autoCreateFicheStagiaireOnInscription(inscription.id)`. Fire-and-forget aussi.

### Tests

- `tests/lib/auto-fiches-pre-formation.test.ts` :
  - `autoCreateSessionAndFicheEntreprise` :
    - Cas nominal : Demande avec formationId → session créée + fiche entreprise + email
    - Cas Demande sans formationId → skipped + notif admin
    - Cas Devis sans Demande associée → skipped (case devis créé manuellement)
    - Idempotence : si appelé 2× pour le même devis, ne crée qu'1 session
  - `autoCreateFicheStagiaireOnInscription` :
    - Cas nominal : session liée à devis signé → fiche stagiaire créée + email
    - Cas session sans devis signé → skipped
    - Idempotence : si fiche existe déjà pour ce contact+session → skipped

---

## Hors scope (futur)

- **Multi-formation** : si devis contient plusieurs lignes formations distinctes → 1 seule session créée auto (la formation matchée par IA Phase 2). Si admin veut split, manuel.
- **Devis signés "offline"** (papier scanné, `Devis.statut = "signe"` mais pas via `/sign/[token]`) → hook ne fire pas. Admin clique bouton manuel "Envoyer fiches" existant.
- **Rappels auto** : si fiche non remplie après J+7 → relance auto. Pas implémenté Phase 3 (peut venir en Phase 3.5).
- **Configuration admin** : règle on/off pour désactiver Phase 3 par devis ou par client. Pas implémenté.

---

## Critères d'acceptation

- [ ] `npx tsc --noEmit` : 0 erreur
- [ ] `npm test` : tous tests passent (94 baseline post-Phase-2 + nouveaux)
- [ ] Smoke test prod : 
  1. Créer prospect via `/prospects/nouveau` (Phase 1)
  2. Qualifier → devis brouillon créé par IA (Phase 2)
  3. Réviser + envoyer pour signature
  4. Simuler signature électronique → session brouillon créée auto + fiche entreprise envoyée par email + notif admin
  5. Admin complète la session, ajoute un stagiaire → fiche stagiaire auto-envoyée
- [ ] Idempotence : signer le même devis 2× (via cron retry par exemple) ne crée pas de doublon

---

## Risques et mitigations

| Risque | Sévérité | Mitigation |
|--------|----------|------------|
| Sessions brouillon fantômes (créées auto mais admin oublie de compléter) | Moyenne | Statut `planifiee` (pas confirmée) + notes explicites + notif admin claire |
| Email contact erroné → bounce | Faible | Existing `LogEmail` + `EmailTrackingEvent` capturent les bounces, admin peut renvoyer |
| Devis signé via cron retry (PR #95 `signature-retry-finalization`) → trigger appelé 2× | Moyenne | Idempotence : check si une session avec `note` contenant "auto-créée pour devis #X" existe déjà → skip |
| `Demande.formationId` null sur certains devis legacy → notif spam | Faible | Notif uniquement si pas déjà une notif similaire récente (debounce 1h) |
| Inscription créée hors flow normal (ex: import CSV) → trigger non désiré | Faible | Hook uniquement sur POST `/api/sessions/[id]/inscriptions` (pas via batch import) |

---

## Estimation

- **Code** :
  - `lib/automations/auto-fiches-pre-formation.ts` (~200 lignes)
  - Modify `lib/signatures/devis-sync.ts` (~10 lignes ajoutées)
  - Modify `app/api/sessions/[id]/inscriptions/route.ts` (~10 lignes ajoutées)
  - Tests (~200 lignes)
- **Temps** : 3-4h dev avec tests
- **Risque** : moyen (intégration sur le flow signature critique, attention idempotence)

---

## Pré-requis

- [x] PR #100 (refactor besoin) mergée — utilise `prisma.demande`, `prisma.fichePreFormationEntreprise`, `prisma.fichePreFormationStagiaire`
- [x] PR #101 (Phase 1) mergée — `Demande.formationId` peut être setté par flow normal
- [x] PR #102 (Phase 2) mergée — `Demande.formationId` est setté par IA à la qualification
- [x] `lib/email.ts` fonctions `fichePreFormationEntrepriseEmail` et `fichePreFormationStagiaireEmail` existent
- [x] `lib/signatures/devis-sync.ts` existe (PR #95)

---

## Étapes suivantes

1. ✅ Spec écrite + commitée
2. ⏳ Plan d'implémentation (skill writing-plans)
3. ⏳ Exécution sur branche `feat/auto-fiches-pre-formation`
4. ⏳ Tests, PR, smoke test
