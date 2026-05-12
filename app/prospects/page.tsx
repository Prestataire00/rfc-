"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Search, Plus, Users, TrendingUp, Target, Building2,
  LayoutGrid, Columns3, MoreHorizontal, Star,
} from "lucide-react";
import { SkeletonTable } from "@/components/shared/Skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useApi, useApiMutation, invalidate } from "@/hooks/useApi";
import { notify } from "@/lib/toast";
import { ApiError } from "@/lib/fetcher";
import { cn } from "@/lib/utils";

interface Prospect {
  id: string;
  nom: string;
  prenom: string;
  email: string | null;
  telephone: string | null;
  entreprise: string | null;
  source: string | null;
  statut: string;
  score: number | null;
  notes: string | null;
  attribueA: string | null;
  dateProchaineAction: string | null;
  contactId: string | null;
  _count?: { activities: number };
}

interface User {
  id: string;
  nom: string;
  prenom: string;
}

type ViewMode = "kanban" | "grille";

// 6 colonnes — `contacte` est nouveau (statut DB = VARCHAR, pas d'enum donc pas de migration nécessaire)
const COLUMNS = [
  { value: "nouveau", label: "Prospect", topBar: "bg-gray-400" },
  { value: "contacte", label: "Contacté", topBar: "bg-blue-500" },
  { value: "qualifie", label: "Qualifié", topBar: "bg-violet-500" },
  { value: "proposition", label: "Négociation", topBar: "bg-amber-500" },
  { value: "gagne", label: "Gagné", topBar: "bg-emerald-500" },
  { value: "perdu", label: "Perdu", topBar: "bg-red-500" },
] as const;

// Palette stable pour les avatars
const AVATAR_TONES = [
  "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
];

function initials(prenom: string, nom: string): string {
  return `${prenom[0] ?? ""}${nom[0] ?? ""}`.toUpperCase();
}

function avatarTone(seed: string): string {
  const code = seed.charCodeAt(0) || 0;
  return AVATAR_TONES[code % AVATAR_TONES.length] ?? AVATAR_TONES[0]!;
}

