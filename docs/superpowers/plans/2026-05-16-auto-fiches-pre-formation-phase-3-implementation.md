# Phase 3 — Auto fiches pré-formation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan.

**Goal:** À la signature électronique d'un devis : auto-créer une Session brouillon + auto-envoyer FichePreFormationEntreprise. À l'inscription d'un stagiaire sur une session liée à un devis signé : auto-envoyer FichePreFormationStagiaire.

**Architecture:** 1 nouveau module `lib/automations/auto-fiches-pre-formation.ts` avec 2 fonctions exportées (idempotentes). Hook fire-and-forget dans `lib/signatures/devis-sync.ts` (trigger devis_signed) + hook dans la route inscription (trigger inscription créée).

**Tech Stack:** Prisma 5 (transaction), Nodemailer via `lib/email.ts`, Vitest avec mocks.

**Spec:** [`docs/superpowers/specs/2026-05-16-auto-fiches-pre-formation-phase-3-design.md`](../specs/2026-05-16-auto-fiches-pre-formation-phase-3-design.md)

**Pré-requis:** PR #102 (Phase 2) mergée (commit présent dans main). Branche `feat/auto-fiches-pre-formation` créée depuis main fraîche.

## File structure

**À créer** :
- `lib/automations/auto-fiches-pre-formation.ts` — orchestration (2 fonctions exportées)
- `tests/lib/auto-fiches-pre-formation.test.ts` — tests

**À modifier** :
- `lib/signatures/devis-sync.ts` — hook trigger devis_signed
- `app/api/sessions/[id]/inscriptions/route.ts` — hook création Inscription

---

## Task 0: Verify branche + inspecter pré-requis

- [ ] **Step 1: Confirmer branche + baseline**

```bash
git branch --show-current
npm test 2>&1 | tail -3
```

Expected: `feat/auto-fiches-pre-formation`, 94 tests pass.

- [ ] **Step 2: Inspecter les modèles et fonctions existantes**

```bash
# Modèle FichePreFormationEntreprise — tokenAcces existe ?
grep -A20 "^model FichePreFormationEntreprise " prisma/schema.prisma | head -25
# Modèle FichePreFormationStagiaire
grep -A20 "^model FichePreFormationStagiaire " prisma/schema.prisma | head -25
# Modèle Inscription — existe ? structure ?
grep -A15 "^model Inscription " prisma/schema.prisma
# Modèle Devis — relation inverse vers Demande ?
grep -B2 -A5 "demande.*Demande\|Demande.*@relation.*Devis" prisma/schema.prisma | head -10
# Fonctions email
grep -n "fichePreFormationEntrepriseEmail\|fichePreFormationStagiaireEmail" lib/email.ts | head -5
# Route inscriptions
ls app/api/sessions/\[id\]/inscriptions/ 2>/dev/null
grep -n "POST\|create.*inscription" app/api/sessions/\[id\]/inscriptions/route.ts 2>/dev/null | head -5
```

Documenter dans le rapport implementer toute différence entre la spec et la réalité (noms de champs, relations manquantes, etc.).

---

## Task 1: Module `auto-fiches-pre-formation.ts` (TDD)

**Files:**
- Create: `lib/automations/auto-fiches-pre-formation.ts`
- Test: `tests/lib/auto-fiches-pre-formation.test.ts`

- [ ] **Step 1: Tests**

Créer `tests/lib/auto-fiches-pre-formation.test.ts` :

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    devis: { findUnique: vi.fn() },
    demande: { findFirst: vi.fn(), findUnique: vi.fn() },
    session: { findFirst: vi.fn(), create: vi.fn() },
    inscription: { findUnique: vi.fn() },
    fichePreFormationEntreprise: { findFirst: vi.fn(), create: vi.fn() },
    fichePreFormationStagiaire: { findFirst: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(),
  },
}));
vi.mock("@/lib/email", () => ({
  fichePreFormationEntrepriseEmail: vi.fn().mockResolvedValue(undefined),
  fichePreFormationStagiaireEmail: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/notifications", () => ({
  notifyAdmins: vi.fn().mockResolvedValue(undefined),
}));

const importModule = async () => await import("@/lib/automations/auto-fiches-pre-formation");
const importMocks = async () => ({
  prisma: (await import("@/lib/prisma")).prisma as any,
  email: (await import("@/lib/email")) as any,
  notif: (await import("@/lib/notifications")) as any,
});

