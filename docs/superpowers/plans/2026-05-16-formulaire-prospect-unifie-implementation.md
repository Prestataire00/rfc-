# Formulaire prospect unifié — Phase 1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Créer une page `/prospects/nouveau` qui capture en une fois Contact + Entreprise (existante OU nouvelle) + Demande + Besoins particuliers + Notes, et persiste en transaction Prisma.

**Architecture:** 1 page Next.js full-width 2-cols, décomposée en 5 sous-composants section, alimentée par 1 endpoint API en transaction Prisma. Réutilise les modèles Prisma existants (`Demande`, `Contact`, `Entreprise`) — pas de migration.

**Tech Stack:** Next.js 14 App Router, TypeScript strict, React Hook Form + Zod, Prisma 5 (transaction), Vitest.

**Spec source:** [`docs/superpowers/specs/2026-05-16-formulaire-prospect-unifie-design.md`](../specs/2026-05-16-formulaire-prospect-unifie-design.md)

**Pré-requis:** PR #100 (refactor besoin) mergée dans main. L'impl utilise `prisma.demande`, `prisma.fichePreFormation*` etc. Si pas mergée → rebase la branche.

## File structure

**À créer** :
- `lib/validations/prospect.ts` — Zod schema unifié (compose contact + entreprise + demande)
- `app/api/prospects/route.ts` — POST endpoint, transaction Prisma
- `app/prospects/nouveau/page.tsx` — page principale full-width 2-cols
- `app/prospects/nouveau/sections/ContactSection.tsx` — section 1
- `app/prospects/nouveau/sections/EntrepriseSection.tsx` — section 2 (toggle existante/nouvelle + autocomplete)
- `app/prospects/nouveau/sections/DemandeSection.tsx` — section 3 (avec bouton AI helper)
- `app/prospects/nouveau/sections/BesoinsParticulierssSection.tsx` — section 4
- `app/prospects/nouveau/sections/NotesSection.tsx` — section 5
- `tests/lib/prospect-validation.test.ts` — tests Zod
- `tests/api/prospects.test.ts` — tests API (smoke + rollback)

**À modifier** :
- `middleware.ts` — `/prospects` + `/api/prospects` ajoutés
- `components/layout/Sidebar.tsx` — "Nouveau prospect" en tête du groupe CRM

---

## Task 0: Setup branche + pré-requis

**Files:** (aucun, opérations git)

- [ ] **Step 1: Vérifier que PR #100 est mergée**

```bash
gh pr view 100 --json state
```

Expected: `{"state":"MERGED"}`. Si `"OPEN"` → STOP, merger PR #100 d'abord (refactor besoin).

- [ ] **Step 2: Switch sur main + pull**

```bash
git checkout main
git pull --ff-only
git log --oneline -5
```

Expected: les commits de PR #100 visibles (squash merge `refactor: rename Besoin* → Demande...`).

- [ ] **Step 3: Créer la branche feature**

```bash
git checkout -b feat/prospect-unified-form
```

- [ ] **Step 4: Baseline tests + tsc**

```bash
npm test 2>&1 | tail -3
npx tsc --noEmit 2>&1 | tail -3
```

Expected: 71 tests pass (post-refactor besoin), 0 erreur tsc.

---

## Task 1: Validation Zod unifiée (TDD)

**Files:**
- Create: `lib/validations/prospect.ts`
- Test: `tests/lib/prospect-validation.test.ts`

- [ ] **Step 1: Écrire les tests Zod**

Créer `tests/lib/prospect-validation.test.ts` :

```typescript
import { describe, it, expect } from "vitest";
import { prospectCreationSchema } from "@/lib/validations/prospect";

describe("prospectCreationSchema", () => {
  const validPayload = {
    contact: {
      prenom: "Jean",
      nom: "Dupont",
      email: "jean.dupont@example.com",
      telephone: "0612345678",
      poste: "Responsable formation",
    },
    entrepriseMode: "nouvelle" as const,
    entrepriseNouvelle: {
      nom: "Acme Corp",
      siret: "12345678901234",
      adresse: "1 rue de la Paix",
      codePostal: "75001",
      ville: "Paris",
      secteur: "tertiaire",
      effectif: 50,
    },
    demande: {
      origine: "client" as const,
      sourceContact: "email",
      formationSouhaitee: "Formation SST initial",
      nbStagiaires: 5,
      datesSouhaitees: "courant juin 2026",
      budgetEnvisage: 3000,
      modeFinancement: "opco",
    },
    besoinsParticuliers: {
      handicapContraintes: "",
      materielSurPlace: "",
    },
    notesInternes: "",
  };

  it("accepte un payload valide avec entreprise nouvelle", () => {
    const result = prospectCreationSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("accepte un payload avec entreprise existante", () => {
    const payload = {
      ...validPayload,
      entrepriseMode: "existante" as const,
      entrepriseId: "cuid_existant_xxx",
      entrepriseNouvelle: undefined,
    };
    const result = prospectCreationSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("rejette si entrepriseMode=nouvelle sans entrepriseNouvelle.nom", () => {
    const payload = {
      ...validPayload,
      entrepriseNouvelle: { ...validPayload.entrepriseNouvelle, nom: "" },
    };
    const result = prospectCreationSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it("rejette si entrepriseMode=existante sans entrepriseId", () => {
    const payload = {
      ...validPayload,
      entrepriseMode: "existante" as const,
      entrepriseId: undefined,
      entrepriseNouvelle: undefined,
    };
    const result = prospectCreationSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it("rejette un email contact invalide", () => {
    const payload = {
      ...validPayload,
      contact: { ...validPayload.contact, email: "pas-un-email" },
    };
    const result = prospectCreationSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it("rejette si formationSouhaitee est vide", () => {
    const payload = {
      ...validPayload,
      demande: { ...validPayload.demande, formationSouhaitee: "" },
    };
    const result = prospectCreationSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });

  it("accepte un payload minimal (champs optionnels omis)", () => {
    const payload = {
      contact: {
        prenom: "Jean",
        nom: "Dupont",
        email: "jean@test.com",
      },
      entrepriseMode: "nouvelle" as const,
      entrepriseNouvelle: { nom: "Test SARL" },
      demande: {
        origine: "client" as const,
        formationSouhaitee: "SST",
      },
    };
    const result = prospectCreationSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: Lancer les tests (doivent fail — fichier inexistant)**

```bash
npx vitest run tests/lib/prospect-validation.test.ts 2>&1 | tail -10
```

Expected: FAIL "Cannot find module '@/lib/validations/prospect'".

- [ ] **Step 3: Implémenter le schema**

Créer `lib/validations/prospect.ts` :

```typescript
// Schéma Zod pour la création unifiée d'un prospect (Contact + Entreprise + Demande).
// Composé à partir des champs métier minimaux des 3 entités existantes.
// Cf. docs/superpowers/specs/2026-05-16-formulaire-prospect-unifie-design.md

