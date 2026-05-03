"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowUp, ArrowDown, Trash2, Plus, Save, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useApi, useApiMutation, invalidate } from "@/hooks/useApi";
import { notify } from "@/lib/toast";
import { ApiError } from "@/lib/fetcher";
import { api } from "@/lib/fetcher";

interface Formation {
  id: string;
  titre: string;
  duree?: number;
}

interface ParcoursModule {
  id: string;
  ordre: number;
  obligatoire: boolean;
  formationId: string;
  formation: Formation;
}

interface Parcours {
  id: string;
  nom: string;
  description: string | null;
  duree: number;
  tarif: number | null;
  actif: boolean;
  categorie: string | null;
  niveau: string | null;
  modules: ParcoursModule[];
}

export default function ParcoursDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();

  const { data: parcours, isLoading, mutate } = useApi<Parcours>(id ? `/api/parcours/${id}` : null);
  const { data: formationsData } = useApi<{ data: Formation[] } | Formation[]>("/api/formations?actif=true&limit=200");
  const formations: Formation[] = Array.isArray(formationsData)
    ? formationsData
    : (formationsData?.data ?? []);

  const [form, setForm] = useState({
    nom: "",
    description: "",
    duree: 0,
    tarif: "",
    categorie: "",
    niveau: "",
    actif: true,
  });

  useEffect(() => {
    if (parcours) {
      setForm({
        nom: parcours.nom,
        description: parcours.description ?? "",
        duree: parcours.duree,
        tarif: parcours.tarif?.toString() ?? "",
        categorie: parcours.categorie ?? "",
        niveau: parcours.niveau ?? "",
        actif: parcours.actif,
      });
    }
  }, [parcours]);

  const { trigger: updateParcours, isMutating: saving } = useApiMutation<Record<string, unknown>>(
    `/api/parcours/${id}`,
    "PUT"
  );
  const { trigger: deleteParcours } = useApiMutation(`/api/parcours/${id}`, "DELETE");
  const { trigger: addModule, isMutating: addingModule } = useApiMutation<Record<string, unknown>>(
    `/api/parcours/${id}/modules`,
    "POST"
  );

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [moduleModalOpen, setModuleModalOpen] = useState(false);
  const [newModule, setNewModule] = useState({ formationId: "", obligatoire: true });
  const [reorderingId, setReorderingId] = useState<string | null>(null);

  const handleSave = async () => {
    if (!form.nom.trim()) {
      notify.error("Le nom est requis");
      return;
    }
    try {
      const payload: Record<string, unknown> = {
        nom: form.nom.trim(),
        description: form.description.trim() || null,
        duree: Number(form.duree) || 0,
        tarif: form.tarif === "" ? null : Number(form.tarif),
        categorie: form.categorie.trim() || null,
        niveau: form.niveau.trim() || null,
        actif: form.actif,
      };
      await updateParcours(payload);
      notify.success("Parcours mis a jour");
      await mutate();
      await invalidate("/api/parcours");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Erreur";
      notify.error("Erreur", msg);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteParcours();
      await invalidate("/api/parcours");
      notify.success("Parcours supprime");
      router.push("/parcours");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Erreur";
      notify.error("Erreur", msg);
    }
  };

  const handleAddModule = async () => {
    if (!newModule.formationId) {
      notify.error("Selectionnez une formation");
      return;
    }
    try {
      await addModule({
        formationId: newModule.formationId,
        obligatoire: newModule.obligatoire,
      });
      notify.success("Module ajoute");
      setNewModule({ formationId: "", obligatoire: true });
      setModuleModalOpen(false);
      await mutate();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Erreur";
      notify.error("Erreur", msg);
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    try {
      await api.delete(`/api/parcours/${id}/modules/${moduleId}`);
      notify.success("Module supprime");
      await mutate();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Erreur lors de la suppression";
      notify.error("Erreur", msg);
    }
  };

  const handleMove = async (moduleId: string, direction: "up" | "down") => {
    if (!parcours) return;
    const modules = [...parcours.modules].sort((a, b) => a.ordre - b.ordre);
    const idx = modules.findIndex((m) => m.id === moduleId);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= modules.length) return;

    setReorderingId(moduleId);
    try {
      // Echange les ordres via PUT generique sur /api/parcours/[id]/modules/[moduleId]
      const a = modules[idx];
      const b = modules[swapIdx];
      await Promise.all([
        api.put(`/api/parcours/${id}/modules/${a.id}`, { ordre: b.ordre, obligatoire: a.obligatoire }),
        api.put(`/api/parcours/${id}/modules/${b.id}`, { ordre: a.ordre, obligatoire: b.obligatoire }),
      ]);
      await mutate();
    } catch {
      notify.error("Reordonnancement impossible");
    } finally {
      setReorderingId(null);
    }
  };

  if (isLoading || !parcours) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    );
  }

  const sortedModules = [...parcours.modules].sort((a, b) => a.ordre - b.ordre);

  const formationOptions = [
    { value: "", label: "-- Choisir une formation --" },
    ...formations
      .filter((f) => !sortedModules.some((m) => m.formationId === f.id))
      .map((f) => ({ value: f.id, label: f.titre })),
  ];

  return (
    <div>
      <Link
        href="/parcours"
        className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Retour aux parcours
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{parcours.nom}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Edition du parcours et de ses modules</p>
        </div>
        <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
          <Trash2 className="h-4 w-4" /> Supprimer
        </Button>
      </div>

      <Card className="mb-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-base text-gray-900 dark:text-gray-100">Informations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nom <span className="text-red-500">*</span></Label>
            <Input
              value={form.nom}
              onChange={(e) => setForm({ ...form, nom: e.target.value })}
              className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label>Duree (h)</Label>
              <Input
                type="number"
                value={form.duree}
                onChange={(e) => setForm({ ...form, duree: Number(e.target.value) })}
                className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tarif (EUR HT)</Label>
              <Input
                type="number"
                value={form.tarif}
                onChange={(e) => setForm({ ...form, tarif: e.target.value })}
                step="0.01"
                className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Categorie</Label>
              <Input
                value={form.categorie}
                onChange={(e) => setForm({ ...form, categorie: e.target.value })}
                className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Niveau</Label>
              <Input
                value={form.niveau}
                onChange={(e) => setForm({ ...form, niveau: e.target.value })}
                className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={form.actif}
              onChange={(e) => setForm({ ...form, actif: e.target.checked })}
              className="rounded border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-red-600 focus:ring-red-600"
            />
            Parcours actif
          </label>
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="bg-red-600 hover:bg-red-700">
              <Save className="h-4 w-4" /> {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base text-gray-900 dark:text-gray-100">Modules ({sortedModules.length})</CardTitle>
          <Button onClick={() => setModuleModalOpen(true)} className="bg-red-600 hover:bg-red-700" size="sm">
            <Plus className="h-4 w-4" /> Ajouter un module
          </Button>
        </CardHeader>
        <CardContent>
          {sortedModules.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
              Aucun module. Ajoutez la premiere formation du parcours.
            </p>
          ) : (
            <div className="space-y-2">
              {sortedModules.map((m, i) => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-3 py-2.5"
                >
                  <span className="h-7 w-7 rounded-full bg-red-600/20 text-red-400 flex items-center justify-center text-xs font-bold shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {m.formation?.titre ?? "Formation supprimee"}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {m.obligatoire ? "Obligatoire" : "Optionnel"}
                      {m.formation?.duree ? ` - ${m.formation.duree}h` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleMove(m.id, "up")}
                      disabled={i === 0 || reorderingId === m.id}
                      className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 disabled:opacity-30 disabled:pointer-events-none"
                      aria-label="Monter"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleMove(m.id, "down")}
                      disabled={i === sortedModules.length - 1 || reorderingId === m.id}
                      className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 disabled:opacity-30 disabled:pointer-events-none"
                      aria-label="Descendre"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteModule(m.id)}
                      className="p-1.5 rounded hover:bg-red-600/20 text-red-400"
                      aria-label="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={moduleModalOpen} onOpenChange={setModuleModalOpen}>
        <DialogContent
          onClose={() => setModuleModalOpen(false)}
          className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
        >
          <DialogHeader>
            <DialogTitle>Ajouter un module</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Formation <span className="text-red-500">*</span></Label>
              <Select
                value={newModule.formationId}
                onChange={(e) => setNewModule({ ...newModule, formationId: e.target.value })}
                options={formationOptions}
                className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={newModule.obligatoire}
                onChange={(e) => setNewModule({ ...newModule, obligatoire: e.target.checked })}
                className="rounded border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-red-600 focus:ring-red-600"
              />
              Module obligatoire
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModuleModalOpen(false)}>Annuler</Button>
            <Button
              onClick={handleAddModule}
              disabled={addingModule}
              className="bg-red-600 hover:bg-red-700"
            >
              {addingModule ? "Ajout..." : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Supprimer ce parcours ?"
        description="Cette action est irreversible. Tous les modules seront egalement supprimes."
        onConfirm={handleDelete}
      />
    </div>
  );
}