describe("autoCreateSessionAndFicheEntrepriseOnDevisSigned", () => {
  beforeEach(() => vi.clearAllMocks());

  it("skipped si Devis introuvable", async () => {
    const { prisma } = await importMocks();
    prisma.devis.findUnique.mockResolvedValueOnce(null);
    const { autoCreateSessionAndFicheEntrepriseOnDevisSigned } = await importModule();
    const res = await autoCreateSessionAndFicheEntrepriseOnDevisSigned("cuid_inexistant");
    expect("error" in res).toBe(true);
  });

  it("skipped (notif) si Demande sans formationId", async () => {
    const { prisma, notif } = await importMocks();
    prisma.devis.findUnique.mockResolvedValueOnce({
      id: "d1", numero: "DEV-001", entrepriseId: "e1", contactId: "c1",
      entreprise: { nom: "Acme" },
      contact: { email: "j@acme.com", nom: "Dupont", prenom: "Jean" },
    });
    prisma.demande.findFirst.mockResolvedValueOnce({
      id: "dem1", formationId: null, nbStagiaires: 5,
    });
    const { autoCreateSessionAndFicheEntrepriseOnDevisSigned } = await importModule();
    const res = await autoCreateSessionAndFicheEntrepriseOnDevisSigned("d1");
    expect("skipped" in res || ("error" in res && res.error.includes("formation"))).toBe(true);
    expect(notif.notifyAdmins).toHaveBeenCalled();
  });

  it("idempotent : skipped si session auto déjà existante pour ce devis", async () => {
    const { prisma } = await importMocks();
    prisma.devis.findUnique.mockResolvedValueOnce({
      id: "d1", numero: "DEV-001", entrepriseId: "e1", contactId: "c1",
      entreprise: { nom: "Acme" },
      contact: { email: "j@acme.com", nom: "Dupont", prenom: "Jean" },
    });
    prisma.demande.findFirst.mockResolvedValueOnce({
      id: "dem1", formationId: "f1", nbStagiaires: 5,
    });
    prisma.session.findFirst.mockResolvedValueOnce({ id: "existing_session" });
    const { autoCreateSessionAndFicheEntrepriseOnDevisSigned } = await importModule();
    const res = await autoCreateSessionAndFicheEntrepriseOnDevisSigned("d1");
    expect("skipped" in res).toBe(true);
  });

  it("cas nominal : crée session + fiche entreprise + envoie email", async () => {
    const { prisma, email } = await importMocks();
    prisma.devis.findUnique.mockResolvedValueOnce({
      id: "d1", numero: "DEV-001", entrepriseId: "e1", contactId: "c1",
      entreprise: { nom: "Acme" },
      contact: { email: "j@acme.com", nom: "Dupont", prenom: "Jean" },
    });
    prisma.demande.findFirst.mockResolvedValueOnce({
      id: "dem1", formationId: "f1", nbStagiaires: 5,
    });
    prisma.session.findFirst.mockResolvedValueOnce(null); // pas de session existante
    prisma.$transaction.mockImplementationOnce(async (fn: any) => fn({
      session: { create: vi.fn().mockResolvedValueOnce({ id: "sess_new" }) },
      fichePreFormationEntreprise: { create: vi.fn().mockResolvedValueOnce({ id: "fiche_new", tokenAcces: "tok_abc" }) },
    }));
    const { autoCreateSessionAndFicheEntrepriseOnDevisSigned } = await importModule();
    const res = await autoCreateSessionAndFicheEntrepriseOnDevisSigned("d1");
    expect(res).toEqual({ sessionId: "sess_new", ficheEntrepriseId: "fiche_new" });
    expect(email.fichePreFormationEntrepriseEmail).toHaveBeenCalled();
  });
});

