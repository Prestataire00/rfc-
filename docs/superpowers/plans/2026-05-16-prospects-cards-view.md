# Prospects Cards View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter une vue "Cards" (grille responsive) à la page `/prospects` en plus de Table et Kanban, avec Cards comme default.

**Architecture:** Nouveau composant `CardsView.tsx` dans `app/prospects/_components/` qui reçoit les mêmes props que `TableView` (`besoins: Besoin[]`, `onRefresh: () => void`). `page.tsx` est modifié pour accepter `"cards"` dans le type `ViewMode`, changer le default, ajouter le bouton toggle, et rendre `<CardsView />`.

**Tech Stack:** Next.js 14 App Router, React, Tailwind CSS, lucide-react, TypeScript. Réutilise les types `Besoin` (de `KanbanView.tsx`), `StatusBadge` et `RowActions` existants.

---

## File Map

| Fichier | Action | Responsabilité |
|---|---|---|
| `app/prospects/_components/CardsView.tsx` | **Créer** | Grille responsive de cards |
| `app/prospects/page.tsx` | **Modifier** | Ajouter `"cards"` au toggle, importer CardsView, changer default |

---

### Task 1: Créer CardsView.tsx

**Files:**
- Create: `app/prospects/_components/CardsView.tsx`

- [ ] **Step 1: Créer le fichier CardsView.tsx**

```tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { GraduationCap, Users as UsersIcon, AlertCircle } from "lucide-react";
import { BESOIN_PRIORITES } from "@/lib/constants";
import { formatDate, formatCurrency } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";
import { RowActions } from "./RowActions";
import type { Besoin } from "./KanbanView";

interface CardsViewProps {
  besoins: Besoin[];
  onRefresh: () => void;
}

const PRIORITE_STYLE: Record<string, string> = {
  basse:   "text-gray-500",
  normale: "text-blue-400",
  haute:   "text-orange-400",
  urgente: "text-red-400 font-semibold",
};

export function CardsView({ besoins, onRefresh }: CardsViewProps) {
  const router = useRouter();

  // Sort by createdAt desc (newest first)
  const sorted = [...besoins].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-gray-400 mb-4">Aucun prospect</p>
        <Link
          href="/prospects/nouveau"
          className="inline-flex items-center gap-2 rounded-md bg-red-600 hover:bg-red-700 px-4 py-2 text-sm font-medium text-white transition-colors"
        >
          + Nouvelle demande
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {sorted.map((b) => (
        <ProspectCard key={b.id} b={b} onRefresh={onRefresh} onNavigate={(id) => router.push(`/prospects/${id}`)} />
      ))}
    </div>
  );
}

function ProspectCard({
  b,
  onRefresh,
  onNavigate,
}: {
  b: Besoin;
  onRefresh: () => void;
  onNavigate: (id: string) => void;
}) {
  const prioStyle = PRIORITE_STYLE[b.priorite] ?? "text-gray-400";
  const prioLabel = BESOIN_PRIORITES[b.priorite as keyof typeof BESOIN_PRIORITES]?.label ?? b.priorite;
  const isUrgent = b.priorite === "urgente";

  // Prospect display name
  const prospectName =
    b.contact
      ? `${b.contact.prenom} ${b.contact.nom}`
      : b.entreprise?.nom ?? b.titre;
  const prospectSub = b.entreprise?.nom ?? null;

  return (
    <div
      className="group relative border border-gray-700 bg-gray-800 rounded-lg p-4 hover:shadow-md hover:border-gray-600 cursor-pointer transition-all flex flex-col gap-3"
      onClick={() => onNavigate(b.id)}
      data-testid="prospect-card"
    >
      {/* Header: status badge + menu */}
      <div className="flex items-start justify-between gap-2" onClick={(e) => e.stopPropagation()}>
        <StatusBadge demandeId={b.id} statut={b.statut} onRefresh={onRefresh} />
        <RowActions demandeId={b.id} currentStatut={b.statut} onRefresh={onRefresh} />
      </div>

      {/* Prospect name + company */}
      <div className="flex flex-col gap-0.5">
        <span className="font-semibold text-base text-gray-100 leading-tight">{prospectName}</span>
        {prospectSub && (
          <span className="text-sm text-gray-400 truncate">{prospectSub}</span>
        )}
      </div>

      {/* Formation + stagiaires */}
      {b.formation && (
        <div className="flex items-center justify-between gap-2 text-sm text-gray-300">
          <span className="flex items-center gap-1 truncate">
            <GraduationCap className="h-4 w-4 shrink-0 text-red-400" />
            <span className="truncate">{b.formation.titre}</span>
          </span>
          {b.nbStagiaires && (
            <span className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
              <UsersIcon className="h-3.5 w-3.5" />
              {b.nbStagiaires} stagiaire{b.nbStagiaires > 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}

      {/* Devis */}
      {b.devis && (
        <div className="text-xs text-gray-400">
          Devis {b.devis.numero}
          {b.budget && <span> · {formatCurrency(b.budget)} HT</span>}
        </div>
      )}

      {/* Footer: priority + date */}
      <div className="flex items-center justify-between gap-2 mt-auto pt-2 border-t border-gray-700/60 text-xs">
        <span className={isUrgent ? `flex items-center gap-1 ${prioStyle}` : prioStyle}>
          {isUrgent && <AlertCircle className="h-3 w-3" />}
          {prioLabel}
        </span>
        <span className="text-gray-500">{formatDate(b.createdAt)}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Vérifier que le fichier TypeScript est valide**

```bash
cd /Users/anissa/rfc- && npx tsc --noEmit 2>&1 | tail -5
```

Expected: 0 erreurs (ou seulement des erreurs non liées à CardsView.tsx)

---

### Task 2: Modifier page.tsx

**Files:**
- Modify: `app/prospects/page.tsx`

- [ ] **Step 3: Remplacer le type ViewMode et la logique associée**

Dans `page.tsx`, ligne 20 — remplacer `"table" | "kanban"` par `"table" | "kanban" | "cards"` :

```tsx
// AVANT:
const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
useEffect(() => {
  const saved = localStorage.getItem(LS_KEY);
  if (saved === "kanban" || saved === "table") setViewMode(saved);
}, []);
function switchView(mode: "table" | "kanban") {
  setViewMode(mode);
  localStorage.setItem(LS_KEY, mode);
}

