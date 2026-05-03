"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Route, Search, Plus, Layers, Clock, CalendarDays } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { SkeletonTable } from "@/components/shared/Skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useApi, useApiMutation, invalidate } from "@/hooks/useApi";
import { notify } from "@/lib/toast";
import { ApiError } from "@/lib/fetcher";

interface Parcours {
  id: string;
  nom: string;
  description: string | null;
  duree: number;
  tarif: number | null;
  actif: boolean;
  categorie: string | null;
  niveau: string | null;
  _count?: { modules: number; sessions: number };
}

export default function ParcoursListPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showActifOnly, setShowActifOnly] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);
  const [form, setForm] = useState({
    nom: "",
    description: "",
    duree: 0,
    tarif: "",
    categorie: "",
    niveau: "",
  });

  const url = showActifOnly ? "/api/parcours?actif=true" : "/api/parcours";
  const { data, isLoading, error } = useApi<Parcours[]>(url);
  const items = useMemo(() => {
    const list = data ?? [];
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter(
      (p) =>
        p.nom.toLowerCase().includes(q) ||
        (p.categorie ?? "").toLowerCase().includes(q) ||
        (p.niveau ?? "").toLowerCase().includes(q)
    );
  }, [data, search]);

  const { trigger: createParcours, isMutating: saving } = useApiMutation<Record<string, unknown>, Parcours>(
    "/api/parcours",
    "POST"
  );

  const handleCreate = async () => {
    if (!form.nom.trim()) {
      notify.error("Le nom est requis");
      return;
    }
    try {
      const payload: Record<string, unknown> = {
        nom: form.nom.trim(),
        duree: Number(form.duree) || 0,
      };
      if (form.description.trim()) payload.description = form.description.trim();
      if (form.tarif !== "") payload.tarif = Number(form.tarif);
      if (form.categorie.trim()) payload.categorie = form.categorie.trim();
      if (form.niveau.trim()) payload.niveau = form.niveau.trim();

      const created = await createParcours(payload);
      await invalidate("/api/parcours", "/api/parcours?actif=true");
      notify.success("Parcours cree", created.nom);
      setOpenCreate(false);
      router.push(`/parcours/${created.id}`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Erreur lors de la creation";
      notify.error("Erreur", msg);
    }
  };

  return (
    <div>
      <PageHeader
        title="Parcours"
        description="Cycles multi-formations (ex: SSIAP1 puis SSIAP2 puis recyclages)"
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowActifOnly(false)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              !showActifOnly
                ? "bg-red-600 text-white"
                : "bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-700"
            }`}
          >
            Tous
          </button>
          <button
            onClick={() => setShowActifOnly(true)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              showActifOnly
                ? "bg-red-600 text-white"
                : "bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-700"
            }`}
          >
            Actifs uniquement
          </button>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-gray-800 border-gray-700 h-9 text-sm"
            />
          </div>
          <Button onClick={() => setOpenCreate(true)} className="bg-red-600 hover:bg-red-700">
            <Plus className="h-4 w-4" /> Nouveau parcours
          </Button>
        </div>
      </div>

      {isLoading ? (
        <SkeletonTable rows={6} cols={5} />
      ) : error ? (
        <EmptyState
          icon={Route}
          title="Erreur de chargement"
          description={error.message}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Route}
          title="Aucun parcours"
          description={search ? "Essayez d'autres mots cles." : "Creez votre premier parcours multi-formations."}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((p) => (
            <Link
              key={p.id}
              href={`/parcours/${p.id}`}
              className="group rounded-xl border border-gray-700 bg-gray-800 hover:border-red-700/40 hover:bg-gray-750 p-4 transition-all"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="text-sm font-semibold text-gray-100 group-hover:text-red-400 truncate">
                  {p.nom}
                </h3>
                <span
                  className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    p.actif
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-gray-700 text-gray-400"
                  }`}
                >
                  {p.actif ? "Actif" : "Inactif"}
                </span>
              </div>
              {p.description && (
                <p className="text-xs text-gray-400 line-clamp-2 mb-3">{p.description}</p>
              )}
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Layers className="h-3 w-3" /> {p._count?.modules ?? 0} modules
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {p.duree}h
                </span>
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" /> {p._count?.sessions ?? 0} sessions
                </span>
              </div>
              {(p.categorie || p.niveau || p.tarif) && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-700/60 text-[11px] text-gray-400">
                  {p.categorie && (
                    <span className="px-1.5 py-0.5 rounded bg-gray-700/60">{p.categorie}</span>
                  )}
                  {p.niveau && (
                    <span className="px-1.5 py-0.5 rounded bg-gray-700/60">{p.niveau}</span>
                  )}
                  {p.tarif !== null && p.tarif !== undefined && (
                    <span className="ml-auto text-red-400 font-medium">{p.tarif} EUR</span>
                  )}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent onClose={() => setOpenCreate(false)} className="bg-gray-800 border-gray-700 text-gray-100">
          <DialogHeader>
            <DialogTitle>Nouveau parcours</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nom <span className="text-red-500">*</span></Label>
              <Input
                value={form.nom}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
                placeholder="ex: Cycle SSIAP complet"
                className="bg-gray-900 border-gray-700"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                className="bg-gray-900 border-gray-700"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Duree (heures) <span className="text-red-500">*</span></Label>
                <Input
                  type="number"
                  value={form.duree}
                  onChange={(e) => setForm({ ...form, duree: Number(e.target.value) })}
                  min={0}
                  className="bg-gray-900 border-gray-700"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tarif (EUR HT)</Label>
                <Input
                  type="number"
                  value={form.tarif}
                  onChange={(e) => setForm({ ...form, tarif: e.target.value })}
                  min={0}
                  step="0.01"
                  className="bg-gray-900 border-gray-700"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Categorie</Label>
                <Input
                  value={form.categorie}
                  onChange={(e) => setForm({ ...form, categorie: e.target.value })}
                  placeholder="SSIAP"
                  className="bg-gray-900 border-gray-700"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Niveau</Label>
                <Input
                  value={form.niveau}
                  onChange={(e) => setForm({ ...form, niveau: e.target.value })}
                  placeholder="Initial / Recyclage"
                  className="bg-gray-900 border-gray-700"
                />
              </div>
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
