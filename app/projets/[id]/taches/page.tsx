"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import {
  ArrowLeft, ListChecks, CheckCircle2, Circle, AlertCircle, Trash2,
  Plus, X, UserCircle, MessageSquare,
} from "lucide-react";
import { TaskCommentsModal } from "@/components/shared/TaskCommentsModal";
import { GenerateTasksModal } from "@/components/shared/GenerateTasksModal";

interface TaskItem {
  id: string;
  titre: string;
  description: string | null;
  completed: boolean;
  dueDate: string | null;
  priorite: string | null;
  userId: string | null;
}

interface TaskListWithStats {
  id: string;
  nom: string;
  description: string | null;
  couleur: string;
  items: TaskItem[];
  stats: { total: number; completed: number; percent: number };
}

interface TachesResponse {
  projet: { id: string; nom: string; objectifs: string | null };
  lists: TaskListWithStats[];
  stats: { totalLists: number; totalItems: number; completedItems: number; percent: number };
}

interface Formateur {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  actif: boolean;
  user: { id: string } | null;
}

const fetcher = (u: string) => fetch(u).then((r) => {
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
});

const PRIO_COLORS: Record<string, string> = {
  basse: "bg-gray-200 text-gray-700",
  moyenne: "bg-blue-200 text-blue-800",
  haute: "bg-orange-200 text-orange-900",
  urgente: "bg-red-200 text-red-900",
};

const COULEURS = ["#dc2626", "#2563eb", "#16a34a", "#ea580c", "#9333ea", "#0891b2"];

