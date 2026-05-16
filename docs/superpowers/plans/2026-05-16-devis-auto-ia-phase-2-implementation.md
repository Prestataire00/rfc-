# Phase 2 — Devis auto IA — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Quand admin qualifie une Demande (statut nouveau→qualifie), générer automatiquement un devis brouillon via Claude IA (formation matchée + lignes pré-remplies + objet pro).

**Architecture:** Hook côté PATCH /api/demandes/[id] qui appelle Claude (lib/ai.ts existante) avec prompt structuré + catalogue formations. Parse Zod strict de la réponse JSON. Création Devis + lignes en transaction Prisma + lien Demande.devisId. UI : modal confirm + toast résultat.

**Tech Stack:** Anthropic SDK (déjà installé), Zod, Prisma 5, React Hook Form (UI confirm modal léger), Vitest.

**Spec source:** [`docs/superpowers/specs/2026-05-16-devis-auto-ia-phase-2-design.md`](../specs/2026-05-16-devis-auto-ia-phase-2-design.md)

**Pré-requis:** PR #100 + #101 mergées (commits `d2958f2` + `e016667`). Branche `feat/devis-auto-ai-from-demande` créée depuis main fraîche.

## File structure

**À créer** :
- `lib/validations/ai-devis-output.ts` — Zod schema pour parser la réponse Claude
- `lib/ai/generate-devis-from-demande.ts` — orchestration AI + création Devis
- `tests/lib/ai-devis-output.test.ts` — tests Zod
- `tests/lib/generate-devis-from-demande.test.ts` — tests orchestration (mock askClaude)

**À modifier** :
- `app/api/demandes/[id]/route.ts` — hook PATCH sur transition nouveau→qualifie
- `app/demandes/[id]/page.tsx` — modal confirm + handle response

---

## Task 0: Verify branche

- [ ] **Step 1: Confirmer branche + baseline**

```bash
git branch --show-current
git log --oneline -3
npm test 2>&1 | tail -3
```

Expected: branch=`feat/devis-auto-ai-from-demande`, 81 tests pass post-Phase-1.

---

## Task 1: Zod schema aiDevisOutputSchema (TDD)

**Files:**
- Create: `lib/validations/ai-devis-output.ts`
- Test: `tests/lib/ai-devis-output.test.ts`

- [ ] **Step 1: Tests**

Créer `tests/lib/ai-devis-output.test.ts` :

```typescript
import { describe, it, expect } from "vitest";
import { aiDevisOutputSchema } from "@/lib/validations/ai-devis-output";

describe("aiDevisOutputSchema", () => {
  const valid = {
    formationId: "ckxxx0000000000000000000",
    objet: "Formation SST initiale 14h - 5 stagiaires",
    lignes: [
      { designation: "Formation SST", quantite: 5, prixUnitaire: 350 },
    ],
    rationale: "Match parfait sur la durée demandée et le public cible",
  };

  it("accepte un output valide", () => {
    expect(aiDevisOutputSchema.safeParse(valid).success).toBe(true);
  });

  it("rejette formationId non cuid", () => {
    expect(aiDevisOutputSchema.safeParse({ ...valid, formationId: "not-a-cuid" }).success).toBe(false);
  });

  it("rejette objet trop court", () => {
    expect(aiDevisOutputSchema.safeParse({ ...valid, objet: "x" }).success).toBe(false);
  });

  it("rejette objet trop long", () => {
    expect(aiDevisOutputSchema.safeParse({ ...valid, objet: "x".repeat(201) }).success).toBe(false);
  });

  it("rejette lignes vide", () => {
    expect(aiDevisOutputSchema.safeParse({ ...valid, lignes: [] }).success).toBe(false);
  });

  it("rejette quantite négative", () => {
    expect(aiDevisOutputSchema.safeParse({
      ...valid,
      lignes: [{ designation: "x", quantite: -1, prixUnitaire: 100 }],
    }).success).toBe(false);
  });

  it("rejette prixUnitaire négatif", () => {
    expect(aiDevisOutputSchema.safeParse({
      ...valid,
      lignes: [{ designation: "x", quantite: 1, prixUnitaire: -100 }],
    }).success).toBe(false);
  });

  it("accepte rationale vide", () => {
    expect(aiDevisOutputSchema.safeParse({ ...valid, rationale: "" }).success).toBe(true);
  });
});
```

- [ ] **Step 2: Lancer (fail)**