import { z } from "zod";

const contactSchema = z.object({
  prenom: z.string().min(1, "Prénom requis"),
  nom: z.string().min(1, "Nom requis"),
  email: z.string().email("Email invalide"),
  telephone: z.string().optional(),
  poste: z.string().optional(),
});

const entrepriseNouvelleSchema = z.object({
  nom: z.string().min(1, "Raison sociale requise"),
  siret: z.string().regex(/^\d{14}$/, "SIRET = 14 chiffres").optional().or(z.literal("")),
  adresse: z.string().optional(),
  codePostal: z.string().optional(),
  ville: z.string().optional(),
  secteur: z.string().optional(),
  effectif: z.coerce.number().int().nonnegative().optional(),
});

const demandeSchema = z.object({
  origine: z.enum(["client", "stagiaire", "centre", "prospection"]),
  sourceContact: z.string().optional(),
  formationSouhaitee: z.string().min(1, "Formation souhaitée requise"),
  nbStagiaires: z.coerce.number().int().positive().optional(),
  datesSouhaitees: z.string().optional(),
  budgetEnvisage: z.coerce.number().nonnegative().optional(),
  modeFinancement: z.enum(["opco", "cpf", "entreprise", "personnel", "mixte", "a_definir"]).optional(),
});

const besoinsParticulierssSchema = z.object({
  handicapContraintes: z.string().optional(),
  materielSurPlace: z.string().optional(),
});

export const prospectCreationSchema = z
  .object({
    contact: contactSchema,
    entrepriseMode: z.enum(["nouvelle", "existante"]),
    entrepriseId: z.string().cuid().optional(),
    entrepriseNouvelle: entrepriseNouvelleSchema.optional(),
    demande: demandeSchema,
    besoinsParticuliers: besoinsParticulierssSchema.optional(),
    notesInternes: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.entrepriseMode === "nouvelle") return !!data.entrepriseNouvelle?.nom;
      if (data.entrepriseMode === "existante") return !!data.entrepriseId;
      return false;
    },
    {
      message: "Si entreprise=nouvelle → entrepriseNouvelle.nom requis. Si entreprise=existante → entrepriseId requis.",
      path: ["entrepriseMode"],
    },
  );

export type ProspectCreationData = z.infer<typeof prospectCreationSchema>;
```

- [ ] **Step 4: Lancer les tests (doivent pass)**

```bash
npx vitest run tests/lib/prospect-validation.test.ts 2>&1 | tail -5
```

Expected: 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/validations/prospect.ts tests/lib/prospect-validation.test.ts
git commit -m "feat(prospect): Zod schema prospectCreationSchema + tests (7/7)

Schéma composé pour la création unifiée Contact + Entreprise + Demande.
Validation cross-champs : entrepriseMode='nouvelle' → entrepriseNouvelle.nom
requis ; 'existante' → entrepriseId requis."
```

---

## Task 2: API endpoint POST /api/prospects (TDD)

**Files:**
- Create: `app/api/prospects/route.ts`
- Test: `tests/api/prospects.test.ts` (smoke uniquement — la transaction Prisma sera testée par smoke prod après merge)

- [ ] **Step 1: Écrire test smoke**

Créer `tests/api/prospects.test.ts` :

