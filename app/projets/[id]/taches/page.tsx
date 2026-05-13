"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { ArrowLeft, ListChecks, CheckCircle2, Circle, AlertCircle } from "lucide-react";

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

interface Response {
  projet: { id: string; nom: string; objectifs: string | null };
  lists: TaskListWithStats[];
  stats: { totalLists: number; totalItems: number; completedItems: number; percent: number };
}

const fetcher = (u: string) =>
  fetch(u).then((r) => {
    if (!r.ok) throw new Error(`${r.status}`);
    return r.json() as Promise<Response>;
  });

function priorityBadge(priorite: string | null) {
  if (!priorite) return null;
  const colors: Record<string, string> = {
    basse: "bg-gray-200 text-gray-700",
    moyenne: "bg-blue-200 text-blue-800",
    haute: "bg-orange-200 text-orange-900",
    urgente: "bg-red-200 text-red-900",
  };
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${colors[priorite] ?? colors.basse}`}>
      {priorite}
    </span>
  );
}

export default function ProjetTachesPage() {
  const { id } = useParams<{ id: string }>();
  const { data, error, isLoading } = useSWR(`/api/projets/${id}/taches`, fetcher);

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
            <ListChecks className="h-4 w-4" />
            Tâches du projet
          </p>
        </div>
        <button
          type="button"
          disabled
          className="px-4 py-2 rounded-md border border-gray-700 bg-gray-800 text-gray-500 text-sm cursor-not-allowed"
          title="Disponible dans la prochaine itération"
        >
          + Nouvelle liste
        </button>
      </div>

      {/* Indicateur global d'avancement */}
      <div className="rounded-xl border border-gray-700 bg-gray-800 p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm font-semibold text-gray-200">État d&apos;avancement</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {stats.completedItems} / {stats.totalItems} tâche{stats.totalItems > 1 ? "s" : ""} terminée{stats.completedItems > 1 ? "s" : ""} ·
              {" "}{stats.totalLists} liste{stats.totalLists > 1 ? "s" : ""}
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
          <p className="text-xs font-semibold text-amber-300 uppercase tracking-wide mb-1 flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5" />
            Objectifs du projet
          </p>
          <p className="text-sm text-gray-300 whitespace-pre-line">{projet.objectifs}</p>
          <button
            type="button"
            disabled
            className="mt-3 text-xs px-3 py-1.5 rounded-md border border-amber-500/30 text-amber-300/50 cursor-not-allowed"
            title="Génération auto des tâches via IA — bientôt disponible"
          >
            ⚡ Générer les tâches depuis les objectifs (bientôt)
          </button>
        </div>
      )}

      {lists.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-gray-700 rounded-xl">
          <ListChecks className="h-10 w-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">Aucune liste de tâches pour ce projet.</p>
          <p className="text-xs text-gray-500 mt-1">
            Création de liste disponible dans la prochaine itération.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {lists.map((list) => (
            <div key={list.id} className="rounded-xl border border-gray-700 bg-gray-800">
              <div className="p-4 border-b border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-semibold text-gray-100 flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ background: list.couleur }}
                    />
                    {list.nom}
                  </h2>
                  <span className="text-xs text-gray-400 tabular-nums">
                    {list.stats.completed} / {list.stats.total} · {list.stats.percent}%
                  </span>
                </div>
                {list.description && (
                  <p className="text-xs text-gray-400">{list.description}</p>
                )}
                <div className="h-1 rounded-full bg-gray-700 overflow-hidden mt-3">
                  <div
                    className="h-full transition-all"
                    style={{ width: `${list.stats.percent}%`, background: list.couleur }}
                  />
                </div>
              </div>
              <ul className="divide-y divide-gray-700">
                {list.items.length === 0 ? (
                  <li className="p-4 text-xs text-gray-500 italic">Aucune tâche</li>
                ) : (
                  list.items.map((item) => (
                    <li key={item.id} className="p-3 flex items-start gap-3 hover:bg-gray-750">
                      {item.completed ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <Circle className="h-4 w-4 text-gray-500 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm ${item.completed ? "line-through text-gray-500" : "text-gray-200"}`}>
                            {item.titre}
                          </span>
                          {priorityBadge(item.priorite)}
                          {item.dueDate && (
                            <span className="text-[10px] text-gray-500">
                              {new Date(item.dueDate).toLocaleDateString("fr-FR")}
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>
                        )}
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