```bash
npx vitest run tests/lib/ai-devis-output.test.ts 2>&1 | tail -5
```

Expected: FAIL.

- [ ] **Step 3: Implémenter**

Créer `lib/validations/ai-devis-output.ts` :

```typescript
// Schéma Zod pour valider la réponse JSON retournée par Claude lors de la
// génération d'un devis brouillon à partir d'une Demande qualifiée.
// Cf. docs/superpowers/specs/2026-05-16-devis-auto-ia-phase-2-design.md

import { z } from "zod";

export const aiDevisOutputSchema = z.object({
  formationId: z.string().cuid(),
  objet: z.string().min(5).max(200),
  lignes: z
    .array(
      z.object({
        designation: z.string().min(1),
        quantite: z.number().int().positive(),
        prixUnitaire: z.number().nonnegative(),
      }),
    )
    .min(1),
  rationale: z.string().max(500),
});

export type AiDevisOutput = z.infer<typeof aiDevisOutputSchema>;
```

- [ ] **Step 4: Lancer (pass)**

```bash
npx vitest run tests/lib/ai-devis-output.test.ts 2>&1 | tail -5
```

Expected: 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/validations/ai-devis-output.ts tests/lib/ai-devis-output.test.ts
git commit -m "feat(phase-2): Zod schema aiDevisOutputSchema + 8 tests"
```

---

## Task 2: lib/ai/generate-devis-from-demande.ts (TDD)

**Files:**
- Create: `lib/ai/generate-devis-from-demande.ts`
- Test: `tests/lib/generate-devis-from-demande.test.ts`

- [ ] **Step 1: Vérifier l'API existante de askClaude**

```bash
grep -n "export.*askClaude\|export.*checkAIKey" lib/ai.ts | head -5
head -50 lib/ai.ts
```

Note la signature de `askClaude` (params + return type) pour utiliser correctement.

- [ ] **Step 2: Tests**

Créer `tests/lib/generate-devis-from-demande.test.ts` :

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mocks
vi.mock("@/lib/prisma", () => ({
  prisma: {
    demande: { findUnique: vi.fn(), update: vi.fn() },
    formation: { findMany: vi.fn(), findUnique: vi.fn() },
    devis: { findMany: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(),
  },
}));
vi.mock("@/lib/ai", () => ({
  askClaude: vi.fn(),
  checkAIKey: vi.fn(() => true),
}));
vi.mock("@/lib/notifications", () => ({
  notifyAdmins: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/historique", () => ({
  logAction: vi.fn().mockResolvedValue(undefined),
}));

const importGenerate = async () =>
  (await import("@/lib/ai/generate-devis-from-demande")).generateDevisFromDemandeWithAI;
const importMocks = async () => ({
  prisma: (await import("@/lib/prisma")).prisma as any,
  ai: await import("@/lib/ai") as any,
});

const sampleDemande = {
  id: "cuid_demande_1",
  titre: "Formation SST",
  description: "Recyclage SST",
  notes: null,
  nbStagiaires: 5,
  budget: 2000,
  sourceContact: "email",
  entrepriseId: "cuid_ent_1",
  contactId: "cuid_contact_1",
  devisId: null,
  entreprise: { id: "cuid_ent_1", nom: "Acme", secteur: "industrie", effectif: 50, typeEntreprise: "PME" },
  contact: { id: "cuid_contact_1", nom: "Dupont", prenom: "Jean", poste: "RH" },
};
const sampleFormations = [
  { id: "cuid_form_sst", titre: "SST initial", description: "Sauveteur Secouriste Travail", duree: 14, tarif: 350, categorie: "secours", certifiante: true, actif: true },
];

const validAiOutput = JSON.stringify({
  formationId: "cuid_form_sst",
  objet: "Formation SST initiale 14h - 5 stagiaires",
  lignes: [{ designation: "Formation SST 14h", quantite: 5, prixUnitaire: 350 }],
  rationale: "Match parfait",
});

describe("generateDevisFromDemandeWithAI", () => {
  beforeEach(() => vi.clearAllMocks());

  it("crée un devis brouillon quand l'IA retourne un JSON valide", async () => {
    const { prisma, ai } = await importMocks();
    prisma.demande.findUnique.mockResolvedValueOnce(sampleDemande);
    prisma.formation.findMany.mockResolvedValueOnce(sampleFormations);
    prisma.formation.findUnique.mockResolvedValueOnce(sampleFormations[0]);
    prisma.devis.findMany.mockResolvedValueOnce([]);
    ai.askClaude.mockResolvedValueOnce(validAiOutput);
    prisma.$transaction.mockImplementationOnce(async (fn: any) => fn({
      devis: { create: vi.fn().mockResolvedValueOnce({ id: "cuid_devis_new" }) },
      demande: { update: vi.fn().mockResolvedValueOnce({}) },
    }));

    const generate = await importGenerate();
    const result = await generate("cuid_demande_1");
    expect(result).toEqual({ devisId: "cuid_devis_new" });
  });

  it("retourne error si Demande introuvable", async () => {
    const { prisma } = await importMocks();
    prisma.demande.findUnique.mockResolvedValueOnce(null);
    const generate = await importGenerate();
    const result = await generate("cuid_inexistant");
    expect("error" in result).toBe(true);
  });

  it("retourne error si Demande déjà liée à un devis", async () => {
    const { prisma } = await importMocks();
    prisma.demande.findUnique.mockResolvedValueOnce({ ...sampleDemande, devisId: "existing_devis" });
    const generate = await importGenerate();
    const result = await generate("cuid_demande_1");
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error).toContain("déjà");
  });

  it("retourne error si AI retourne JSON malformé", async () => {
    const { prisma, ai } = await importMocks();
    prisma.demande.findUnique.mockResolvedValueOnce(sampleDemande);
    prisma.formation.findMany.mockResolvedValueOnce(sampleFormations);
    ai.askClaude.mockResolvedValueOnce("Pas du JSON {{{ invalid");
    const generate = await importGenerate();
    const result = await generate("cuid_demande_1");
    expect("error" in result).toBe(true);
  });

  it("retourne error si AI retourne un formationId inexistant en base", async () => {
    const { prisma, ai } = await importMocks();
    prisma.demande.findUnique.mockResolvedValueOnce(sampleDemande);
    prisma.formation.findMany.mockResolvedValueOnce(sampleFormations);
    prisma.formation.findUnique.mockResolvedValueOnce(null); // formation introuvable
    ai.askClaude.mockResolvedValueOnce(validAiOutput);
    const generate = await importGenerate();
    const result = await generate("cuid_demande_1");
    expect("error" in result).toBe(true);
  });
});
```