export default function ProjetTachesPage() {
  const { id } = useParams<{ id: string }>();
  const { data, error, isLoading, mutate } = useSWR<TachesResponse>(
    `/api/projets/${id}/taches`,
    fetcher,
  );
  const { data: formateurs } = useSWR<Formateur[]>("/api/formateurs", fetcher);

  // Form state pour création de liste
  const [newListOpen, setNewListOpen] = useState(false);
  const [newListNom, setNewListNom] = useState("");
  const [newListCouleur, setNewListCouleur] = useState(COULEURS[0]);

  // Form state pour création de tâche (par liste)
  const [newTaskListId, setNewTaskListId] = useState<string | null>(null);
  const [newTaskTitre, setNewTaskTitre] = useState("");

  // Modal commentaires (rich text) — ouvert au clic sur le titre d'une tâche
  const [commentsTask, setCommentsTask] = useState<{ id: string; titre: string } | null>(null);
  const { data: session } = useSession();

  // Génération IA des tâches depuis objectifs (PR #5)
  const [genOpen, setGenOpen] = useState(false);

  const formateursAvecUser = (formateurs ?? []).filter((f) => f.actif && f.user?.id);

  const createList = async () => {
    if (!newListNom.trim()) return;
    await fetch("/api/task-lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom: newListNom.trim(), couleur: newListCouleur, projetId: id }),
    });
    setNewListNom("");
    setNewListOpen(false);
    mutate();
  };

  const deleteList = async (listId: string) => {
    if (!confirm("Supprimer cette liste et toutes ses tâches ?")) return;
    await fetch(`/api/task-lists/${listId}`, { method: "DELETE" });
    mutate();
  };

  const createTask = async (listId: string) => {
    if (!newTaskTitre.trim()) return;
    await fetch("/api/task-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listId, titre: newTaskTitre.trim() }),
    });
    setNewTaskTitre("");
    setNewTaskListId(null);
    mutate();
  };

  const toggleCompleted = async (item: TaskItem) => {
    await fetch(`/api/task-items/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...item, completed: !item.completed }),
    });
    mutate();
  };

  const deleteTask = async (taskId: string) => {
    if (!confirm("Supprimer cette tâche ?")) return;
    await fetch(`/api/task-items/${taskId}`, { method: "DELETE" });
    mutate();
  };

  const updateTaskField = async (item: TaskItem, patch: Partial<TaskItem>) => {
    await fetch(`/api/task-items/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...item, ...patch }),
    });
    mutate();
  };

  if (isLoading) return <p className="container mx-auto p-6 text-gray-500">Chargement…</p>;
  if (error) return <p className="container mx-auto p-6 text-red-700">Erreur de chargement</p>;
  if (!data) return null;

  const { projet, lists, stats } = data;

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <Link href={`/projets/${id}`} className="inline-flex items-center gap-1 text-sm text-gray-400 mb-4">
        <ArrowLeft className="h-4 w-4" /> Retour au projet
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">{projet.nom}</h1>
          <p className="text-sm text-gray-400 mt-0.5 flex items-center gap-2">
            <ListChecks className="h-4 w-4" /> Tâches du projet
          </p>
        </div>
        <button
          type="button"
          onClick={() => setNewListOpen((v) => !v)}
          className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
        >
          {newListOpen ? "Annuler" : "+ Nouvelle liste"}
        </button>
      </div>

      {/* Form création liste */}
      {newListOpen && (
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 mb-6 space-y-3">
          <input
            autoFocus
            type="text"
            value={newListNom}
            onChange={(e) => setNewListNom(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") createList(); }}
            placeholder="Nom de la liste"
            className="w-full p-2 bg-gray-800 border border-gray-700 rounded text-sm"
          />
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Couleur :</span>
            {COULEURS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setNewListCouleur(c)}
                className={`h-6 w-6 rounded-full transition-transform ${newListCouleur === c ? "ring-2 ring-white scale-110" : ""}`}
                style={{ background: c }}
              />
            ))}
            <button
              onClick={createList}
              disabled={!newListNom.trim()}
              className="ml-auto px-3 py-1 bg-emerald-600 text-white text-xs rounded disabled:opacity-50"
            >
              Créer
            </button>
          </div>
        </div>
      )}

      {/* Indicateur global */}
      <div className="rounded-xl border border-gray-700 bg-gray-800 p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm font-semibold text-gray-200">État d&apos;avancement</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {stats.completedItems} / {stats.totalItems} tâche{stats.totalItems > 1 ? "s" : ""} · {stats.totalLists} liste{stats.totalLists > 1 ? "s" : ""}
            </p>
          </div>
          <div className="text-3xl font-bold text-gray-100 tabular-nums">{stats.percent}%</div>
        </div>
        <div className="h-2 rounded-full bg-gray-700 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
            style={{ width: `${stats.percent}%` }}
          />
        </div>
      </div>

      {projet.objectifs && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 mb-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="text-xs font-semibold text-amber-300 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" />
                Objectifs du projet
              </p>
              <p className="text-sm text-gray-300 whitespace-pre-line">{projet.objectifs}</p>
            </div>
            <button
              onClick={() => setGenOpen(true)}
              className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium"
              title="Génère une liste de tâches actionnables via Claude IA à partir des objectifs ci-dessus"
            >
              ⚡ Générer les tâches via IA
            </button>
          </div>
        </div>
      )}

      {lists.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-gray-700 rounded-xl">
          <ListChecks className="h-10 w-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">Aucune liste de tâches pour ce projet.</p>
          <button
            onClick={() => setNewListOpen(true)}
            className="mt-3 text-xs px-3 py-1.5 rounded-md bg-blue-600 text-white"
          >
            Créer la première liste
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {lists.map((list) => (
            <div key={list.id} className="rounded-xl border border-gray-700 bg-gray-800">
              <div className="p-4 border-b border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-semibold text-gray-100 flex items-center gap-2">
                    <span className="inline-block h-3 w-3 rounded-full" style={{ background: list.couleur }} />
                    {list.nom}
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 tabular-nums">
                      {list.stats.completed} / {list.stats.total} · {list.stats.percent}%
                    </span>
                    <button
                      onClick={() => deleteList(list.id)}
                      className="text-gray-500 hover:text-red-400 p-1"
                      title="Supprimer la liste"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="h-1 rounded-full bg-gray-700 overflow-hidden">
                  <div className="h-full transition-all" style={{ width: `${list.stats.percent}%`, background: list.couleur }} />
                </div>
              </div>

              <ul className="divide-y divide-gray-700">
                {list.items.map((item) => {
                  const formateurAssigne = formateursAvecUser.find((f) => f.user?.id === item.userId);
                  return (
                    <li key={item.id} className="p-3 flex items-start gap-3 hover:bg-gray-750 group">
                      <button onClick={() => toggleCompleted(item)} className="shrink-0 mt-0.5">
                        {item.completed ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <Circle className="h-4 w-4 text-gray-500 hover:text-emerald-400" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setCommentsTask({ id: item.id, titre: item.titre })}
                            className={`text-sm text-left hover:underline ${item.completed ? "line-through text-gray-500" : "text-gray-200"}`}
                            title="Ouvrir les commentaires"
                          >
                            {item.titre}
                          </button>
                          {item.priorite && (
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${PRIO_COLORS[item.priorite] ?? PRIO_COLORS.basse}`}>
                              {item.priorite}
                            </span>
                          )}
                          {item.dueDate && (
                            <span className="text-[10px] text-gray-500">
                              {new Date(item.dueDate).toLocaleDateString("fr-FR")}
                            </span>
                          )}
                          {formateurAssigne && (
                            <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                              <UserCircle className="h-3 w-3" />
                              {formateurAssigne.prenom} {formateurAssigne.nom}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setCommentsTask({ id: item.id, titre: item.titre })}
                          className="text-gray-500 hover:text-blue-400 p-1"
                          title="Commentaires"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                        </button>
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
                        <select
                          value={item.userId ?? ""}
                          onChange={(e) => updateTaskField(item, { userId: e.target.value || null })}
                          className="text-[10px] bg-gray-900 border border-gray-700 rounded px-1 py-0.5"
                          title="Assigner à un formateur"
                        >
                          <option value="">Personne</option>
                          {formateursAvecUser.map((f) => (
                            <option key={f.user!.id} value={f.user!.id}>{f.prenom} {f.nom}</option>
                          ))}
                        </select>
                        <select
                          value={item.priorite ?? ""}
                          onChange={(e) => updateTaskField(item, { priorite: e.target.value || null })}
                          className="text-[10px] bg-gray-900 border border-gray-700 rounded px-1 py-0.5"
                        >
                          <option value="">—</option>
                          <option value="basse">basse</option>
                          <option value="moyenne">moy.</option>
                          <option value="haute">haute</option>
                          <option value="urgente">urgente</option>
                        </select>
                        <button onClick={() => deleteTask(item.id)} className="text-gray-500 hover:text-red-400 p-1">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        </div>
                      </div>
                    </li>
                  );
                })}

                {/* Inline new task form */}
                <li className="p-3">
                  {newTaskListId === list.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        type="text"
                        value={newTaskTitre}
                        onChange={(e) => setNewTaskTitre(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") createTask(list.id);
                          if (e.key === "Escape") { setNewTaskListId(null); setNewTaskTitre(""); }
                        }}
                        placeholder="Titre de la tâche…"
                        className="flex-1 p-1.5 bg-gray-900 border border-gray-700 rounded text-sm"
                      />
                      <button onClick={() => createTask(list.id)} disabled={!newTaskTitre.trim()} className="px-2 py-1 bg-emerald-600 text-white text-xs rounded disabled:opacity-50">
                        Ajouter
                      </button>
                      <button onClick={() => { setNewTaskListId(null); setNewTaskTitre(""); }} className="text-gray-500 p-1">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setNewTaskListId(list.id)}
                      className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" /> Ajouter une tâche
                    </button>
                  )}
                </li>
              </ul>
            </div>
          ))}
        </div>
      )}

      {commentsTask && (
        <TaskCommentsModal
          taskId={commentsTask.id}
          taskTitle={commentsTask.titre}
          currentUserId={session?.user?.id}
          currentUserRole={session?.user?.role}
          onClose={() => setCommentsTask(null)}
        />
      )}

      {genOpen && (
        <GenerateTasksModal
          projetId={id}
          onClose={() => setGenOpen(false)}
          onCreated={() => mutate()}
        />
      )}
    </div>
  );
}