```typescript
import { describe, it, expect, vi } from "vitest";

// Mock prisma pour ne pas hit la vraie DB en CI
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    contact: { findUnique: vi.fn() },
  },
}));

const importPOST = async () => (await import("@/app/api/prospects/route")).POST;
const importPrisma = async () =>
  (await import("@/lib/prisma")) as unknown as {
    prisma: {
      $transaction: ReturnType<typeof vi.fn>;
      contact: { findUnique: ReturnType<typeof vi.fn> };
    };
  };

const validPayload = {
  contact: { prenom: "Jean", nom: "Dupont", email: "jean@test.com" },
  entrepriseMode: "nouvelle" as const,
  entrepriseNouvelle: { nom: "Acme" },
  demande: { origine: "client" as const, formationSouhaitee: "SST" },
};

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/prospects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as Parameters<Awaited<ReturnType<typeof importPOST>>>[0];
}

describe("POST /api/prospects", () => {
  it("retourne 201 + ids des entités créées", async () => {
    const { prisma } = await importPrisma();
    prisma.contact.findUnique.mockResolvedValueOnce(null); // email non existant
    prisma.$transaction.mockResolvedValueOnce({
      demandeId: "cuid_demande",
      contactId: "cuid_contact",
      entrepriseId: "cuid_entreprise",
    });
    const POST = await importPOST();
    const res = await POST(makeRequest(validPayload));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({
      demandeId: "cuid_demande",
      contactId: "cuid_contact",
      entrepriseId: "cuid_entreprise",
      redirectUrl: "/demandes/cuid_demande",
    });
  });

  it("retourne 422 si payload invalide", async () => {
    const POST = await importPOST();
    const res = await POST(makeRequest({ invalid: true }));
    expect(res.status).toBe(422);
  });

  it("retourne 409 si email contact déjà existant (rattachement à proposer)", async () => {
    const { prisma } = await importPrisma();
    prisma.contact.findUnique.mockResolvedValueOnce({ id: "cuid_existant", nom: "Old", prenom: "User" });
    const POST = await importPOST();
    const res = await POST(makeRequest(validPayload));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toContain("email existe déjà");
    expect(body.existingContactId).toBe("cuid_existant");
  });
});
```

- [ ] **Step 2: Lancer les tests (FAIL — handler inexistant)**

```bash
npx vitest run tests/api/prospects.test.ts 2>&1 | tail -10
```

Expected: FAIL "Cannot find module '@/app/api/prospects/route'".

- [ ] **Step 3: Implémenter le handler**

Créer `app/api/prospects/route.ts` :

```typescript
// Création unifiée d'un prospect — Phase 1.
// Reçoit un payload combiné (contact + entreprise + demande) et crée
// les 3 entités en transaction Prisma. Rollback automatique si erreur.
// Cf. docs/superpowers/specs/2026-05-16-formulaire-prospect-unifie-design.md

export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-wrapper";
import { prospectCreationSchema } from "@/lib/validations/prospect";
import { logAction } from "@/lib/historique";
import { logger } from "@/lib/logger";

export const POST = withErrorHandler(async (req: NextRequest) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const parsed = prospectCreationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload invalide", details: parsed.error.flatten() },
      { status: 422 },
    );
  }
  const data = parsed.data;

  // Vérif amont : email contact déjà existant → propose un rattachement
  const existing = await prisma.contact.findUnique({
    where: { email: data.contact.email },
    select: { id: true, nom: true, prenom: true },
  });
  if (existing) {
    return NextResponse.json(
      {
        error: `Un contact avec cet email existe déjà (${existing.prenom} ${existing.nom}). Utilisez la création de demande depuis sa fiche contact pour le rattacher.`,
        existingContactId: existing.id,
      },
      { status: 409 },
    );
  }

  // Transaction : crée Entreprise (si nouvelle) → Contact → Demande
  const result = await prisma.$transaction(async (tx) => {
    let entrepriseId: string;

    if (data.entrepriseMode === "nouvelle") {
      const ent = await tx.entreprise.create({
        data: {
          nom: data.entrepriseNouvelle!.nom,
          siret: data.entrepriseNouvelle?.siret || null,
          adresse: data.entrepriseNouvelle?.adresse || null,
          codePostal: data.entrepriseNouvelle?.codePostal || null,
          ville: data.entrepriseNouvelle?.ville || null,
          secteur: data.entrepriseNouvelle?.secteur || null,
          effectif: data.entrepriseNouvelle?.effectif ?? null,
        },
        select: { id: true },
      });
      entrepriseId = ent.id;
    } else {
      entrepriseId = data.entrepriseId!;
    }

    const contact = await tx.contact.create({
      data: {
        prenom: data.contact.prenom,
        nom: data.contact.nom,
        email: data.contact.email,
        telephone: data.contact.telephone || null,
        poste: data.contact.poste || null,
        type: "prospect",
        entrepriseId,
      },
      select: { id: true },
    });

    const notesParts: string[] = [];
    if (data.besoinsParticuliers?.handicapContraintes) {
      notesParts.push(`Handicap/contraintes : ${data.besoinsParticuliers.handicapContraintes}`);
    }
    if (data.besoinsParticuliers?.materielSurPlace) {
      notesParts.push(`Matériel sur place : ${data.besoinsParticuliers.materielSurPlace}`);
    }
    if (data.notesInternes) {
      notesParts.push(`Notes internes : ${data.notesInternes}`);
    }

    const demande = await tx.demande.create({
      data: {
        titre: data.demande.formationSouhaitee,
        description: data.demande.formationSouhaitee,
        origine: data.demande.origine,
        sourceContact: data.demande.sourceContact || null,
        nbStagiairesSouhaite: data.demande.nbStagiaires ?? null,
        budgetEnvisage: data.demande.budgetEnvisage ?? null,
        statut: "nouveau",
        contactId: contact.id,
        entrepriseId,
        notes: notesParts.join("\n\n") || null,
      },
      select: { id: true },
    });

    return {
      demandeId: demande.id,
      contactId: contact.id,
      entrepriseId,
    };
  });

  try {
    await logAction({
      action: "prospect_cree",
      label: `Prospect créé : ${data.contact.prenom} ${data.contact.nom}`,
      lien: `/demandes/${result.demandeId}`,
      entrepriseId: result.entrepriseId,
      contactId: result.contactId,
    });
  } catch (logErr) {
    logger.warn("historique.prospect_cree_failed", { error: String(logErr) });
  }

  return NextResponse.json(
    { ...result, redirectUrl: `/demandes/${result.demandeId}` },
    { status: 201 },
  );
});
```

