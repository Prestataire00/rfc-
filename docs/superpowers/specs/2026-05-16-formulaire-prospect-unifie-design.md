# Formulaire prospect unifié — Phase 1

**Date** : 2026-05-16
**Auteur** : Ismael Lepennec
**Statut** : Design approuvé, à implémenter
**Origine** : session brainstorming après refactor Besoin → Demande. L'utilisateur a identifié que la création d'un prospect actuelle force à enchaîner 2-3 pages (Entreprise → Contact → Demande) avec un onglet "Analyse des besoins clients (RFC)" non intuitif et une mise en page non full-width.

---

## Problème

**Aujourd'hui** : pour créer un prospect avec un besoin de formation, l'admin doit naviguer entre 3 pages :

1. `/entreprises/nouveau` (si nouvelle entreprise)
2. `/contacts/nouveau` (créer le contact, le rattacher à l'entreprise)
3. `/demandes/nouveau` (créer la demande, sélectionner le contact)

Friction observée :
- Trois pages = trois soumissions = trois opportunités d'oublier des champs ou de perdre le fil
- L'admin doit garder en tête le contexte ("je suis en train de créer un prospect pour RFC, leur contact est M. Dupont, ils veulent une formation SST")
- La page `/demandes/nouveau` n'occupe pas toute la largeur de l'écran (perte d'espace)
- La section "Analyse des besoins clients (RFC)" actuelle (assist IA) n'est pas intuitive

**Vision** : **une seule page** "Nouveau prospect" qui capture tout en une fois et crée en arrière-plan les 3 entités via une transaction Prisma.

---

## Solution retenue (Phase 1)

### Architecture

- **Nouvelle page** : `app/prospects/nouveau/page.tsx`
- **Nouvelle API** : `POST /api/prospects` (1 endpoint en transaction Prisma)
- **Garder en l'état** : `/contacts/nouveau`, `/demandes/nouveau`, `/entreprises/nouveau` (flows admin avancés, accessibles si besoin)
- **Sidebar** : ajouter "Nouveau prospect" (icône `UserPlus`) en tête du groupe CRM, comme call-to-action principal

### Layout

- Page **full-width** (pas de `max-w-*` contraignant)
- **2 colonnes sur desktop** (lg:), 1 colonne sur tablette/mobile :
  - Colonne gauche : Contact + Entreprise (qui sera le client)
  - Colonne droite : Demande + Besoins particuliers + Notes
- Sections déployées en permanence (pas de stepper/accordéon — tout visible)
- Bouton de soumission en pied, sticky en bas sur mobile

### Sections du formulaire

#### Section 1 — Contact (le décideur)

| Champ | Type | Obligatoire | Notes |
|-------|------|-------------|-------|
| Prénom | text | ✓ | |
| Nom | text | ✓ | |
| Email | email | ✓ | Unique en base |
| Téléphone | tel | | |
| Poste / fonction | text | | Pré-rempli "Responsable formation" si vide |

#### Section 2 — Entreprise

Toggle radio : **Existante** (autocomplete) OU **Nouvelle**.

Si nouvelle :
| Champ | Type | Obligatoire | Notes |
|-------|------|-------------|-------|
| Raison sociale | text | ✓ | |
| SIRET | text | | Format validé (14 chiffres) ; possibilité d'enrichir via Pappers en Phase ultérieure |
| Adresse | text | | |
| Code postal | text | | |
| Ville | text | | |
| Secteur d'activité | select | | Options : industrie, BTP, tertiaire, public, autre |
| Effectif | number | | Indicatif |

Si existante :
| Champ | Type | Obligatoire | Notes |
|-------|------|-------------|-------|
| Sélection entreprise | autocomplete | ✓ | Recherche live `/api/entreprises?search=...` |

#### Section 3 — Demande de formation

| Champ | Type | Obligatoire | Notes |
|-------|------|-------------|-------|
| Origine | radio | ✓ | client / stagiaire / centre / prospection |
| Source contact | select | | email / téléphone / site web / salon / bouche-à-oreille / autre |
| Formation souhaitée | select catalogue + champ libre | ✓ | Select dans `/api/formations?actif=true` + champ "Autre" pour description libre |
| Nombre de stagiaires | number | | Défaut 1 |
| Date(s) souhaitées | date OR période | | Texte libre : "courant juin 2026" |
| Budget envisagé | number | | Optionnel |
| Mode de financement envisagé | select | | OPCO / CPF / entreprise / personnel / mixte / à définir |

#### Section 4 — Besoins particuliers

| Champ | Type | Obligatoire | Notes |
|-------|------|-------------|-------|
| Handicap / contraintes spécifiques | textarea | | RGPD : info pré-collecte, formalisée Qualiopi post-signature |
| Matériel sur place | textarea | | (le client met à dispo X / le centre fournit) |

#### Section 5 — Notes commerciales (internes)

| Champ | Type | Obligatoire | Notes |
|-------|------|-------------|-------|
| Commentaire | textarea | | Notes admin/commercial, non-visible côté client |

### Data flow (à la soumission)

`POST /api/prospects` reçoit le payload structuré. En **transaction Prisma** (rollback automatique si erreur) :

```ts
await prisma.$transaction(async (tx) => {
  // 1. Entreprise (nouvelle ou existante)
  const entrepriseId = data.entrepriseMode === "nouvelle"
    ? (await tx.entreprise.create({ data: data.entreprise })).id
    : data.entrepriseId;

  // 2. Contact (type=prospect, lié à l'entreprise)
  const contact = await tx.contact.create({
    data: {
      ...data.contact,
      type: "prospect",
      entrepriseId,
    },
  });

  // 3. Demande (lié au contact + entreprise, statut nouveau)
  const demande = await tx.demande.create({
    data: {
      ...data.demande,
      statut: "nouveau",
      contactId: contact.id,
      entrepriseId,
    },
  });

  return { demandeId: demande.id, contactId: contact.id, entrepriseId };
});
```

Réponse : `{ demandeId, contactId, entrepriseId, redirectUrl: "/demandes/${demandeId}" }`.

UI : toast succès "Prospect créé : ${nom}" + redirect vers la fiche demande.

### Statut workflow

Le **statut prospect = `Demande.statut`** (réutilise les valeurs existantes, pas de changement de modèle) :

- `nouveau` — créé via ce formulaire (défaut)
- `qualifie` — admin a validé que le prospect est sérieux
- `devis_envoye` — devis créé et envoyé (manuel pour Phase 1, auto IA en Phase 2)
- `accepte` — devis signé → prospect devient client (déclenche Phase 2/3 si implémentées)
- `refuse` — prospect a décliné
- `archive` — abandonné/expiré

La modification du statut se fait sur la fiche `/demandes/[id]` (déjà existant). Pas de nouvelle UI requise.

### Validations

- **Zod schema global** : `prospectCreationSchema` dans `lib/validations/prospect.ts` qui combine :
  - Sub-schema contact (réutilise `lib/validations/contact.ts` filtré)
  - Sub-schema entreprise (réutilise existing)
  - Sub-schema demande (réutilise `lib/validations/demande.ts`)
- Validation **côté client** : React Hook Form + zodResolver, avant submit
- Validation **côté serveur** : `parseBody(req, prospectCreationSchema)` dans le handler
- Erreurs affichées **par section** sous chaque champ

### Composant AI helper (préservé)

L'actuelle `/demandes/nouveau` utilise un endpoint `/api/ai/demande` pour suggérer des libellés, analyser le besoin, etc. Le nouveau formulaire **conserve cette capacité** :
- Bouton "💡 Analyse IA du besoin" à côté du champ "Formation souhaitée"
- Au clic : appel `/api/ai/demande` avec les champs saisis → suggestion affichée
- Optionnel à utiliser (pas bloquant)

---

## Hors scope (Phase 2 et 3 séparées)

- **Phase 2** : devis auto-généré via IA à la conversion prospect → client (statut `accepte`)
- **Phase 3** : questionnaires auto-envoyés à la conversion
- **Modification du statut depuis la liste** : un select sur la liste `/demandes` (déjà géré dans la fiche `/demandes/[id]`)
- **Stagiaire fields** (NSS, RQTH, etc.) : restent sur `/contacts/[id]/modifier` ou via la `FichePreFormationStagiaire` post-signature
- **Refonte des pages `/contacts/nouveau` et `/demandes/nouveau`** : laissées en l'état pour les flows admin avancés
- **Page liste `/prospects`** : pas dans cette Phase, on continue à utiliser `/demandes` (Kanban des demandes en statut prospect)

---

## Critères d'acceptation

- [ ] `npx tsc --noEmit` : 0 erreur
- [ ] `npm test` : tous les tests passent (71 actuels + nouveaux ajoutés)
- [ ] Tests Vitest : `lib/validations/prospect.ts` (schema), `/api/prospects` POST (smoke + transaction rollback en cas d'erreur)
- [ ] Page `/prospects/nouveau` charge, full-width, 2 colonnes desktop / 1 colonne mobile
- [ ] Création réussie : crée Entreprise (si nouvelle) + Contact (type=prospect) + Demande (statut=nouveau) en transaction
- [ ] Création échouée (ex: email contact déjà existant) : aucune entité créée (rollback)
- [ ] Toast succès + redirect vers `/demandes/[id]`
- [ ] Sidebar montre "Nouveau prospect" en tête du groupe CRM
- [ ] Smoke test : créer un prospect avec entreprise nouvelle, vérifier les 3 enregistrements en base via Prisma Studio
- [ ] Smoke test : créer un prospect avec entreprise existante (sélection autocomplete)
- [ ] AI helper "💡 Analyse IA" fonctionne (appel `/api/ai/demande` avec contexte courant)

---

## Risques et mitigations

| Risque | Sévérité | Mitigation |
|--------|----------|------------|
| Fichier `prospects/nouveau/page.tsx` devient un monstre (>800 lignes) comme les pages existantes | Moyenne | Extraire chaque section en sous-composant : `<ContactSection>`, `<EntrepriseSection>`, `<DemandeSection>`, `<BesoinsParticulierssSection>`, `<NotesSection>` dans `app/prospects/nouveau/sections/` |
| Validation Zod globale complexe à composer | Moyenne | Construire `prospectCreationSchema` comme intersection de sub-schemas existants (`z.object().merge()`), tests dédiés |
| Email contact déjà existant (Contact.email unique) → transaction échoue | Moyenne | Détecter en amont via `findUnique` avant transaction, afficher message clair "Ce contact existe déjà — rattacher à un contact existant ?" + option de lier au contact existant au lieu d'en créer un nouveau |
| Confusion utilisateur entre `/prospects/nouveau` (nouveau flow) et `/contacts/nouveau` (ancien flow) | Faible | Sidebar promeut `/prospects/nouveau` en tête CRM ; `/contacts/nouveau` reste mais accessible via "Contacts" → "Nouveau contact" (moins visible) |
| Régression sur PR #100 (refactor besoin) qui doit être merge d'abord | Haute | **Pré-requis** : PR #100 mergée et déployée avant impl Phase 1. Si pas mergée, on rebase. |

---

## Estimation

- **Code** :
  - 1 nouvelle page (~400-500 lignes décomposée en 5 sous-composants ~80-100 lignes chacun)
  - 1 nouveau endpoint API (~80-100 lignes avec transaction Prisma)
  - 1 nouveau Zod schema (~80 lignes en composition)
  - Update sidebar (~5 lignes)
  - Tests Vitest (~150 lignes)
- **Temps** : 6-8h de travail avec tests
- **Risque** : moyen — pas de changement de modèle Prisma, mais composition non-triviale et nouveau parcours UX à valider

---

## Pré-requis avant implémentation

- [ ] **PR #100 (refactor Besoin)** mergée dans main et déployée en prod (le code Phase 1 utilise `Demande`, `prisma.demande`, etc.)
- [ ] Si non merged : rebaser la branche d'implémentation sur main une fois PR #100 mergée

---

## Étapes suivantes

1. ✅ Spec écrite + commitée (ce document)
2. ⏳ Revue utilisateur de la spec
3. ⏳ Invocation `writing-plans` pour produire le plan détaillé
4. ⏳ Implémentation sur branche `feat/prospect-unified-form`
5. ⏳ Tests, PR, review, merge
6. ⏳ Smoke test prod