describe("autoCreateFicheStagiaireOnInscription", () => {
  beforeEach(() => vi.clearAllMocks());

  it("skipped si Inscription introuvable", async () => {
    const { prisma } = await importMocks();
    prisma.inscription.findUnique.mockResolvedValueOnce(null);
    const { autoCreateFicheStagiaireOnInscription } = await importModule();
    const res = await autoCreateFicheStagiaireOnInscription("inscr_inexistant");
    expect("error" in res).toBe(true);
  });

  it("skipped si session pas liée à un devis signé", async () => {
    const { prisma } = await importMocks();
    prisma.inscription.findUnique.mockResolvedValueOnce({
      id: "i1", sessionId: "s1", contactId: "c1",
      session: { id: "s1", notes: "session manuelle, pas de devis" },
      contact: { email: "stag@test.com", nom: "Stag", prenom: "Aire" },
    });
    prisma.demande.findFirst.mockResolvedValueOnce(null); // pas de demande liée
    const { autoCreateFicheStagiaireOnInscription } = await importModule();
    const res = await autoCreateFicheStagiaireOnInscription("i1");
    expect("skipped" in res).toBe(true);
  });

  it("idempotent : skipped si fiche existe déjà pour ce contact+session", async () => {
    const { prisma } = await importMocks();
    prisma.inscription.findUnique.mockResolvedValueOnce({
      id: "i1", sessionId: "s1", contactId: "c1",
      session: { id: "s1" },
      contact: { email: "stag@test.com", nom: "Stag", prenom: "Aire" },
    });
    prisma.demande.findFirst.mockResolvedValueOnce({ id: "dem1", devis: { statut: "signe" } });
    prisma.fichePreFormationStagiaire.findFirst.mockResolvedValueOnce({ id: "existing_fiche" });
    const { autoCreateFicheStagiaireOnInscription } = await importModule();
    const res = await autoCreateFicheStagiaireOnInscription("i1");
    expect("skipped" in res).toBe(true);
  });

  it("cas nominal : crée fiche stagiaire + envoie email", async () => {
    const { prisma, email } = await importMocks();
    prisma.inscription.findUnique.mockResolvedValueOnce({
      id: "i1", sessionId: "s1", contactId: "c1",
      session: { id: "s1" },
      contact: { email: "stag@test.com", nom: "Stag", prenom: "Aire" },
    });
    prisma.demande.findFirst.mockResolvedValueOnce({ id: "dem1", devis: { statut: "signe" } });
    prisma.fichePreFormationStagiaire.findFirst.mockResolvedValueOnce(null);
    prisma.fichePreFormationStagiaire.create.mockResolvedValueOnce({ id: "fiche_stag_new", tokenAcces: "tok_xyz" });
    const { autoCreateFicheStagiaireOnInscription } = await importModule();
    const res = await autoCreateFicheStagiaireOnInscription("i1");
    expect(res).toEqual({ ficheStagiaireId: "fiche_stag_new" });
    expect(email.fichePreFormationStagiaireEmail).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Lancer tests (fail)**

```bash
npx vitest run tests/lib/auto-fiches-pre-formation.test.ts 2>&1 | tail -10
```

- [ ] **Step 3: Implémenter le module**

Créer `lib/automations/auto-fiches-pre-formation.ts`. **IMPORTANT** : inspecter d'abord les vrais noms de champs (Task 0 step 2) et adapter le code. La signature attendue :

```typescript
// Hook Phase 3 (cf. docs/superpowers/specs/2026-05-16-auto-fiches-pre-formation-phase-3-design.md)
import { prisma } from "@/lib/prisma";
import { fichePreFormationEntrepriseEmail, fichePreFormationStagiaireEmail } from "@/lib/email";
import { notifyAdmins } from "@/lib/notifications";
import { logger } from "@/lib/logger";
import { randomUUID } from "crypto";

export type AutoResult<T> = T | { error: string; skipped?: boolean };

/**
 * À la signature électronique d'un devis : crée session brouillon + fiche entreprise + email.
 * Idempotent : si une session a déjà été créée auto pour ce devis, skip.
 */
export async function autoCreateSessionAndFicheEntrepriseOnDevisSigned(
  devisId: string,
): Promise<AutoResult<{ sessionId: string; ficheEntrepriseId: string }>> {
  const devis = await prisma.devis.findUnique({
    where: { id: devisId },
    include: {
      entreprise: true,
      contact: true,
    },
  });
  if (!devis) return { error: "Devis introuvable: " + devisId };
  if (!devis.entrepriseId) return { error: "Devis sans entreprise: " + devisId };

  // Demande liée (via Demande.devisId)
  const demande = await prisma.demande.findFirst({
    where: { devisId: devis.id },
  });
  if (!demande) {
    // Devis créé manuellement, pas issu d'un prospect — skip silencieusement
    return { error: "Pas de Demande liée à ce devis", skipped: true };
  }

  if (!demande.formationId) {
    await notifyAdmins({
      titre: "Devis signé sans formation matchée",
      message: `${devis.entreprise?.nom ?? "Client"} a signé ${devis.numero} mais la Demande #${demande.id} n'a pas de formationId. Créez la session manuellement.`,
      type: "warning",
      lien: `/commercial/devis/${devis.id}`,
    }).catch((err) => logger.warn("phase-3.notif-no-formation-failed", { error: String(err) }));
    return { error: "Demande sans formationId — notif admin envoyée", skipped: true };
  }

  // Idempotence : check si une session avec marker "auto-créée pour devis X" existe déjà
  const sessionMarker = `phase3:devis:${devis.id}`;
  const existingSession = await prisma.session.findFirst({
    where: { notes: { contains: sessionMarker } },
    select: { id: true },
  });
  if (existingSession) {
    return { error: "Session déjà auto-créée pour ce devis: " + existingSession.id, skipped: true };
  }

  // Création session brouillon + fiche entreprise en transaction
  const dateDebut = new Date();
  dateDebut.setDate(dateDebut.getDate() + 30);
  const dateFin = new Date(dateDebut);

  const tokenAcces = randomUUID();

  const result = await prisma.$transaction(async (tx) => {
    const session = await tx.session.create({
      data: {
        formationId: demande.formationId!,
        dateDebut,
        dateFin,
        lieu: null,
        capaciteMax: demande.nbStagiaires ?? 1,
        statut: "planifiee",
        notes: `[${sessionMarker}] Session brouillon créée auto à la signature du devis ${devis.numero}. À compléter (dates/lieu/formateur) + ajouter les stagiaires.`,
      },
      select: { id: true },
    });

    const fiche = await tx.fichePreFormationEntreprise.create({
      data: {
        sessionId: session.id,
        entrepriseId: devis.entrepriseId,
        tokenAcces,
        statut: "envoye",
        dateEnvoi: new Date(),
        destinataireNom: devis.contact ? `${devis.contact.prenom} ${devis.contact.nom}` : null,
        destinataireEmail: devis.contact?.email ?? null,
      },
      select: { id: true, tokenAcces: true },
    });

    return { sessionId: session.id, ficheEntrepriseId: fiche.id, tokenAcces: fiche.tokenAcces };
  });

  // Email (hors transaction)
  if (devis.contact?.email) {
    await fichePreFormationEntrepriseEmail({
      to: devis.contact.email,
      destinataireNom: devis.contact ? `${devis.contact.prenom} ${devis.contact.nom}` : "",
      entrepriseNom: devis.entreprise?.nom ?? "",
      tokenAcces: result.tokenAcces,
    }).catch((err) => logger.warn("phase-3.email-entreprise-failed", { error: String(err) }));
  }

  // Notif admin
  await notifyAdmins({
    titre: "Devis signé — session brouillon créée",
    message: `Devis ${devis.numero} signé. Session brouillon + fiche entreprise envoyée. Complétez la session (dates/lieu/formateur) + ajoutez les stagiaires.`,
    type: "success",
    lien: `/sessions/${result.sessionId}`,
  }).catch((err) => logger.warn("phase-3.notif-success-failed", { error: String(err) }));

  return { sessionId: result.sessionId, ficheEntrepriseId: result.ficheEntrepriseId };
}

