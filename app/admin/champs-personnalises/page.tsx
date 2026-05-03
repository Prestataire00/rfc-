"use client";

import { useMemo, useState } from "react";
import {
  ListChecks, Plus, Pencil, Trash2, ArrowUp, ArrowDown,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { SkeletonTable } from "@/components/shared/Skeleton";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useApi, useApiMutation, invalidate } from "@/hooks/useApi";
import { notify } from "@/lib/toast";
import { ApiError, api } from "@/lib/fetcher";

interface Champ {
  id: string;
  nom: string;
  label: string;
  type: string;
  entiteCible: string;
  options: unknown;
  obligatoire: boolean;
  ordre: number;
  actif: boolean;
}

const ENTITES = [
  { value: "Contact", label: "Contact" },
  { value: "Entreprise", label: "Entreprise" },
  { value: "Formation", label: "Formation" },
  { value: "Session", label: "Session" },
  { value: "Inscription", label: "Inscription" },
];

const TYPES = [
  { value: "text", label: "Texte" },
  { value: "number", label: "Nombre" },
  { value: "date", label: "Date" },
  { value: "select", label: "Liste deroulante" },
  { value: "boolean", label: "Booleen" },
  { value: "textarea", label: "Texte long" },
];

const TYPE_BADGE: Record<string, string> = {
  text: "bg-blue-500/20 text-blue-700 dark:text-blue-300",
  number: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
  date: "bg-amber-500/20 text-amber-700 dark:text-amber-300",
  select: "bg-purple-500/20 text-purple-700 dark:text-purple-300",
  boolean: "bg-pink-500/20 text-pink-700 dark:text-pink-300",
  textarea: "bg-cyan-500/20 text-cyan-700 dark:text-cyan-300",
};

interface FormState {
  nom: string;
  label: string;
  type: string;
  entiteCible: string;
  optionsRaw: string;
  obligatoire: boolean;
  actif: boolean;
}

const emptyForm: FormState = {
  nom: "",
  label: "",
  type: "text",
  entiteCible: "Contact",
  optionsRaw: "",
  obligatoire: false,
  actif: true,
};