export default function ProspectsPage() {
  const [view, setView] = useState<ViewMode>("kanban");
  const [search, setSearch] = useState("");
  const [filterAttribue, setFilterAttribue] = useState("");
  const [openCreate, setOpenCreate] = useState(false);
  const [form, setForm] = useState({
    prenom: "", nom: "", email: "", telephone: "", entreprise: "",
    source: "", statut: "nouveau", score: 50, notes: "",
  });

  const url = filterAttribue ? `/api/prospects?attribueA=${filterAttribue}` : "/api/prospects";
  const { data: prospects, isLoading } = useApi<Prospect[]>(url);
  const { data: users } = useApi<User[]>("/api/utilisateurs");

  const filtered = useMemo(() => {
    if (!prospects) return [];
    if (!search) return prospects;
    const q = search.toLowerCase();
    return prospects.filter(
      (p) =>
        p.nom.toLowerCase().includes(q) ||
        p.prenom.toLowerCase().includes(q) ||
        (p.entreprise ?? "").toLowerCase().includes(q) ||
        (p.email ?? "").toLowerCase().includes(q),
    );
  }, [prospects, search]);

  const byStatut = useMemo(() => {
    const groups: Record<string, Prospect[]> = {};
    for (const c of COLUMNS) groups[c.value] = [];
    for (const p of filtered) {
      const target = groups[p.statut] ?? (groups[p.statut] = []);
      target.push(p);
    }
    return groups;
  }, [filtered]);

  // KPI dérivés
  const stats = useMemo(() => {
    const total = filtered.length;
    const nouveaux = byStatut["nouveau"]?.length ?? 0;
    const enDiscussion =
      (byStatut["contacte"]?.length ?? 0) +
      (byStatut["qualifie"]?.length ?? 0) +
      (byStatut["proposition"]?.length ?? 0);
    const convertis = byStatut["gagne"]?.length ?? 0;
    return { total, nouveaux, enDiscussion, convertis };
  }, [filtered.length, byStatut]);

  const { trigger: createProspect, isMutating: saving } = useApiMutation<Record<string, unknown>, Prospect>(
    "/api/prospects",
    "POST",
  );

  const handleCreate = async () => {
    if (!form.prenom.trim() || !form.nom.trim()) {
      notify.error("Prénom et nom obligatoires");
      return;
    }
    try {
      const payload: Record<string, unknown> = {
        prenom: form.prenom.trim(),
        nom: form.nom.trim(),
        statut: form.statut,
        score: form.score,
      };
      if (form.email.trim()) payload.email = form.email.trim();
      if (form.telephone.trim()) payload.telephone = form.telephone.trim();
      if (form.entreprise.trim()) payload.entreprise = form.entreprise.trim();
      if (form.source.trim()) payload.source = form.source.trim();
      if (form.notes.trim()) payload.notes = form.notes.trim();

      await createProspect(payload);
      notify.success("Prospect créé");
      await invalidate("/api/prospects");
      setOpenCreate(false);
      setForm({
        prenom: "", nom: "", email: "", telephone: "", entreprise: "",
        source: "", statut: "nouveau", score: 50, notes: "",
      });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Erreur";
      notify.error("Erreur", msg);
    }
  };

  const userOptions = [
    { value: "", label: "Tous les commerciaux" },
    ...((users ?? []).map((u) => ({ value: u.id, label: `${u.prenom} ${u.nom}` }))),
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Prospects</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Suivez vos prospects et opportunités
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Toggle Kanban / Grille */}
          <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-1">
            <button
              onClick={() => setView("kanban")}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                view === "kanban"
                  ? "bg-red-600 text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white",
              )}
              aria-pressed={view === "kanban"}
            >
              <Columns3 className="h-4 w-4" />
              Kanban
            </button>
            <button
              onClick={() => setView("grille")}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                view === "grille"
                  ? "bg-red-600 text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white",
              )}
              aria-pressed={view === "grille"}
            >
              <LayoutGrid className="h-4 w-4" />
              Grille
            </button>
          </div>
          <Button
            onClick={() => setOpenCreate(true)}
            className="bg-red-600 hover:bg-red-700"
          >
            <Plus className="h-4 w-4 mr-1" />
            Ajouter un prospect
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KpiCard label="Total prospects" value={stats.total} icon={Users} tone="violet" />
        <KpiCard label="Nouveaux" value={stats.nouveaux} icon={TrendingUp} tone="emerald" />
        <KpiCard label="En discussion" value={stats.enDiscussion} icon={Target} tone="amber" />
        <KpiCard label="Convertis" value={stats.convertis} icon={Building2} tone="emerald" />
      </div>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-5">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Rechercher un prospect..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 h-10 text-sm"
          />
        </div>
        <div className="w-full sm:w-56">
          <Select
            value={filterAttribue}
            onChange={(e) => setFilterAttribue(e.target.value)}
            options={userOptions}
            className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 h-10 text-sm"
          />
        </div>
      </div>

      {/* Contenu : Kanban ou Grille */}
      {isLoading ? (
        <SkeletonTable rows={4} cols={6} />
      ) : view === "kanban" ? (
        <KanbanView columns={COLUMNS} groups={byStatut} />
      ) : (
        <GrilleView items={filtered} />
      )}

      {/* Modal création */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent
          onClose={() => setOpenCreate(false)}
          className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 max-w-xl"
        >
          <DialogHeader>
            <DialogTitle>Nouveau prospect</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Prénom *</Label>
                <Input value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Nom *</Label>
                <Input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Téléphone</Label>
                <Input value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Entreprise</Label>
              <Input value={form.entreprise} onChange={(e) => setForm({ ...form, entreprise: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Statut</Label>
                <Select
                  value={form.statut}
                  onChange={(e) => setForm({ ...form, statut: e.target.value })}
                  options={COLUMNS.map((c) => ({ value: c.value, label: c.label }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Score : {form.score}</Label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={form.score}
                  onChange={(e) => setForm({ ...form, score: Number(e.target.value) })}
                  className="w-full accent-red-600"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Source</Label>
              <Input
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                placeholder="web, salon, recommandation..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>Annuler</Button>
            <Button onClick={handleCreate} disabled={saving} className="bg-red-600 hover:bg-red-700">
              {saving ? "Création..." : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// KPI Card
// ──────────────────────────────────────────────────────────────────────────────
const TONE_STYLES = {
  violet: "bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300",
  emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300",
  amber: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300",
  red: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300",
} as const;

function KpiCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  tone: keyof typeof TONE_STYLES;
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 flex items-center justify-between gap-3 shadow-sm">
      <div>
        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">
          {label}
        </p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1 tabular-nums">{value}</p>
      </div>
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", TONE_STYLES[tone])}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Kanban view
// ──────────────────────────────────────────────────────────────────────────────
function KanbanView({
  columns,
  groups,
}: {
  columns: ReadonlyArray<{ value: string; label: string; topBar: string }>;
  groups: Record<string, Prospect[]>;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
      {columns.map((col) => {
        const items = groups[col.value] ?? [];
        return (
          <div
            key={col.value}
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/40 overflow-hidden flex flex-col min-h-[400px]"
          >
            <div className={cn("h-1 w-full", col.topBar)} />
            <div className="px-3 py-3 flex items-center justify-between border-b border-gray-200/50 dark:border-gray-700/50 bg-white dark:bg-gray-800/60">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{col.label}</h3>
              <span className="text-[11px] font-semibold rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 min-w-[20px] h-5 px-1.5 flex items-center justify-center tabular-nums">
                {items.length}
              </span>
            </div>
            <div className="flex-1 p-2 space-y-2 overflow-y-auto">
              {items.length === 0 ? (
                <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center py-6 italic">
                  Aucun prospect
                </p>
              ) : (
                items.map((p) => <ProspectCard key={p.id} prospect={p} />)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProspectCard({ prospect: p }: { prospect: Prospect }) {
  const init = initials(p.prenom, p.nom);
  const tone = avatarTone(p.prenom + p.nom);
  return (
    <Link
      href={`/prospects/${p.id}`}
      className="block rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-red-500/50 hover:shadow-sm p-3 transition-all group"
    >
      <div className="flex items-start gap-2.5">
        <span className={cn("w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0", tone)}>
          {init}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {p.prenom} {p.nom}
          </p>
          {p.email && (
            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{p.email}</p>
          )}
          {p.entreprise && (
            <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate mt-0.5">{p.entreprise}</p>
          )}
        </div>
        <button
          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-opacity"
          onClick={(e) => {
            e.preventDefault();
            // Placeholder pour menu contextuel — édition rapide à brancher plus tard
          }}
          aria-label="Actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
      {typeof p.score === "number" && p.score > 0 && (
        <div className="mt-2 flex items-center gap-1 text-[10px] font-medium text-amber-700 dark:text-amber-300">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> Score {p.score}
        </div>
      )}
    </Link>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Grille view
// ──────────────────────────────────────────────────────────────────────────────
function GrilleView({ items }: { items: Prospect[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-12 text-center">
        <Users className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Aucun prospect</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <table className="w-full">
        <thead className="bg-gray-50 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-700">
          <tr>
            <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 px-4 py-3">Nom</th>
            <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 px-4 py-3">Email</th>
            <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 px-4 py-3">Entreprise</th>
            <th className="text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 px-4 py-3">Statut</th>
            <th className="text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 px-4 py-3">Score</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {items.map((p) => {
            const col = COLUMNS.find((c) => c.value === p.statut);
            const init = initials(p.prenom, p.nom);
            const tone = avatarTone(p.prenom + p.nom);
            return (
              <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/prospects/${p.id}`} className="flex items-center gap-2.5 group">
                    <span className={cn("w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-semibold", tone)}>
                      {init}
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                      {p.prenom} {p.nom}
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{p.email ?? "—"}</td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{p.entreprise ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-gray-300">
                    <span className={cn("w-1.5 h-1.5 rounded-full", col?.topBar ?? "bg-gray-400")} />
                    {col?.label ?? p.statut}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {typeof p.score === "number" ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      {p.score}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