/**
 * À l'inscription d'un stagiaire sur une session : si la session est liée à un devis signé,
 * crée FichePreFormationStagiaire pour ce stagiaire + email.
 */
export async function autoCreateFicheStagiaireOnInscription(
  inscriptionId: string,
): Promise<AutoResult<{ ficheStagiaireId: string }>> {
  const inscription = await prisma.inscription.findUnique({
    where: { id: inscriptionId },
    include: {
      session: true,
      contact: true,
    },
  });
  if (!inscription) return { error: "Inscription introuvable: " + inscriptionId };
  if (!inscription.contact?.email) {
    return { error: "Contact sans email — pas d'envoi possible", skipped: true };
  }

  // Vérifier que la session est liée à un devis signé via Demande
  const demande = await prisma.demande.findFirst({
    where: {
      formationId: inscription.session.formationId,
      // Heuristique : trouver une Demande dont le devis est signé.
      // Limite : si plusieurs demandes pointent sur la même formation, on prend la première trouvée
      devisId: { not: null },
    },
    include: { devis: true },
    orderBy: { updatedAt: "desc" },
  });
  if (!demande || demande.devis?.statut !== "signe") {
    return { error: "Session pas liée à un devis signé", skipped: true };
  }

  // Idempotence : fiche déjà existante pour ce contact+session ?
  const existing = await prisma.fichePreFormationStagiaire.findFirst({
    where: { sessionId: inscription.sessionId, contactId: inscription.contactId },
    select: { id: true },
  });
  if (existing) {
    return { error: "Fiche stagiaire déjà existante: " + existing.id, skipped: true };
  }

  const tokenAcces = randomUUID();
  const fiche = await prisma.fichePreFormationStagiaire.create({
    data: {
      sessionId: inscription.sessionId,
      contactId: inscription.contactId,
      tokenAcces,
      statut: "envoye",
      dateEnvoi: new Date(),
    },
    select: { id: true, tokenAcces: true },
  });

  await fichePreFormationStagiaireEmail({
    to: inscription.contact.email,
    nom: inscription.contact.nom,
    prenom: inscription.contact.prenom,
    tokenAcces: fiche.tokenAcces,
  }).catch((err) => logger.warn("phase-3.email-stagiaire-failed", { error: String(err) }));

  return { ficheStagiaireId: fiche.id };
}
```

**IMPORTANT** : adapter les signatures des fonctions email (`fichePreFormationEntrepriseEmail`, `fichePreFormationStagiaireEmail`) au vrai contrat de `lib/email.ts`. Vérifier en lisant le fichier.

- [ ] **Step 4: Lancer tests (pass)**

```bash
npx vitest run tests/lib/auto-fiches-pre-formation.test.ts 2>&1 | tail -5
```

Expected: 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/automations/auto-fiches-pre-formation.ts tests/lib/auto-fiches-pre-formation.test.ts
git commit -m "feat(phase-3): module auto-fiches-pre-formation + 8 tests

2 fonctions exportées :
- autoCreateSessionAndFicheEntrepriseOnDevisSigned (idempotent via marker dans notes)
- autoCreateFicheStagiaireOnInscription (idempotent via check existing)

Gère cas Devis sans Demande, Demande sans formationId (notif admin),
contact sans email. Fire-and-forget côté callers (errors loggées)."
```

