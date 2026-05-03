"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, ListChecks, Trash2, Calendar, Loader2, X } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useApi, useApiMutation, invalidate } from "@/hooks/useApi";
import { notify } from "@/lib/toast";
import { ApiError, api } from "@/lib/fetcher";

interface TaskList {
  id: string;
  nom: string;
  description: string | null;
  sessionId: string | null;
  userId: string | null;
  couleur: string;
  _count?: { items: number };
}

interface TaskItem {
  id: string;
  titre: string;
  description: string | null;
  completed: boolean;
  dueDate: string | null;
  priorite: string | null;
  ordre: number;
  userId: string | null;
}

interface TaskListDetail extends TaskList {
  items: TaskItem[];
}

interface Session {
  id: string;
  formation?: { titre: string };
  dateDebut: string;
}

interface User {
  id: string;
  nom: string;
  prenom: string;
}

const PRIORITES = [
  { value: "", label: "Aucune priorite" },
  { value: "basse", label: "Basse" },
  { value: "moyenne", label: "Moyenne" },
  { value: "haute", label: "Haute" },
  { value: "urgente", label: "Urgente" },
];

const PRIORITE_COLORS: Record<string, string> = {
  basse: "bg-gray-700 text-gray-300",
  moyenne: "bg-blue-500/20 text-blue-300",
  haute: "bg-amber-500/20 text-amber-300",
  urgente: "bg-red-600/30 text-red-300",
};