export default function ChampsPersonnalisesPage() {
  const [filterEntite, setFilterEntite] = useState<string>("Contact");
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState<Champ | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [confirmDelete, setConfirmDelete] = useState<Champ | null>(null);
  const [reorderingId, setReorderingId] = useState<string | null>(null);

  const url = `/api/champs-personnalises?entiteCible=${encodeURIComponent(filterEntite)}`;
  const { data, isLoading } = useApi<Champ[]>(url);
  const items = data ?? [];

  const sorted = useMemo(
    () => [...items].sort((a, b) => a.ordre - b.ordre),
    [items]
  );

  const { trigger: createChamp, isMutating: creating } = useApiMutation<
    Record<string, unknown>,
    Champ
  >("/api/champs-personnalises", "POST");

  const openForCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, entiteCible: filterEntite });
    setOpenModal(true);
  };

  const openForEdit = (c: Champ) => {
    setEditing(c);
    let optionsRaw = "";
    if (c.options) {
      try {
        optionsRaw = JSON.stringify(c.options, null, 2);
      } catch {
        optionsRaw = "";
      }
    }
    setForm({
      nom: c.nom,
      label: c.label,
      type: c.type,
      entiteCible: c.entiteCible,
      optionsRaw,
      obligatoire: c.obligatoire,
      actif: c.actif,
    });
    setOpenModal(true);
  };

  const buildPayload = (): Record<string, unknown> | null => {
    if (!form.nom.trim() || !form.label.trim()) {
      notify.error("Nom et label sont requis");
      return null;
    }
    let options: unknown = null;
    if (form.type === "select" && form.optionsRaw.trim()) {
      try {
        options = JSON.parse(form.optionsRaw);
      } catch {
        notify.error("Options invalides", "Le champ options doit etre un JSON valide");
        return null;
      }
    }
    return {
      nom: form.nom.trim(),
      label: form.label.trim(),
      type: form.type,
      entiteCible: form.entiteCible,
      options,
      obligatoire: form.obligatoire,
      actif: form.actif,
    };
  };

  const handleSave = async () => {
    const payload = buildPayload();
    if (!payload) return;
    try {
      if (editing) {
        await api.put(`/api/champs-personnalises/${editing.id}`, {
          ...payload,
          ordre: editing.ordre,
        });
        notify.success("Champ mis a jour");
      } else {
        await createChamp({ ...payload, ordre: sorted.length });
        notify.success("Champ cree");
      }
      await invalidate(url);
      setOpenModal(false);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Erreur lors de l'enregistrement";
      notify.error("Erreur", msg);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await api.delete(`/api/champs-personnalises/${confirmDelete.id}`);
      await invalidate(url);
      notify.success("Champ supprime");
      setConfirmDelete(null);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Erreur lors de la suppression";
      notify.error("Erreur", msg);
    }
  };

  const toggleActif = async (c: Champ) => {
    try {
      await api.put(`/api/champs-personnalises/${c.id}`, {
        nom: c.nom,
        label: c.label,
        type: c.type,
        entiteCible: c.entiteCible,
        options: c.options ?? null,
        obligatoire: c.obligatoire,
        ordre: c.ordre,
        actif: !c.actif,
      });
      await invalidate(url);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Erreur";
      notify.error("Erreur", msg);
    }
  };

  const move = async (c: Champ, dir: -1 | 1) => {
    const idx = sorted.findIndex((x) => x.id === c.id);
    const otherIdx = idx + dir;
    if (otherIdx < 0 || otherIdx >= sorted.length) return;
    const other = sorted[otherIdx];
    setReorderingId(c.id);
    try {
      await Promise.all([
        api.put(`/api/champs-personnalises/${c.id}`, {
          nom: c.nom, label: c.label, type: c.type, entiteCible: c.entiteCible,
          options: c.options ?? null, obligatoire: c.obligatoire, actif: c.actif,
          ordre: other.ordre,
        }),
        api.put(`/api/champs-personnalises/${other.id}`, {
          nom: other.nom, label: other.label, type: other.type, entiteCible: other.entiteCible,
          options: other.options ?? null, obligatoire: other.obligatoire, actif: other.actif,
          ordre: c.ordre,
        }),
      ]);
      await invalidate(url);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Erreur reordonnancement";
      notify.error("Erreur", msg);
    } finally {
      setReorderingId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Champs personnalises"
        description="Definissez des champs supplementaires sur vos entites principales"
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-gray-500 dark:text-gray-400">Entite cible</Label>
          <Select
            value={filterEntite}
            onChange={(e) => setFilterEntite(e.target.value)}
            options={ENTITES}
            className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 h-9 w-48"
          />
        </div>
        <Button onClick={openForCreate} className="bg-red-600 hover:bg-red-700">
          <Plus className="h-4 w-4" /> Ajouter un champ
        </Button>
      </div>

      {isLoading ? (
        <SkeletonTable rows={5} cols={7} />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Aucun champ personnalise"
          description={`Aucun champ defini pour ${filterEntite}.`}
        />
      ) : (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 text-xs uppercase text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-3 py-3 text-left">Ordre</th>
                <th className="px-3 py-3 text-left">Nom</th>
                <th className="px-3 py-3 text-left">Label</th>
                <th className="px-3 py-3 text-left">Type</th>
                <th className="px-3 py-3 text-center">Obligatoire</th>
                <th className="px-3 py-3 text-center">Actif</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {sorted.map((c, i) => (
                <tr key={c.id} className="hover:bg-gray-750">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => move(c, -1)}
                        disabled={i === 0 || reorderingId === c.id}
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                        aria-label="Monter"
                      >
                        <ArrowUp className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
                      </button>
                      <button
                        onClick={() => move(c, 1)}
                        disabled={i === sorted.length - 1 || reorderingId === c.id}
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                        aria-label="Descendre"
                      >
                        <ArrowDown className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
                      </button>
                      <span className="text-xs text-gray-500 ml-1">{c.ordre}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-gray-700 dark:text-gray-300">{c.nom}</td>
                  <td className="px-3 py-2.5 text-gray-900 dark:text-gray-100">{c.label}</td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                        TYPE_BADGE[c.type] ?? "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {c.type}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={c.obligatoire}
                      readOnly
                      className="accent-red-600"
                    />
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <button
                      onClick={() => toggleActif(c)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        c.actif ? "bg-red-600" : "bg-gray-600"
                      }`}
                      aria-label="Toggle actif"
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          c.actif ? "translate-x-5" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openForEdit(c)}
                        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                        aria-label="Editer"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(c)}
                        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-red-400"
                        aria-label="Supprimer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent
          onClose={() => setOpenModal(false)}
          className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 max-w-xl"
        >
          <DialogHeader>
            <DialogTitle>
              {editing ? "Modifier le champ" : "Nouveau champ personnalise"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nom interne <span className="text-red-500">*</span></Label>
                <Input
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  placeholder="ex: numero_carte_pro"
                  className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Label affiche <span className="text-red-500">*</span></Label>
                <Input
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  placeholder="ex: Numero carte professionnelle"
                  className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  options={TYPES}
                  className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Entite cible</Label>
                <Select
                  value={form.entiteCible}
                  onChange={(e) => setForm({ ...form, entiteCible: e.target.value })}
                  options={ENTITES}
                  className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
            {form.type === "select" && (
              <div className="space-y-1.5">
                <Label>Options (JSON)</Label>
                <Textarea
                  value={form.optionsRaw}
                  onChange={(e) => setForm({ ...form, optionsRaw: e.target.value })}
                  rows={4}
                  placeholder={`["Option A", "Option B", "Option C"]`}
                  className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 font-mono text-xs"
                />
                <p className="text-[10px] text-gray-500">
                  Tableau JSON de chaines de caracteres.
                </p>
              </div>
            )}
            <div className="flex items-center gap-6 pt-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.obligatoire}
                  onChange={(e) => setForm({ ...form, obligatoire: e.target.checked })}
                  className="accent-red-600"
                />
                Obligatoire
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.actif}
                  onChange={(e) => setForm({ ...form, actif: e.target.checked })}
                  className="accent-red-600"
                />
                Actif
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenModal(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={creating}
              className="bg-red-600 hover:bg-red-700"
            >
              {creating ? "Enregistrement..." : editing ? "Enregistrer" : "Creer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        title="Supprimer le champ ?"
        description={`Le champ "${confirmDelete?.label ?? ""}" et toutes ses valeurs seront supprimes definitivement.`}
        onConfirm={handleDelete}
      />
    </div>
  );
}