---

## Task 2: Hook dans `lib/signatures/devis-sync.ts`

**Files:**
- Modify: `lib/signatures/devis-sync.ts`

- [ ] **Step 1: Lire le fichier actuel**

```bash
cat lib/signatures/devis-sync.ts
```

- [ ] **Step 2: Ajouter l'appel à `autoCreateSessionAndFicheEntrepriseOnDevisSigned`**

Après le bloc `triggerAutomation("devis_signed", ...)` (ou en fin de fonction `syncDevisOnSignature`), ajouter :

```typescript
// Phase 3 : auto-création session brouillon + fiche entreprise + email
import("@/lib/automations/auto-fiches-pre-formation")
  .then(({ autoCreateSessionAndFicheEntrepriseOnDevisSigned }) =>
    autoCreateSessionAndFicheEntrepriseOnDevisSigned(devisId).catch((err) =>
      logger.warn("phase-3.auto-session-fiche-failed", { error: String(err) }),
    ),
  )
  .catch((err) => logger.warn("phase-3.import-failed", { error: String(err) }));
```

Fire-and-forget : ne pas await pour ne pas bloquer la finalisation de la signature.

- [ ] **Step 3: tsc + tests**

```bash
npx tsc --noEmit 2>&1 | tail -3
npm test 2>&1 | tail -3
```

- [ ] **Step 4: Commit**

```bash
git add lib/signatures/devis-sync.ts
git commit -m "feat(phase-3): hook devis-sync — auto-création session + fiche entreprise"
```

---

## Task 3: Hook dans route inscription

**Files:**
- Modify: `app/api/sessions/[id]/inscriptions/route.ts`

- [ ] **Step 1: Lire le fichier actuel**

```bash
cat app/api/sessions/\[id\]/inscriptions/route.ts
```

- [ ] **Step 2: Ajouter l'appel à `autoCreateFicheStagiaireOnInscription`**

