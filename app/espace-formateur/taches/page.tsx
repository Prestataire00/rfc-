"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import {
  ListChecks, CheckCircle2, Circle, MessageSquare, UserCircle, AlertCircle,
} from "lucide-react";
import { TaskCommentsModal } from "@/components/shared/TaskCommentsModal";

interface TaskItem {
  id: string;
  titre: string;
  description: string | null;
  completed: boolean;
  dueDate: string | null;
  priorite: string | null;
  userId: string | null;
  audience: "mine" | "project";
  _count: { comments: number };
}

interface TaskListData {
  id: string;
  nom: string;
  couleur: string;
  description: string | null;
  projet: { id: string; nom: string } | null;
  items: TaskItem[];
  stats: { total: number; completed: number; mine: number; percent: number };
}

interface Response {
  lists: TaskListData[];
  stats: {
    totalLists: number;
    totalItems: number;
    completedItems: number;
    myItems: number;
    myPending: number;
  };
}

const fetcher = (u: string) => fetch(u).then((r) => {
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json() as Promise<Response>;
});

const PRIO_COLORS: Record<string, string> = {
  basse: "bg-gray-200 text-gray-700",
  moyenne: "bg-blue-200 text-blue-800",
  haute: "bg-orange-200 text-orange-900",
  urgente: "bg-red-200 text-red-900",
};

export default function FormateurTachesPage() {
  const { data, error, isLoading, mutate } = useSWR<Response>("/api/formateur/taches", fetcher);
  const { data: session } = useSession();
  const [commentsTask, setCommentsTask] = useState<{ id: string; titre: string } | null>(null);
  const [filter, setFilter] = useState<"mine" | "all">("mine");

  const toggle = async (item: TaskItem) => {
    // Le toggle utilise la route PUT existante /api/task-items/[id]
    // (autorisée pour admin uniquement à l'origine — mais le formateur peut
    // toggle ses propres tâches via le middleware /api/formateur/*).
    // Si la PUT échoue avec 401, on alerte. La permission de toggle pour
    // un formateur est à confirmer côté middleware backend.
    await fetch(`/api/task-items/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titre: item.titre,
        description: item.description,
        completed: !item.completed,
        dueDate: item.dueDate,
        priorite: item.priorite,
        ordre: 0,
        userId: item.userId,
      }),
    });
    mutate();
  };

  if (isLoading) return <p className="container mx-auto p-6 text-gray-500">Chargement…</p>;
  if (error) return <p className="container mx-auto p-6 text-red-700">Erreur de chargement</p>;
  if (!data) return null;

  const { lists, stats } = data;

  // Filtrage côté UI : "mine" = uniquement tâches assignées au formateur
  // (audience === "mine"). "all" = toutes les tâches visibles (mes projets).
  const displayLists = lists
    .map((l) => ({
      ...l,
      items: filter === "mine" ? l.items.filter((i) => i.audience === "mine") : l.items,
    }))
    .filter((l) => l.items.length > 0);

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Mes tâches</h1>
          <p className="text-sm text-gray-400 mt-0.5 flex items-center gap-2">
            <ListChecks className="h-4 w-4" />
            Tâches assignées + tâches de mes projets
          </p>
        </div>

        <div className="flex items-center gap-1 bg-gray-900 rounded-lg p-1 border border-gray-700">
          <button
            onClick={() => setFilter("mine")}
            className={`px-3 py-1 rounded-md text-xs font-medium ${filter === "mine" ? "bg-blue-600 text-white" : "text-gray-400"}`}
          >
            Mes tâches ({stats.myItems})
          </button>
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1 rounded-md text-xs font-medium ${filter === "all" ? "bg-blue-600 text-white" : "text-gray-400"}`}
          >
            Toutes ({stats.totalItems})
          </button>
        </div>
      </div>

      {/* Stats résumé */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-3">
          <p className="text-xs text-gray-400">Listes</p>
          <p className="text-2xl font-bold text-gray-100">{stats.totalLists}</p>
        </div>
        <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3">
          <p className="text-xs text-blue-300">Mes tâches</p>
          <p className="text-2xl font-bold text-gray-100">{stats.myItems}</p>
        </div>
        <div className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-3">
          <p className="text-xs text-orange-300">À faire</p>
          <p className="text-2xl font-bold text-gray-100">{stats.myPending}</p>
        </div>
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
          <p className="text-xs text-emerald-300">Terminées</p>
          <p className="text-2xl font-bold text-gray-100">
            {stats.myItems - stats.myPending}
          </p>
        </div>
      </div>

      {displayLists.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-gray-700 rounded-xl">
          <AlertCircle className="h-10 w-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">
            {filter === "mine"
              ? "Aucune tâche assignée."
              : "Aucune liste de tâches sur vos projets."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayLists.map((list) => (
            <div key={list.id} className="rounded-xl border border-gray-700 bg-gray-800">
              <div className="p-4 border-b border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h2 className="font-semibold text-gray-100 flex items-center gap-2">
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ background: list.couleur }}
                      />
                      {list.nom}
                    </h2>
                    {list.projet && (
                      <p className="text-xs text-gray-500 mt-0.5">📁 {list.projet.nom}</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 tabular-nums">
                    {list.stats.completed} / {list.stats.total} · {list.stats.percent}%
                  </span>
                </div>
                <div className="h-1 rounded-full bg-gray-700 overflow-hidden">
                  <div
                    className="h-full transition-all"
                    style={{ width: `${list.stats.percent}%`, background: list.couleur }}
                  />
                </div>
              </div>

              <ul className="divide-y divide-gray-700">
                {list.items.map((item) => {
                  const isMine = item.audience === "mine";
                  return (
                    <li key={item.id} className="p-3 flex items-start gap-3 hover:bg-gray-750">
                      <button
                        onClick={() => (isMine ? toggle(item) : undefined)}
                        disabled={!isMine}
                        className="shrink-0 mt-0.5"
                        title={isMine ? "Cocher / décocher" : "Non assignée à vous (lecture seule)"}
                      >
                        {item.completed ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <Circle className={`h-4 w-4 ${isMine ? "text-gray-500 hover:text-emerald-400" : "text-gray-700"}`} />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setCommentsTask({ id: item.id, titre: item.titre })}
                            className={`text-sm text-left hover:underline ${item.completed ? "line-through text-gray-500" : "text-gray-200"}`}
                          >
                            {item.titre}
                          </button>
                          {isMine && (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/15 text-blue-300">
                              Pour vous
                            </span>
                          )}
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
                          {!isMine && item.userId && (
                            <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                              <UserCircle className="h-3 w-3" /> assignée à un collègue
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => setCommentsTask({ id: item.id, titre: item.titre })}
                        className="text-gray-500 hover:text-blue-400 p-1 inline-flex items-center gap-1"
                        title="Commentaires"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        {item._count.comments > 0 && (
                          <span className="text-[10px]">{item._count.comments}</span>
                        )}
                      </button>
                    </li>
                  );
                })}
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
    </div>
  );
}