export default function TasksPage() {
  const { data: lists, mutate: mutateLists, isLoading: loadingLists } = useApi<TaskList[]>("/api/task-lists");
  const { data: sessions } = useApi<Session[]>("/api/sessions?limit=100");
  const { data: users } = useApi<User[]>("/api/utilisateurs");

  const [selectedListId, setSelectedListId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedListId && lists && lists.length > 0) {
      setSelectedListId(lists[0].id);
    }
  }, [lists, selectedListId]);

  const { data: selectedList, mutate: mutateList } = useApi<TaskListDetail>(
    selectedListId ? `/api/task-lists/${selectedListId}` : null
  );

  const [openCreateList, setOpenCreateList] = useState(false);
  const [listForm, setListForm] = useState({
    nom: "",
    sessionId: "",
    couleur: "#dc2626",
  });

  const { trigger: createList, isMutating: creatingList } = useApiMutation<Record<string, unknown>, TaskList>(
    "/api/task-lists",
    "POST"
  );

  const handleCreateList = async () => {
    if (!listForm.nom.trim()) {
      notify.error("Le nom est requis");
      return;
    }
    try {
      const payload: Record<string, unknown> = {
        nom: listForm.nom.trim(),
        couleur: listForm.couleur,
      };
      if (listForm.sessionId) payload.sessionId = listForm.sessionId;
      const created = await createList(payload);
      await invalidate("/api/task-lists");
      notify.success("Liste creee");
      setSelectedListId(created.id);
      setOpenCreateList(false);
      setListForm({ nom: "", sessionId: "", couleur: "#dc2626" });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Erreur";
      notify.error("Erreur", msg);
    }
  };

  const handleDeleteList = async (id: string) => {
    if (!window.confirm("Supprimer cette liste et toutes ses taches ?")) return;
    try {
      await api.delete(`/api/task-lists/${id}`);
      await invalidate("/api/task-lists");
      if (selectedListId === id) setSelectedListId(null);
      notify.success("Liste supprimee");
    } catch {
      notify.error("Erreur lors de la suppression");
    }
  };

  // ---- Items
  const [newItem, setNewItem] = useState({ titre: "", priorite: "", dueDate: "", userId: "" });
  const [savingItem, setSavingItem] = useState(false);

  const handleAddItem = async () => {
    if (!selectedListId || !newItem.titre.trim()) return;
    setSavingItem(true);
    try {
      await api.post(`/api/task-lists/${selectedListId}/items`, {
        titre: newItem.titre.trim(),
        priorite: newItem.priorite || null,
        dueDate: newItem.dueDate || null,
        userId: newItem.userId || null,
      });
      setNewItem({ titre: "", priorite: "", dueDate: "", userId: "" });
      await mutateList();
      await mutateLists();
    } catch {
      notify.error("Erreur lors de l'ajout");
    } finally {
      setSavingItem(false);
    }
  };

  const handleToggleItem = async (item: TaskItem) => {
    try {
      await api.put(`/api/task-items/${item.id}`, {
        titre: item.titre,
        completed: !item.completed,
        ordre: item.ordre,
        priorite: item.priorite,
      });
      await mutateList();
    } catch {
      notify.error("Mise a jour impossible");
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await api.delete(`/api/task-items/${id}`);
      await mutateList();
      await mutateLists();
    } catch {
      notify.error("Suppression impossible");
    }
  };

  const sessionOptions = useMemo(
    () => [
      { value: "", label: "Aucune session" },
      ...((sessions ?? []).map((s) => ({
        value: s.id,
        label: `${s.formation?.titre ?? "Session"} - ${new Date(s.dateDebut).toLocaleDateString("fr-FR")}`,
      }))),
    ],
    [sessions]
  );

  const userOptions = useMemo(
    () => [
      { value: "", label: "Non assignee" },
      ...((users ?? []).map((u) => ({ value: u.id, label: `${u.prenom} ${u.nom}` }))),
    ],
    [users]
  );

  return (
    <div>
      <PageHeader title="Taches" description="Gestion des listes de taches (admin global)" />

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        {/* Sidebar listes */}
        <aside className="rounded-xl border border-gray-700 bg-gray-800 p-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Listes</h2>
            <button
              onClick={() => setOpenCreateList(true)}
              className="rounded-md bg-red-600 hover:bg-red-700 p-1.5 text-white"
              aria-label="Nouvelle liste"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          {loadingLists ? (
            <Loader2 className="h-5 w-5 animate-spin text-red-600 mx-auto my-4" />
          ) : (lists ?? []).length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-6">Aucune liste</p>
          ) : (
            <div className="space-y-1">
              {(lists ?? []).map((l) => (
                <div
                  key={l.id}
                  className={`group flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer transition-colors ${
                    selectedListId === l.id
                      ? "bg-red-600/20 text-red-300"
                      : "text-gray-300 hover:bg-gray-700"
                  }`}
                  onClick={() => setSelectedListId(l.id)}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: l.couleur }}
                  />
                  <span className="flex-1 truncate">{l.nom}</span>
                  <span className="text-[10px] text-gray-500">{l._count?.items ?? 0}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteList(l.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400"
                    aria-label="Supprimer la liste"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </aside>

        {/* Main items */}
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-4 min-h-[400px]">
          {!selectedListId || !selectedList ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400">
              <ListChecks className="h-10 w-10 mb-3 text-gray-500" />
              <p className="text-sm">Selectionnez ou creez une liste pour commencer</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-4">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: selectedList.couleur }}
                />
                <h2 className="text-lg font-semibold text-gray-100">{selectedList.nom}</h2>
                <span className="text-xs text-gray-500">
                  {selectedList.items.length} tache{selectedList.items.length > 1 ? "s" : ""}
                </span>
              </div>

              {/* Items */}
              {selectedList.items.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">
                  Aucune tache. Ajoutez-en une ci-dessous.
                </p>
              ) : (
                <div className="space-y-1.5 mb-4">
                  {selectedList.items.map((item) => {
                    const userMatch = users?.find((u) => u.id === item.userId);
                    return (
                      <div
                        key={item.id}
                        className={`group flex items-center gap-3 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 ${
                          item.completed ? "opacity-60" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={item.completed}
                          onChange={() => handleToggleItem(item)}
                          className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-red-600 focus:ring-red-600"
                        />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm text-gray-100 ${item.completed ? "line-through" : ""}`}>
                            {item.titre}
                          </p>
                          {(item.dueDate || userMatch) && (
                            <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-0.5">
                              {item.dueDate && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(item.dueDate).toLocaleDateString("fr-FR")}
                                </span>
                              )}
                              {userMatch && <span>{userMatch.prenom} {userMatch.nom}</span>}
                            </div>
                          )}
                        </div>
                        {item.priorite && (
                          <span
                            className={`text-[10px] font-bold uppercase rounded px-2 py-0.5 ${
                              PRIORITE_COLORS[item.priorite] ?? "bg-gray-700 text-gray-300"
                            }`}
                          >
                            {item.priorite}
                          </span>
                        )}
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400"
                          aria-label="Supprimer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add item */}
              <div className="rounded-lg border border-gray-700 bg-gray-900 p-3 space-y-2">
                <Input
                  placeholder="Nouvelle tache..."
                  value={newItem.titre}
                  onChange={(e) => setNewItem({ ...newItem, titre: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddItem();
                  }}
                  className="bg-gray-800 border-gray-700"
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Select
                    value={newItem.priorite}
                    onChange={(e) => setNewItem({ ...newItem, priorite: e.target.value })}
                    options={PRIORITES}
                    className="bg-gray-800 border-gray-700 h-9 text-xs"
                  />
                  <Input
                    type="date"
                    value={newItem.dueDate}
                    onChange={(e) => setNewItem({ ...newItem, dueDate: e.target.value })}
                    className="bg-gray-800 border-gray-700 h-9 text-xs"
                  />
                  <Select
                    value={newItem.userId}
                    onChange={(e) => setNewItem({ ...newItem, userId: e.target.value })}
                    options={userOptions}
                    className="bg-gray-800 border-gray-700 h-9 text-xs"
                  />
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={handleAddItem}
                    disabled={savingItem || !newItem.titre.trim()}
                    size="sm"
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <Plus className="h-3.5 w-3.5" /> Ajouter
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <Dialog open={openCreateList} onOpenChange={setOpenCreateList}>
        <DialogContent
          onClose={() => setOpenCreateList(false)}
          className="bg-gray-800 border-gray-700 text-gray-100"
        >
          <DialogHeader>
            <DialogTitle>Nouvelle liste</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nom *</Label>
              <Input
                value={listForm.nom}
                onChange={(e) => setListForm({ ...listForm, nom: e.target.value })}
                className="bg-gray-900 border-gray-700"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Session associee (optionnel)</Label>
              <Select
                value={listForm.sessionId}
                onChange={(e) => setListForm({ ...listForm, sessionId: e.target.value })}
                options={sessionOptions}
                className="bg-gray-900 border-gray-700"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Couleur</Label>
              <input
                type="color"
                value={listForm.couleur}
                onChange={(e) => setListForm({ ...listForm, couleur: e.target.value })}
                className="h-10 w-20 rounded border border-gray-700 bg-gray-900 cursor-pointer"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreateList(false)}>Annuler</Button>
            <Button onClick={handleCreateList} disabled={creatingList} className="bg-red-600 hover:bg-red-700">
              {creatingList ? "Creation..." : "Creer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