Après la création d'une `Inscription` (le `prisma.inscription.create(...)`), ajouter :

```typescript
// Phase 3 : auto-création fiche stagiaire si session liée à devis signé
import("@/lib/automations/auto-fiches-pre-formation")
  .then(({ autoCreateFicheStagiaireOnInscription }) =>
    autoCreateFicheStagiaireOnInscription(inscription.id).catch((err) =>
      logger.warn("phase-3.auto-fiche-stagiaire-failed", { error: String(err) }),
    ),
  )
  .catch((err) => logger.warn("phase-3.import-failed", { error: String(err) }));
```

Fire-and-forget.

**IMPORTANT** : peut-être que `route.ts` ne crée pas directement les inscriptions (peut passer par `/api/inscriptions` ou autre). Vérifier la route exacte qui POST les inscriptions et adapter.

- [ ] **Step 3: tsc + tests**

```bash
npx tsc --noEmit 2>&1 | tail -3
npm test 2>&1 | tail -3
```

- [ ] **Step 4: Commit**

```bash
git add app/api/sessions/\[id\]/inscriptions/route.ts
git commit -m "feat(phase-3): hook création inscription — auto-fiche stagiaire si devis signé"
```

---

## Task 4: Final verification + PR

- [ ] **Step 1: Verification**

```bash
npx tsc --noEmit 2>&1 | tail -3
npm test 2>&1 | tail -5
git log --oneline main..HEAD
```

Expected: tsc 0, 94+8=102 tests pass.

- [ ] **Step 2: Push + PR**

```bash
git push -u origin feat/auto-fiches-pre-formation
gh pr create --title "feat(phase-3): auto-envoi fiches pré-formation à la signature devis" --body "$(cat <<'EOF'
## Résumé

**Phase 3** : automatise l'envoi des fiches Qualiopi pré-formation lors de la signature électronique d'un devis.

- À la signature du devis : auto-création Session brouillon + FichePreFormationEntreprise + email au contact décideur
- À l'ajout d'un stagiaire à une session liée à un devis signé : auto-création FichePreFormationStagiaire + email

**Spec** : docs/superpowers/specs/2026-05-16-auto-fiches-pre-formation-phase-3-design.md
**Plan** : docs/superpowers/plans/2026-05-16-auto-fiches-pre-formation-phase-3-implementation.md

## Changements

- lib/automations/auto-fiches-pre-formation.ts : 2 fonctions exportées idempotentes
- lib/signatures/devis-sync.ts : hook devis_signed (fire-and-forget)
- app/api/sessions/[id]/inscriptions/route.ts : hook création inscription (fire-and-forget)
- tests/lib/auto-fiches-pre-formation.test.ts : 8 tests (4 cas par fonction)

## Idempotence

- Session : marker `[phase3:devis:X]` dans `Session.notes` → re-fire ne crée pas de doublon
- Fiche entreprise : Devis.entrepriseId + session marker = clé unique de fait
- Fiche stagiaire : findFirst sur (sessionId, contactId) avant create

## Cas gérés

- Devis sans Demande liée (créé manuellement hors flow Phase 1-2) → skip silencieux
- Demande sans formationId (cas legacy) → skip + notif admin
- Contact sans email → skip
- Re-fire via cron retry (PR #95 signature-retry-finalization) → idempotent

## Hors scope

- Devis signés offline (papier scanné) → bouton manuel existant
- Rappels J+7 si fiche non remplie
- Configuration admin on/off par client

## Vérifications

- [x] npm test : 102/102
- [x] npx tsc --noEmit : 0 erreur
- [ ] Smoke test preview : signer un devis → vérifier session brouillon + fiche entreprise envoyée + email reçu

🤖 Generated with Claude Code
EOF
)"
```

- [ ] **Step 3: Attendre CI**

## Self-Review

- ✅ Spec coverage : tous les éléments de la spec sont couverts par tasks
- ✅ No placeholders
- ✅ Type consistency

## Risques

- L'exact signature de `fichePreFormationEntrepriseEmail` / `fichePreFormationStagiaireEmail` peut différer du plan — Task 1 Step 3 demande d'adapter
- La structure de `app/api/sessions/[id]/inscriptions/route.ts` peut différer — Task 3 demande de lire le fichier d'abord
- Le modèle Inscription peut ne pas avoir tous les champs attendus — Task 0 step 2 audit