⚠️ **Note importante** : ce handler fait référence à des champs de `Demande` (`titre`, `description`, `nbStagiairesSouhaite`, `budgetEnvisage`, `notes`, `sourceContact`). Si certains de ces champs n'existent pas dans le modèle Prisma `Demande` (vérifier `prisma/schema.prisma`), **adapter pour utiliser les noms réels**. Inspecter le modèle avant d'implémenter et ajuster les noms de propriétés.

- [ ] **Step 4: Vérifier les noms de champs Demande**

```bash
grep -A30 "^model Demande " prisma/schema.prisma | head -40
```

Ajuster le handler si nécessaire (noms de champs) avant de passer à Step 5.

- [ ] **Step 5: Lancer les tests (doivent pass)**

```bash
npx vitest run tests/api/prospects.test.ts 2>&1 | tail -5
```

Expected: 3 tests pass.

- [ ] **Step 6: Commit**

```bash
git add app/api/prospects/route.ts tests/api/prospects.test.ts
git commit -m "feat(prospect): POST /api/prospects — transaction Prisma + tests (3/3)

Endpoint qui crée Entreprise (si nouvelle) + Contact (type=prospect) + Demande
(statut=nouveau) en transaction atomique. Rollback si erreur. Détecte
les emails contacts déjà existants → 409 + existingContactId pour
proposer un rattachement côté UI."
```

---

## Task 3: Middleware update

**Files:**
- Modify: `middleware.ts`

- [ ] **Step 1: Ajouter `/prospects` à adminPages**

Trouver la liste `adminPages` dans `middleware.ts` et ajouter `"/prospects"` (le mettre près de `/contacts` ou en début pour cohérence sémantique).

- [ ] **Step 2: Ajouter `/api/prospects` à adminApiPrefixes**

Idem dans `adminApiPrefixes`.

- [ ] **Step 3: Vérifier + commit**

```bash
grep -n "/prospects" middleware.ts
npx tsc --noEmit 2>&1 | tail -3
git add middleware.ts
git commit -m "feat(middleware): ajouter /prospects + /api/prospects en adminPages"
```

---

## Task 4: Sous-composant ContactSection

**Files:**
- Create: `app/prospects/nouveau/sections/ContactSection.tsx`

- [ ] **Step 1: Implémenter le composant**

```bash
mkdir -p app/prospects/nouveau/sections
```

Créer `app/prospects/nouveau/sections/ContactSection.tsx` :

```tsx
"use client";

import { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Mail, Phone } from "lucide-react";
import type { ProspectCreationData } from "@/lib/validations/prospect";

interface Props {
  form: UseFormReturn<ProspectCreationData>;
}

export function ContactSection({ form }: Props) {
  const { register, formState: { errors } } = form;
  return (
    <section className="rounded-lg border border-gray-700 bg-gray-800 p-5">
      <div className="flex items-center gap-2 mb-4">
        <User className="h-5 w-5 text-red-500" />
        <h2 className="text-lg font-semibold text-gray-100">1. Contact (décideur)</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="prenom">Prénom <span className="text-red-500">*</span></Label>
          <Input id="prenom" {...register("contact.prenom")} className="mt-1" />
          {errors.contact?.prenom && <p className="text-xs text-red-500 mt-1">{errors.contact.prenom.message}</p>}
        </div>
        <div>
          <Label htmlFor="nom">Nom <span className="text-red-500">*</span></Label>
          <Input id="nom" {...register("contact.nom")} className="mt-1" />
          {errors.contact?.nom && <p className="text-xs text-red-500 mt-1">{errors.contact.nom.message}</p>}
        </div>
        <div>
          <Label htmlFor="email" className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> Email <span className="text-red-500">*</span></Label>
          <Input id="email" type="email" {...register("contact.email")} className="mt-1" />
          {errors.contact?.email && <p className="text-xs text-red-500 mt-1">{errors.contact.email.message}</p>}
        </div>
        <div>
          <Label htmlFor="telephone" className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> Téléphone</Label>
          <Input id="telephone" type="tel" {...register("contact.telephone")} className="mt-1" />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="poste">Poste / fonction</Label>
          <Input id="poste" {...register("contact.poste")} placeholder="Ex: Responsable formation" className="mt-1" />
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: tsc**

```bash
npx tsc --noEmit 2>&1 | grep "prospects/nouveau/sections/Contact" | head -3
```

Expected: 0 erreur dans ce fichier (les erreurs d'import ProspectCreationData devraient être OK si Task 1 est commitée).

---

## Task 5: Sous-composant EntrepriseSection (avec autocomplete)

**Files:**
- Create: `app/prospects/nouveau/sections/EntrepriseSection.tsx`

- [ ] **Step 1: Implémenter**

Créer `app/prospects/nouveau/sections/EntrepriseSection.tsx` :

```tsx
"use client";