- [ ] **Step 3: Lancer (fail)**

```bash
npx vitest run tests/lib/generate-devis-from-demande.test.ts 2>&1 | tail -5
```

- [ ] **Step 4: Implémenter** `lib/ai/generate-devis-from-demande.ts`

```typescript
// Génération auto d'un devis brouillon via Claude IA à partir d'une Demande.
// Trigger : transition Demande.statut nouveau→qualifie (cf. PATCH /api/demandes/[id]).
// Cf. docs/superpowers/specs/2026-05-16-devis-auto-ia-phase-2-design.md

import { prisma } from "@/lib/prisma";
import { askClaude, checkAIKey } from "@/lib/ai";
import { aiDevisOutputSchema } from "@/lib/validations/ai-devis-output";
import { notifyAdmins } from "@/lib/notifications";
import { logAction } from "@/lib/historique";
import { generateNumero, formatCurrency } from "@/lib/utils";
import { logger } from "@/lib/logger";

export type GenerateResult = { devisId: string } | { error: string };

export async function generateDevisFromDemandeWithAI(
  demandeId: string,
): Promise<GenerateResult> {
  if (!checkAIKey()) {
    return { error: "Clé Anthropic non configurée" };
  }

  const demande = await prisma.demande.findUnique({
    where: { id: demandeId },
    include: {
      entreprise: true,
      contact: true,
    },
  });
  if (!demande) return { error: "Demande introuvable" };
  if (demande.devisId) return { error: "Cette demande est déjà liée à un devis (id " + demande.devisId + ")" };
  if (!demande.entrepriseId) return { error: "La demande n'a pas d'entreprise associée" };

  const formations = await prisma.formation.findMany({
    where: { actif: true },
    select: {
      id: true,
      titre: true,
      description: true,
      duree: true,
      tarif: true,
      categorie: true,
      certifiante: true,
    },
    orderBy: { titre: "asc" },
    take: 20,
  });
  if (formations.length === 0) {
    return { error: "Catalogue de formations vide" };
  }

  const prompt = buildPrompt(demande, formations);

  let rawResponse: string;
  try {
    rawResponse = await askClaude(prompt);
  } catch (err) {
    logger.error("ai.generate-devis.claude-call-failed", err);
    return { error: "Erreur appel IA : " + (err instanceof Error ? err.message : String(err)) };
  }

  // Extraire le JSON de la réponse (Claude met parfois du texte autour)
  const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { error: "Réponse IA sans JSON détectable" };
  }
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(jsonMatch[0]);
  } catch {
    return { error: "JSON IA malformé" };
  }
  const validation = aiDevisOutputSchema.safeParse(parsedJson);
  if (!validation.success) {
    logger.warn("ai.generate-devis.zod-validation-failed", { errors: validation.error.flatten() });
    return { error: "Structure JSON IA invalide" };
  }
  const aiOutput = validation.data;

  // Vérifier que la formation choisie existe vraiment
  const formationOk = await prisma.formation.findUnique({
    where: { id: aiOutput.formationId },
    select: { id: true },
  });
  if (!formationOk) {
    return { error: "L'IA a proposé une formation inexistante (id " + aiOutput.formationId + ")" };
  }

  // Numérotation devis
  const allDevis = await prisma.devis.findMany({ select: { numero: true } });
  const maxNum = allDevis.reduce((m, d) => {
    const n = parseInt(d.numero.split("-").pop() || "0");
    return n > m ? n : m;
  }, 0);
  const numero = generateNumero("DEV", maxNum);

  const montantHT = aiOutput.lignes.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0);
  const tauxTVA = 20;
  const montantTTC = montantHT * (1 + tauxTVA / 100);

  const dateValidite = new Date();
  dateValidite.setDate(dateValidite.getDate() + 30);

  const result = await prisma.$transaction(async (tx) => {
    const devis = await tx.devis.create({
      data: {
        numero,
        objet: aiOutput.objet,
        montantHT,
        tauxTVA,
        montantTTC,
        dateEmission: new Date(),
        dateValidite,
        statut: "brouillon",
        entrepriseId: demande.entrepriseId,
        contactId: demande.contactId,
        notes: `Devis brouillon généré par IA depuis la Demande #${demande.id}.\n\nJustification IA : ${aiOutput.rationale}`,
        lignes: {
          create: aiOutput.lignes.map((l) => ({
            designation: l.designation,
            quantite: l.quantite,
            prixUnitaire: l.prixUnitaire,
            montant: l.quantite * l.prixUnitaire,
          })),
        },
      },
      select: { id: true },
    });
    await tx.demande.update({
      where: { id: demande.id },
      data: { devisId: devis.id, formationId: aiOutput.formationId },
    });
    return { devisId: devis.id };
  });

  // Notif + log (hors transaction)
  const clientLabel = demande.entreprise?.nom || (demande.contact ? `${demande.contact.prenom} ${demande.contact.nom}` : "Client");
  await notifyAdmins({
    titre: "Devis brouillon généré par IA",
    message: `${clientLabel} — ${numero} (${formatCurrency(montantTTC)}) à réviser avant envoi`,
    type: "info",
    lien: `/commercial/devis/${result.devisId}`,
  }).catch((err) => logger.warn("ai.generate-devis.notify-failed", { error: String(err) }));

  await logAction({
    action: "devis_genere_ia",
    label: `Devis ${numero} généré par IA depuis demande #${demande.id}`,
    lien: `/commercial/devis/${result.devisId}`,
    entrepriseId: demande.entrepriseId,
    contactId: demande.contactId ?? undefined,
    devisId: result.devisId,
  }).catch((err) => logger.warn("ai.generate-devis.log-failed", { error: String(err) }));

  return result;
}