// APRÈS:
const [viewMode, setViewMode] = useState<"table" | "kanban" | "cards">("cards");
useEffect(() => {
  const saved = localStorage.getItem(LS_KEY);
  if (saved === "kanban" || saved === "table" || saved === "cards") setViewMode(saved);
}, []);
function switchView(mode: "table" | "kanban" | "cards") {
  setViewMode(mode);
  localStorage.setItem(LS_KEY, mode);
}
```

- [ ] **Step 4: Ajouter l'import CardsView et l'icône LayoutGrid (déjà importée)**

Ligne 6 de `page.tsx` — `LayoutGrid` est déjà importé. Ajouter l'import de `CardsView` :

```tsx
// AVANT ligne 10:
import { StatsBar } from "./_components/StatsBar";
import { TableView } from "./_components/TableView";
import { KanbanView, PIPELINE_COLS, type Besoin } from "./_components/KanbanView";

// APRÈS:
import { StatsBar } from "./_components/StatsBar";
import { TableView } from "./_components/TableView";
import { KanbanView, PIPELINE_COLS, type Besoin } from "./_components/KanbanView";
import { CardsView } from "./_components/CardsView";
```

- [ ] **Step 5: Remplacer le bloc toggle Table / Kanban par Table / Cards / Kanban**

Remplacer le bloc `{/* Toggle Table / Kanban */}` (lignes ~154-170) :

```tsx
// AVANT:
{/* Toggle Table / Kanban */}
<div className="ml-auto flex items-center gap-1 border border-gray-600 rounded-md p-0.5">
  <button
    onClick={() => switchView("table")}
    title="Vue table"
    className={`h-8 w-8 inline-flex items-center justify-center rounded transition-colors ${viewMode === "table" ? "bg-gray-600 text-gray-100" : "text-gray-400 hover:bg-gray-700"}`}
  >
    <Table className="h-4 w-4" />
  </button>
  <button
    onClick={() => switchView("kanban")}
    title="Vue kanban"
    className={`h-8 w-8 inline-flex items-center justify-center rounded transition-colors ${viewMode === "kanban" ? "bg-gray-600 text-gray-100" : "text-gray-400 hover:bg-gray-700"}`}
  >
    <LayoutGrid className="h-4 w-4" />
  </button>
</div>

// APRÈS:
{/* Toggle Cards / Table / Kanban */}
<div className="ml-auto flex items-center gap-1 border border-gray-600 rounded-md p-0.5">
  <button
    onClick={() => switchView("cards")}
    title="Vue cards"
    className={`h-8 w-8 inline-flex items-center justify-center rounded transition-colors ${viewMode === "cards" ? "bg-gray-600 text-gray-100" : "text-gray-400 hover:bg-gray-700"}`}
  >
    <LayoutGrid className="h-4 w-4" />
  </button>
  <button
    onClick={() => switchView("table")}
    title="Vue table"
    className={`h-8 w-8 inline-flex items-center justify-center rounded transition-colors ${viewMode === "table" ? "bg-gray-600 text-gray-100" : "text-gray-400 hover:bg-gray-700"}`}
  >
    <Table className="h-4 w-4" />
  </button>
  <button
    onClick={() => switchView("kanban")}
    title="Vue kanban"
    className={`h-8 w-8 inline-flex items-center justify-center rounded transition-colors ${viewMode === "kanban" ? "bg-gray-600 text-gray-100" : "text-gray-400 hover:bg-gray-700"}`}
  >
    <LayoutGrid className="h-4 w-4" />
  </button>