import { useState, useEffect } from "react";
import { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Search } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import type { ProspectCreationData } from "@/lib/validations/prospect";

interface Props {
  form: UseFormReturn<ProspectCreationData>;
}

type EntrepriseSearchResult = {
  id: string;
  nom: string;
  siret: string | null;
  ville: string | null;
};

export function EntrepriseSection({ form }: Props) {
  const { register, watch, setValue, formState: { errors } } = form;
  const mode = watch("entrepriseMode");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 250);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const { data: searchResults } = useApi<{ data?: EntrepriseSearchResult[] } | EntrepriseSearchResult[]>(
    mode === "existante" && debouncedSearch.length >= 2
      ? `/api/entreprises?search=${encodeURIComponent(debouncedSearch)}&limit=10`
      : null,
  );
  const results: EntrepriseSearchResult[] = Array.isArray(searchResults)
    ? searchResults
    : searchResults?.data ?? [];

  return (
    <section className="rounded-lg border border-gray-700 bg-gray-800 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Building2 className="h-5 w-5 text-red-500" />
        <h2 className="text-lg font-semibold text-gray-100">2. Entreprise</h2>
      </div>
      <div className="flex gap-4 mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="radio" value="nouvelle" {...register("entrepriseMode")} />
          <span className="text-sm text-gray-200">Nouvelle entreprise</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="radio" value="existante" {...register("entrepriseMode")} />
          <span className="text-sm text-gray-200">Entreprise existante</span>
        </label>
      </div>
      {errors.entrepriseMode && <p className="text-xs text-red-500 mb-2">{errors.entrepriseMode.message}</p>}

      {mode === "existante" && (
        <div>
          <Label htmlFor="entreprise-search" className="flex items-center gap-1.5"><Search className="h-3 w-3" /> Rechercher une entreprise</Label>
          <Input
            id="entreprise-search"
            placeholder="Nom, SIRET, ville…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mt-1"
          />
          {results.length > 0 && (
            <ul className="mt-2 max-h-48 overflow-y-auto rounded-md border border-gray-600 bg-gray-900">
              {results.map((e) => (
                <li
                  key={e.id}
                  onClick={() => {
                    setValue("entrepriseId", e.id);
                    setSearchTerm(`${e.nom}${e.ville ? ` — ${e.ville}` : ""}`);
                  }}
                  className="px-3 py-2 hover:bg-gray-700 cursor-pointer text-sm text-gray-200 border-b border-gray-700 last:border-b-0"
                >
                  <strong>{e.nom}</strong>
                  {e.siret && <span className="text-xs text-gray-500 ml-2">SIRET {e.siret}</span>}
                  {e.ville && <span className="text-xs text-gray-500 ml-2">— {e.ville}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {mode === "nouvelle" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="ent-nom">Raison sociale <span className="text-red-500">*</span></Label>
            <Input id="ent-nom" {...register("entrepriseNouvelle.nom")} className="mt-1" />
            {errors.entrepriseNouvelle?.nom && <p className="text-xs text-red-500 mt-1">{errors.entrepriseNouvelle.nom.message}</p>}
          </div>
          <div>
            <Label htmlFor="ent-siret">SIRET</Label>
            <Input id="ent-siret" {...register("entrepriseNouvelle.siret")} placeholder="14 chiffres" className="mt-1" />
            {errors.entrepriseNouvelle?.siret && <p className="text-xs text-red-500 mt-1">{errors.entrepriseNouvelle.siret.message}</p>}
          </div>
          <div>
            <Label htmlFor="ent-secteur">Secteur d&apos;activité</Label>
            <select id="ent-secteur" {...register("entrepriseNouvelle.secteur")} className="mt-1 w-full h-10 rounded-md border border-gray-600 bg-gray-800 px-3 text-sm text-gray-200">
              <option value="">—</option>
              <option value="industrie">Industrie</option>
              <option value="btp">BTP</option>
              <option value="tertiaire">Tertiaire</option>
              <option value="public">Public</option>
              <option value="autre">Autre</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="ent-adresse">Adresse</Label>
            <Input id="ent-adresse" {...register("entrepriseNouvelle.adresse")} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="ent-cp">Code postal</Label>
            <Input id="ent-cp" {...register("entrepriseNouvelle.codePostal")} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="ent-ville">Ville</Label>
            <Input id="ent-ville" {...register("entrepriseNouvelle.ville")} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="ent-effectif">Effectif</Label>
            <Input id="ent-effectif" type="number" min="0" {...register("entrepriseNouvelle.effectif")} className="mt-1" />
          </div>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 2: tsc**

```bash
npx tsc --noEmit 2>&1 | grep "prospects/nouveau/sections/Entreprise" | head -3
```

Expected: 0 erreur.

---

## Task 6: Sous-composants DemandeSection + Besoins + Notes

**Files:**
- Create: `app/prospects/nouveau/sections/DemandeSection.tsx`
- Create: `app/prospects/nouveau/sections/BesoinsParticulierssSection.tsx`
- Create: `app/prospects/nouveau/sections/NotesSection.tsx`

- [ ] **Step 1: DemandeSection.tsx**

Créer `app/prospects/nouveau/sections/DemandeSection.tsx` :

```tsx
"use client";

import { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClipboardList, Sparkles } from "lucide-react";
import type { ProspectCreationData } from "@/lib/validations/prospect";

interface Props {
  form: UseFormReturn<ProspectCreationData>;
}

export function DemandeSection({ form }: Props) {
  const { register, formState: { errors } } = form;
  return (
    <section className="rounded-lg border border-gray-700 bg-gray-800 p-5">
      <div className="flex items-center gap-2 mb-4">
        <ClipboardList className="h-5 w-5 text-red-500" />
        <h2 className="text-lg font-semibold text-gray-100">3. Demande de formation</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label>Origine <span className="text-red-500">*</span></Label>
          <div className="mt-1 flex flex-wrap gap-3">
            {[
              { value: "client", label: "Client" },
              { value: "stagiaire", label: "Stagiaire" },
              { value: "centre", label: "Centre" },
              { value: "prospection", label: "Prospection" },
            ].map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" value={opt.value} {...register("demande.origine")} />
                <span className="text-sm text-gray-200">{opt.label}</span>
              </label>
            ))}
          </div>
          {errors.demande?.origine && <p className="text-xs text-red-500 mt-1">{errors.demande.origine.message}</p>}
        </div>
        <div>
          <Label htmlFor="source">Source contact</Label>
          <select id="source" {...register("demande.sourceContact")} className="mt-1 w-full h-10 rounded-md border border-gray-600 bg-gray-800 px-3 text-sm text-gray-200">
            <option value="">—</option>
            <option value="email">Email</option>
            <option value="telephone">Téléphone</option>
            <option value="site_web">Site web</option>
            <option value="salon">Salon</option>
            <option value="bouche_oreille">Bouche-à-oreille</option>
            <option value="autre">Autre</option>
          </select>
        </div>
        <div>
          <Label htmlFor="financement">Mode de financement envisagé</Label>
          <select id="financement" {...register("demande.modeFinancement")} className="mt-1 w-full h-10 rounded-md border border-gray-600 bg-gray-800 px-3 text-sm text-gray-200">
            <option value="">À définir</option>
            <option value="opco">OPCO</option>
            <option value="cpf">CPF</option>
            <option value="entreprise">Entreprise</option>
            <option value="personnel">Personnel</option>
            <option value="mixte">Mixte</option>
            <option value="a_definir">À définir</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="formation" className="flex items-center justify-between">
            <span>Formation souhaitée <span className="text-red-500">*</span></span>
            <button type="button" className="text-xs text-purple-400 hover:underline flex items-center gap-1" title="Analyse IA du besoin (à venir)" disabled>
              <Sparkles className="h-3 w-3" /> IA helper
            </button>
          </Label>
          <Input id="formation" {...register("demande.formationSouhaitee")} placeholder="Ex: SST initial 14h, Habilitation électrique B1V" className="mt-1" />
          {errors.demande?.formationSouhaitee && <p className="text-xs text-red-500 mt-1">{errors.demande.formationSouhaitee.message}</p>}
        </div>
        <div>
          <Label htmlFor="nb">Nombre de stagiaires</Label>
          <Input id="nb" type="number" min="1" {...register("demande.nbStagiaires")} placeholder="1" className="mt-1" />
        </div>
        <div>
          <Label htmlFor="budget">Budget envisagé (€ HT)</Label>
          <Input id="budget" type="number" min="0" {...register("demande.budgetEnvisage")} placeholder="3000" className="mt-1" />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="dates">Date(s) souhaitée(s)</Label>
          <Input id="dates" {...register("demande.datesSouhaitees")} placeholder="Ex: courant juin 2026, ou semaine du 15/06" className="mt-1" />
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: BesoinsParticulierssSection.tsx**

Créer `app/prospects/nouveau/sections/BesoinsParticulierssSection.tsx` :

```tsx
"use client";

import { UseFormReturn } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Accessibility } from "lucide-react";
import type { ProspectCreationData } from "@/lib/validations/prospect";

interface Props {
  form: UseFormReturn<ProspectCreationData>;
}

export function BesoinsParticulierssSection({ form }: Props) {
  const { register } = form;
  return (
    <section className="rounded-lg border border-gray-700 bg-gray-800 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Accessibility className="h-5 w-5 text-red-500" />
        <h2 className="text-lg font-semibold text-gray-100">4. Besoins particuliers</h2>
      </div>
      <div className="space-y-4">
        <div>
          <Label htmlFor="handicap">Handicap / contraintes spécifiques</Label>
          <textarea
            id="handicap"
            {...register("besoinsParticuliers.handicapContraintes")}
            rows={3}
            className="mt-1 w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-200"
            placeholder="Ex: RQTH, mobilité réduite, contraintes alimentaires…"
          />
        </div>
        <div>
          <Label htmlFor="materiel">Matériel sur place</Label>
          <textarea
            id="materiel"
            {...register("besoinsParticuliers.materielSurPlace")}
            rows={3}
            className="mt-1 w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-200"
            placeholder="Ex: vidéoprojecteur fourni, mannequins RCP à apporter…"
          />
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: NotesSection.tsx**

Créer `app/prospects/nouveau/sections/NotesSection.tsx` :

```tsx
"use client";

import { UseFormReturn } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { FileText } from "lucide-react";
import type { ProspectCreationData } from "@/lib/validations/prospect";

interface Props {
  form: UseFormReturn<ProspectCreationData>;
}

export function NotesSection({ form }: Props) {
  const { register } = form;
  return (
    <section className="rounded-lg border border-gray-700 bg-gray-800 p-5">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="h-5 w-5 text-red-500" />
        <h2 className="text-lg font-semibold text-gray-100">5. Notes commerciales (internes)</h2>
      </div>
      <textarea
        {...register("notesInternes")}
        rows={4}
        className="w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-200"
        placeholder="Notes pour l'équipe, contexte commercial, suivi…"
      />
    </section>
  );
}
```

- [ ] **Step 4: tsc**

```bash
npx tsc --noEmit 2>&1 | grep "prospects/nouveau/sections" | head -5
```

Expected: 0 erreur sur les 3 fichiers.

---

## Task 7: Page principale `/prospects/nouveau`

**Files:**
- Create: `app/prospects/nouveau/page.tsx`

- [ ] **Step 1: Implémenter**

Créer `app/prospects/nouveau/page.tsx` :

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, UserPlus } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { prospectCreationSchema, type ProspectCreationData } from "@/lib/validations/prospect";
import { api } from "@/lib/fetcher";
import { notify } from "@/lib/toast";
import { ContactSection } from "./sections/ContactSection";
import { EntrepriseSection } from "./sections/EntrepriseSection";
import { DemandeSection } from "./sections/DemandeSection";
import { BesoinsParticulierssSection } from "./sections/BesoinsParticulierssSection";
import { NotesSection } from "./sections/NotesSection";

export default function NouveauProspectPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<ProspectCreationData>({
    resolver: zodResolver(prospectCreationSchema),
    defaultValues: {
      contact: { prenom: "", nom: "", email: "", telephone: "", poste: "" },
      entrepriseMode: "nouvelle",
      entrepriseNouvelle: { nom: "", siret: "", adresse: "", codePostal: "", ville: "", secteur: "", effectif: undefined },
      demande: { origine: "client", sourceContact: "", formationSouhaitee: "", nbStagiaires: undefined, datesSouhaitees: "", budgetEnvisage: undefined, modeFinancement: undefined },
      besoinsParticuliers: { handicapContraintes: "", materielSurPlace: "" },
      notesInternes: "",
    },
  });

  async function onSubmit(data: ProspectCreationData) {
    setSubmitting(true);
    try {
      const res = await api.post<{ demandeId: string; contactId: string; entrepriseId: string; redirectUrl: string }>(
        "/api/prospects",
        data,
      );
      notify.success(`Prospect créé : ${data.contact.prenom} ${data.contact.nom}`);
      router.push(res.redirectUrl);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur lors de la création du prospect";
      notify.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-2">
        <Link href="/contacts?type=client" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200">
          <ArrowLeft className="h-4 w-4" /> CRM
        </Link>
      </div>
      <PageHeader
        title="Nouveau prospect"
        description="Capturez en une fois le contact, l'entreprise et le besoin de formation. Le prospect démarre en statut « nouveau »."
      />

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <ContactSection form={form} />
            <EntrepriseSection form={form} />
          </div>
          <div className="space-y-6">
            <DemandeSection form={form} />
            <BesoinsParticulierssSection form={form} />
            <NotesSection form={form} />
          </div>
        </div>

        <div className="sticky bottom-0 -mx-6 px-6 py-4 bg-gray-900/95 backdrop-blur border-t border-gray-700 flex justify-end gap-3">
          <Link href="/contacts?type=client" className="inline-flex items-center px-4 py-2 rounded-md border border-gray-600 text-sm text-gray-300 hover:bg-gray-800">
            Annuler
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-md bg-red-600 hover:bg-red-700 disabled:opacity-50 px-6 py-2 text-sm font-medium text-white"
          >
            <UserPlus className="h-4 w-4" />
            {submitting ? "Création…" : "Créer le prospect"}
          </button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: tsc + tests globaux**

```bash
npx tsc --noEmit 2>&1 | tail -5
npm test 2>&1 | tail -5
```

Expected: 0 erreur tsc, tous tests passent.

- [ ] **Step 3: Commit Task 4-7 (sections + page)**

```bash
git add app/prospects/nouveau/
git commit -m "feat(prospect): page /prospects/nouveau avec 5 sous-composants sections

Layout full-width 2-cols desktop / 1-col mobile.
- ContactSection (prénom, nom, email, tél, poste)
- EntrepriseSection (toggle existante/nouvelle + autocomplete /api/entreprises)
- DemandeSection (origine, source, formation, nb, dates, budget, financement)
- BesoinsParticulierssSection (handicap, matériel sur place)
- NotesSection (notes commerciales internes)

React Hook Form + zodResolver pour validation client/serveur unifiée.
Bouton submit sticky en bas. Toast + redirect /demandes/[id] à la création."
```

---

## Task 8: Sidebar — ajouter "Nouveau prospect"

**Files:**
- Modify: `components/layout/Sidebar.tsx`

- [ ] **Step 1: Ajouter l'item en tête du groupe CRM**

Trouver dans `components/layout/Sidebar.tsx` le groupe CRM (recherche par `key: "crm"` ou `label: "CRM"`). Ajouter EN PREMIÈRE POSITION de son tableau `items` :

```tsx
{ href: "/prospects/nouveau", label: "Nouveau prospect", icon: UserPlus },
```

Vérifier que `UserPlus` est importé depuis `lucide-react` (il l'est probablement déjà — sinon l'ajouter à l'import du haut du fichier).

- [ ] **Step 2: Vérifier + commit**

```bash
grep -n "Nouveau prospect\|/prospects/nouveau" components/layout/Sidebar.tsx
npx tsc --noEmit 2>&1 | grep Sidebar
git add components/layout/Sidebar.tsx
git commit -m "feat(nav): \"Nouveau prospect\" en tête du groupe CRM (call-to-action)"
```

---

## Task 9: Smoke test local + final verification

- [ ] **Step 1: Tests + tsc final**

```bash
npm test 2>&1 | tail -5
npx tsc --noEmit 2>&1 | tail -3
```

Expected: 71 + 10 (7 schema + 3 API) = 81 tests pass, 0 erreur tsc.

- [ ] **Step 2: Smoke test en dev** (optionnel mais recommandé)

```bash
# Dans un terminal :
npm run dev
# Dans navigateur : http://localhost:3000/prospects/nouveau
```

Tester :
- [ ] Page charge en full-width 2-cols
- [ ] Toggle "Nouvelle entreprise" / "Existante" change le formulaire
- [ ] Recherche entreprise existante fait des appels API (Network tab)
- [ ] Submit avec champs manquants affiche les erreurs sous chaque champ
- [ ] Submit valide redirige vers `/demandes/[id]`
- [ ] Vérifier en Prisma Studio : 3 enregistrements créés (Entreprise / Contact type=prospect / Demande statut=nouveau)

Arrêter dev (Ctrl+C).

---

## Task 10: PR + déploiement

- [ ] **Step 1: Push branche**

```bash
git push -u origin feat/prospect-unified-form
```

- [ ] **Step 2: Créer PR**

```bash
gh pr create --title "feat(prospect): formulaire unifié /prospects/nouveau (Phase 1)" --body "$(cat <<'EOF'
## Résumé

Phase 1 de la vision \"prospect unifié\" : fusion de /contacts/nouveau + /demandes/nouveau (+ /entreprises/nouveau inline) en une seule page /prospects/nouveau.

**Spec** : docs/superpowers/specs/2026-05-16-formulaire-prospect-unifie-design.md
**Plan** : docs/superpowers/plans/2026-05-16-formulaire-prospect-unifie-implementation.md

## Changements

- `lib/validations/prospect.ts` : Zod schema composé + 7 tests
- `app/api/prospects/route.ts` : POST endpoint transaction Prisma + 3 tests
- `app/prospects/nouveau/page.tsx` : page full-width 2-cols
- `app/prospects/nouveau/sections/` : 5 sous-composants (Contact, Entreprise, Demande, BesoinsParticuliers, Notes)
- `middleware.ts` : `/prospects` + `/api/prospects` ajoutés à adminPages/adminApiPrefixes
- `components/layout/Sidebar.tsx` : \"Nouveau prospect\" en tête CRM

## Hors scope (Phase 2 et 3)

- Devis auto-généré via IA à la conversion prospect→client
- Questionnaires auto-envoyés à la conversion

## Vérifications

- [x] npm test : 81/81 (71 + 10 nouveaux)
- [x] npx tsc --noEmit : 0 erreur
- [ ] Smoke test preview : créer prospect avec entreprise nouvelle
- [ ] Smoke test preview : créer prospect avec entreprise existante (autocomplete)
- [ ] Vérifier rollback en cas d'erreur (email contact déjà existant → 409)

🤖 Generated with Claude Code
EOF
)"
```

- [ ] **Step 3: Attendre CI**

```bash
until gh pr checks $(gh pr view --json number --jq .number) 2>&1 | grep -qE "Vitest\s+pass|Vitest\s+fail"; do sleep 20; done
gh pr checks $(gh pr view --json number --jq .number) 2>&1 | grep -E "Vitest|CodeRabbit|netlify/projetrfc/deploy-preview"
```

- [ ] **Step 4: Smoke test preview**

Ouvrir l'URL Netlify Deploy Preview retournée. Tester (en se loggant en admin) :
- `/prospects/nouveau` charge full-width
- Submit valide → redirect `/demandes/[id]`
- Sidebar montre "Nouveau prospect"

---

## Self-Review checklist

- ✅ **Spec coverage** : tous les éléments de la spec sont couverts par des tasks (architecture, layout, 5 sections, data flow, validations, AI helper bouton désactivé Phase 1)
- ✅ **No placeholders** : aucun "TBD"/"TODO" en cours dans les tasks (les checklists d'acceptation sont normales)
- ✅ **Type consistency** : `ProspectCreationData`, `prospectCreationSchema` utilisés de façon cohérente
- ✅ **Pre-requisite check** : Task 0 vérifie que PR #100 est mergée avant de partir

## Risques connus

1. **Noms de champs Demande** : Task 2 step 4 demande de vérifier les noms réels dans `prisma/schema.prisma`. Si les champs cités (`titre`, `description`, etc.) ne correspondent pas exactement, adapter avant Step 5.
2. **Hook useApi** : Task 5 utilise `useApi` avec `null` comme conditional skip. Vérifier que le hook supporte ça — sinon adapter avec `enabled: false` pattern.
3. **Conflit potentiel /prospects** : si déjà une page `/prospects` existe (liste), `/prospects/nouveau` doit cohabiter sans casser. Vérifier `ls app/prospects/` avant Task 7.