function buildPrompt(
  demande: {
    titre: string;
    description: string | null;
    notes: string | null;
    nbStagiaires: number | null;
    budget: number | null;
    sourceContact: string | null;
    entreprise: { nom: string; secteur: string | null; effectif: number | null; typeEntreprise: string | null } | null;
    contact: { nom: string; prenom: string; poste: string | null } | null;
  },
  formations: Array<{ id: string; titre: string; description: string | null; duree: number; tarif: number; categorie: string | null; certifiante: boolean }>,
): string {
  const ent = demande.entreprise;
  const ct = demande.contact;
  const catalogueLines = formations
    .map((f) => `- [${f.id}] ${f.titre} | durée ${f.duree}h | tarif ${f.tarif}€ HT par stagiaire | catégorie ${f.categorie ?? "—"} | ${f.certifiante ? "CERTIFIANTE" : "non certifiante"} | ${(f.description ?? "").slice(0, 200)}`)
    .join("\n");

  return `Tu es un assistant pour un organisme de formation (sécurité, incendie, premiers secours).
Un prospect demande une formation. Voici le contexte :

ENTREPRISE: ${ent?.nom ?? "—"}, secteur ${ent?.secteur ?? "—"}, effectif ${ent?.effectif ?? "—"}, type ${ent?.typeEntreprise ?? "—"}
CONTACT: ${ct ? `${ct.prenom} ${ct.nom}` : "—"}, poste ${ct?.poste ?? "—"}
DEMANDE:
- Titre: ${demande.titre}
- Description: ${demande.description ?? "—"}
- Notes: ${demande.notes ?? "—"}
- Nombre de stagiaires souhaité: ${demande.nbStagiaires ?? "non précisé"}
- Budget envisagé: ${demande.budget ? demande.budget + " € HT" : "non précisé"}
- Source du contact: ${demande.sourceContact ?? "—"}

CATALOGUE DISPONIBLE (${formations.length} formations actives) :
${catalogueLines}

TÂCHE : identifie la meilleure formation du catalogue pour cette demande, et propose un devis structuré.
- Si le nombre de stagiaires n'est pas précisé, utilise 1.
- Si le budget est précisé et incompatible avec le tarif catalogue × nbStagiaires, propose la formation quand même au tarif standard (l'admin négociera).

Retourne UNIQUEMENT un JSON valide avec cette structure (pas de markdown, pas de commentaire, pas de texte autour) :
{
  "formationId": "<id exact de la formation choisie depuis le catalogue>",
  "objet": "<objet professionnel du devis, ex: 'Formation SST initiale 14h - 5 stagiaires'>",
  "lignes": [
    { "designation": "<libellé clair de la ligne>", "quantite": <int positif>, "prixUnitaire": <float HT> }
  ],
  "rationale": "<1-2 phrases expliquant pourquoi cette formation correspond au besoin (max 500 caractères)>"
}`;
}
```

- [ ] **Step 5: Lancer (pass)**

```bash
npx vitest run tests/lib/generate-devis-from-demande.test.ts 2>&1 | tail -5
```

Expected: 5 tests pass.

- [ ] **Step 6: Commit**

```bash
git add lib/ai/generate-devis-from-demande.ts tests/lib/generate-devis-from-demande.test.ts
git commit -m "feat(phase-2): generateDevisFromDemandeWithAI + 5 tests