</div>
```

Note: Table garde son icône `<Table>`, Kanban garde `<LayoutGrid>`, Cards utilise une icône `<LayoutGrid>`. Pour différencier Cards et Kanban, Cards pourrait utiliser `<Grid3x3>` ou `<Square>` mais `LayoutGrid` est déjà importé — on peut importer `Kanban` de lucide-react pour Kanban.

- [ ] **Step 6: Mettre à jour le bloc de rendu conditionnel**

Remplacer le bloc `{/* Contenu */}` — la partie conditionnelle finale (lignes ~188-196) :

```tsx
// AVANT:
) : viewMode === "table" ? (
  <TableView besoins={filtered} onRefresh={() => mutate()} />
) : (
  <KanbanView
    cols={PIPELINE_COLS}
    byStatut={byStatut}
    onOpen={(id) => router.push(`/prospects/${id}`)}
  />
)}

// APRÈS:
) : viewMode === "cards" ? (
  <CardsView besoins={filtered} onRefresh={() => mutate()} />
) : viewMode === "table" ? (
  <TableView besoins={filtered} onRefresh={() => mutate()} />
) : (
  <KanbanView
    cols={PIPELINE_COLS}
    byStatut={byStatut}
    onOpen={(id) => router.push(`/prospects/${id}`)}
  />
)}
```

---

### Task 3: Vérifications finales

- [ ] **Step 7: TypeScript check**

```bash
cd /Users/anissa/rfc- && npx tsc --noEmit 2>&1 | tail -5
```

Expected: `0 erreurs` ou sortie vide.

- [ ] **Step 8: Tests**

```bash
cd /Users/anissa/rfc- && npm test 2>&1 | tail -5
```

Expected: `104 passed` (ou plus si tests ajoutés).

---

### Task 4: Commit + Push + PR

- [ ] **Step 9: Commit**

```bash
cd /Users/anissa/rfc- && git add app/prospects/_components/CardsView.tsx app/prospects/page.tsx && git commit -m "$(cat <<'EOF'
feat(prospects): vue Cards (grille responsive) en plus de Table/Kanban, default désormais Cards

Vue Cards : grille 1/2/3/4 colonnes selon écran. Chaque card affiche :
status badge (cliquable→dropdown), nom prospect, entreprise, formation,
devis si existe, priorité, date. Click body → /prospects/[id].

Default view passe de Table à Cards (plus visuel, demandé par user).
Toggle Cards + Table + Kanban conservés. Persistance localStorage.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 10: Push**

```bash
cd /Users/anissa/rfc- && git push -u origin feat/prospects-cards-view
```

- [ ] **Step 11: PR**

```bash
cd /Users/anissa/rfc- && gh pr create --title "feat(prospects): vue Cards en plus de Table/Kanban (default)" --body "$(cat <<'EOF'
## Summary
- Ajoute la vue Cards (grille responsive 1/2/3/4 colonnes) à la page /prospects
- La vue Cards devient le mode par défaut (plus visuel que Table)
- Table et Kanban restent disponibles via le toggle (3 boutons)
- Persistance localStorage : le dernier mode choisi est mémorisé

## Détails
- `CardsView.tsx` : nouveau composant réutilisant `StatusBadge`, `RowActions`, type `Besoin`
- Chaque card : status badge (cliquable → dropdown statut), menu ⋮, nom, entreprise, formation + stagiaires, devis si existe, priorité, date
- Click body → navigation `/prospects/[id]` ; click badge/menu → stopPropagation
- Empty state avec bouton "+ Nouvelle demande"

## Test plan
- [ ] Vérifier que la vue Cards s'affiche par défaut à l'ouverture de /prospects
- [ ] Vérifier le toggle 3 boutons (Cards | Table | Kanban)
- [ ] Vérifier que le click sur une card navigue vers /prospects/[id]
- [ ] Vérifier que le badge statut ouvre le dropdown sans naviguer
- [ ] Vérifier la grille responsive : 1 col mobile, 2 sm, 3 lg, 4 xl
- [ ] Vérifier la persistance localStorage (changer de vue → refresh → même vue)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
