"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Plus, Star, Building2, Calendar } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
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
import { formatDate } from "@/lib/utils";

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

const COLUMNS: { value: string; label: string; color: string }[] = [
  { value: "nouveau", label: "Nouveau", color: "border-blue-500/50 bg-blue-500/5" },
  { value: "qualifie", label: "Qualifie", color: "border-amber-500/50 bg-amber-500/5" },
  { value: "proposition", label: "Proposition", color: "border-purple-500/50 bg-purple-500/5" },
  { value: "gagne", label: "Gagne", color: "border-emerald-500/50 bg-emerald-500/5" },
  { value: "perdu", label: "Perdu", color: "border-gray-500/50 bg-gray-500/5" },
];

export default function ProspectsKanbanPage() {
  const [search, setSearch] = useState("");
  const [filterAttribue, setFilterAttribue] = useState("");
  const [openCreate, setOpenCreate] = useState(false);
  const [form, setForm] = useState({
    prenom: "",
    nom: "",
    email: "",
    telephone: "",
    entreprise: "",
    source: "",
    statut: "nouveau",
    score: 50,
    notes: "",
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
        (p.email ?? "").toLowerCase().includes(q)
    );
  }, [prospects, search]);

  const byStatut = useMemo(() => {
    const groups: Record<string, Prospect[]> = {};
    for (const c of COLUMNS) groups[c.value] = [];
    for (const p of filtered) {
      if (groups[p.statut]) groups[p.statut].push(p);
      else (groups[p.statut] = [p]);
    }
    return groups;
  }, [filtered]);

  const { trigger: createProspect, isMutating: saving } = useApiMutation<Record<string, unknown>, Prospect>(
    "/api/prospects",
    "POST"
  );

  const handleCreate = async () => {
    if (!form.prenom.trim() || !form.nom.trim()) {
      notify.error("Prenom et nom obligatoires");
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
      notify.success("Prospect cree");
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
      <PageHeader
        title="Prospects"
        description="Pipeline commercial : suivi du cycle de vente jusqu'a la conversion"
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 h-9 text-sm"
            />
          </div>
          <div className="w-48">
            <Select
              value={filterAttribue}
              onChange={(e) => setFilterAttribue(e.target.value)}
              options={userOptions}
              className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 h-9 text-sm"
            />
          </div>
        </div>
        <Button onClick={() => setOpenCreate(true)} className="bg-red-600 hover:bg-red-700">
          <Plus className="h-4 w-4" /> Nouveau prospect
        </Button>
      </div>

      {isLoading ? (
        <SkeletonTable rows={4} cols={5} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {COLUMNS.map((col) => {
            const items = byStatut[col.value] ?? [];
            return (
              <div
                key={col.value}
                className={`rounded-xl border ${col.color} p-2 min-h-[300px]`}
              >
                <div className="flex items-center justify-between px-2 py-1.5 mb-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                    {col.label}
                  </h3>
                  <span className="text-[10px] font-bold rounded-full bg-gray-50 dark:bg-gray-900/50 px-2 py-0.5 text-gray-700 dark:text-gray-300">
                    {items.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {items.length === 0 && (
                    <p className="text-[11px] text-gray-500 text-center py-4">Vide</p>
                  )}
                  {items.map((p) => (
                    <Link
                      key={p.id}
                      href={`/prospects/${p.id}`}
                      className="block rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-red-700/40 p-3 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {p.prenom} {p.nom}
                        </p>
                        {typeof p.score === "number" && (
                          <span className="shrink-0 inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                            <Star className="h-3 w-3 fill-amber-300" /> {p.score}
                          </span>
                        )}
                      </div>
                      {p.entreprise && (
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1 truncate mb-1">
                          <Building2 className="h-3 w-3 shrink-0" /> {p.entreprise}
                        </p>
                      )}
                      {p.dateProchaineAction && (
                        <p className="text-[10px] text-red-400 flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {formatDate(p.dateProchaineAction)}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

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
                <Label>Prenom *</Label>
                <Input
                  value={form.prenom}
                  onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                  className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Nom *</Label>
                <Input
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Telephone</Label>
                <Input
                  value={form.telephone}
                  onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                  className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Entreprise</Label>
              <Input
                value={form.entreprise}
                onChange={(e) => setForm({ ...form, entreprise: e.target.value })}
                className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Statut</Label>
                <Select
                  value={form.statut}
                  onChange={(e) => setForm({ ...form, statut: e.target.value })}
                  options={COLUMNS.map((c) => ({ value: c.value, label: c.label }))}
                  className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
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
                className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>Annuler</Button>
            <Button onClick={handleCreate} disabled={saving} className="bg-red-600 hover:bg-red-700">
              {saving ? "Creation..." : "Creer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