Orchestre l'appel Claude + parse Zod strict + création Devis brouillon
en transaction. Lie Demande.devisId + Demande.formationId. Notif admin
+ log historique. Gère erreurs (Demande introuvable, déjà lié, JSON
malformé, formationId inexistant)."
```

---

## Task 3: Hook PATCH /api/demandes/[id]

**Files:**
- Modify: `app/api/demandes/[id]/route.ts`

- [ ] **Step 1: Inspecter le PATCH actuel**

```bash
grep -n "PATCH\|statut\|triggerAutomation" app/api/demandes/[id]/route.ts | head -10
```

- [ ] **Step 2: Modifier le PATCH handler**

Dans `app/api/demandes/[id]/route.ts`, après la mise à jour du statut, ajouter :

```typescript
// Hook Phase 2 : génération auto devis IA sur transition nouveau→qualifie
let aiResult: { generated: boolean; devisId?: string; error?: string } | undefined;
if (oldStatut === "nouveau" && newStatut === "qualifie" && !demandeBefore.devisId) {
  const { generateDevisFromDemandeWithAI } = await import("@/lib/ai/generate-devis-from-demande");
  const generation = await generateDevisFromDemandeWithAI(params.id);
  if ("devisId" in generation) {
    aiResult = { generated: true, devisId: generation.devisId };
  } else {
    aiResult = { generated: false, error: generation.error };
  }
}

return NextResponse.json({ ...updatedDemande, ai: aiResult });
```

**IMPORTANT** : adapter à la structure réelle du handler PATCH actuel. Lire `app/api/demandes/[id]/route.ts` d'abord pour comprendre où insérer. Le `demandeBefore` doit être chargé AVANT l'update pour pouvoir comparer le statut.

- [ ] **Step 3: tsc + tests**

```bash
npx tsc --noEmit 2>&1 | tail -3
npm test 2>&1 | tail -3
```

Expected: 0 erreur, tous les tests passent (13 nouveaux + baseline).

- [ ] **Step 4: Commit**

```bash
git add app/api/demandes/[id]/route.ts
git commit -m "feat(phase-2): hook PATCH /api/demandes/[id] — génère devis IA sur transition nouveau→qualifie"
```

---

## Task 4: UI — modal confirm dans la fiche Demande

**Files:**
- Modify: `app/demandes/[id]/page.tsx`

- [ ] **Step 1: Lire la page actuelle pour comprendre le handler de statut**

```bash
grep -n "statut\|setStatut\|handleStatut\|PATCH" app/demandes/[id]/page.tsx | head -15
```

- [ ] **Step 2: Modifier le handler de changement de statut**

Quand le user passe le statut de "nouveau" à "qualifie" :
1. Afficher modal de confirmation : *"Cela va générer un devis brouillon avec l'IA. Continuer ?"*
2. Si user confirme → PATCH (existant)
3. Sur la réponse, lire `data.ai` :
   - Si `ai.generated === true` → toast "Devis brouillon généré : [Voir le devis](/commercial/devis/${ai.devisId})"
   - Si `ai.generated === false` → toast warning "Statut mis à jour, mais l'IA n'a pas pu générer le devis (${ai.error}). Créez-le manuellement."
   - Si `ai === undefined` (transition n'est pas nouveau→qualifie) → toast normal

Utiliser `confirm()` natif (simple) OU un modal React custom si la page utilise déjà ce pattern.

- [ ] **Step 3: tsc + test rapide**

```bash
npx tsc --noEmit 2>&1 | tail -3
npm test 2>&1 | tail -3
```

- [ ] **Step 4: Commit**

```bash
git add app/demandes/[id]/page.tsx
git commit -m "feat(phase-2): UI modal confirm + handle ai response sur changement statut"
```

---

## Task 5: Final verification + PR

- [ ] **Step 1: Final**

```bash
npx tsc --noEmit 2>&1 | tail -3
npm test 2>&1 | tail -5
git log --oneline main..HEAD
```

- [ ] **Step 2: Push + PR**

```bash
git push -u origin feat/devis-auto-ai-from-demande
gh pr create --title "feat(phase-2): devis auto-généré IA à la qualification" --body "$(cat <<'EOF'
## Résumé

Phase 2 : quand admin qualifie un prospect (Demande.statut nouveau→qualifie), Claude IA génère automatiquement un devis brouillon (formation matchée depuis le catalogue, lignes pré-remplies, objet pro). L'admin révise puis envoie.

**Spec** : docs/superpowers/specs/2026-05-16-devis-auto-ia-phase-2-design.md
**Plan** : docs/superpowers/plans/2026-05-16-devis-auto-ia-phase-2-implementation.md

## Changements

- lib/validations/ai-devis-output.ts : Zod schema strict pour parser le JSON Claude
- lib/ai/generate-devis-from-demande.ts : orchestration (charge contexte → prompt → Claude → parse → transaction Prisma)
- app/api/demandes/[id]/route.ts : hook PATCH déclenche la génération
- app/demandes/[id]/page.tsx : modal confirm + handle response (toast lien devis)

## Tests : 8 + 5 = 13 nouveaux

## Hors scope (Phase 3 / futur)

- Auto-envoi fiches pré-formation post-signature (Phase 3 séparée)
- Multi-suggestion (admin voit 1 seule recommandation)
- Auto-envoi devis au client (admin reste maître)

## Pré-requis

- ANTHROPIC_API_KEY configurée en Netlify prod (déjà en place)

🤖 Generated with Claude Code
EOF
)"
```

- [ ] **Step 3: Attendre CI**

```bash
until gh pr checks $(gh pr view --json number --jq .number) 2>&1 | grep -qE "Vitest\s+(pass|fail)"; do sleep 20; done
gh pr checks $(gh pr view --json number --jq .number) 2>&1 | grep -E "Vitest|CodeRabbit|netlify/projetrfc/deploy-preview"
```

## Self-Review

- ✅ Spec coverage : tous éléments (trigger, flow, fichiers, tests) sont couverts par les 5 tasks
- ✅ No placeholders : aucun TBD
- ✅ Type consistency : `AiDevisOutput`, `aiDevisOutputSchema`, `generateDevisFromDemandeWithAI` cohérents

## Risques

- L'API exacte d'`askClaude` n'est pas inspectée ici — Task 2 Step 1 demande de la vérifier avant impl. Si signature différente du prompt simple, adapter.
- Le PATCH handler de `/api/demandes/[id]` n'est pas inspecté précisément ici — Task 3 Step 2 demande de le lire d'abord.
