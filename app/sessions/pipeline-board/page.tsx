"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { useApi } from "@/hooks/useApi";
import {
  SESSION_STAGES,
  SESSION_STAGE_LABELS,
  SESSION_TERMINAL_ALT,
} from "@/lib/pipeline/stages";

type Card = {
  id: string;
  etape: string;
  etapeMajAt: string;
  dateDebut: string;
  dateFin: string;
  statut: string;
  formation: { id: string; titre: string };
  formateur: { id: string; nom: string; prenom: string } | null;
  _count: { inscriptions: number };
  pendingTasksCount: number;
};

const COLUMNS: string[] = [...SESSION_STAGES, SESSION_TERMINAL_ALT];
const ALL_LABELS: Record<string, string> = SESSION_STAGE_LABELS;

export default function SessionPipelineBoardPage() {
  const { data, isLoading } = useApi<{ cards: Card[] }>(
    "/api/sessions/pipeline-board",
  );

  const grouped = useMemo(() => {
    const map: Record<string, Card[]> = {};
    for (const c of data?.cards ?? []) {
      (map[c.etape] ??= []).push(c);
    }
    return map;
  }, [data]);

  return (
    <div className="p-6 space-y-6">
      <Breadcrumb
        items={[
          { label: "Sessions", href: "/sessions" },
          { label: "Vue pipeline" },
        ]}
      />
      <header>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-100">
          Pipeline des sessions
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Vue Kanban des sessions des 6 derniers mois. Clic sur une carte pour
          gérer l'étape et les tâches.
        </p>
      </header>

      {isLoading ? (
        <p className="text-sm text-gray-500">Chargement…</p>
      ) : (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-3 min-w-max">
            {COLUMNS.map((etape) => {
              const cards = grouped[etape] ?? [];
              return (
                <div
                  key={etape}
                  className="w-72 flex-shrink-0 bg-gray-800/30 border border-gray-700 rounded-lg"
                >
                  <div className="px-3 py-2 border-b border-gray-700 flex items-center justify-between">
                    <h2 className="text-sm font-medium text-gray-200">
                      {ALL_LABELS[etape] ?? etape}
                    </h2>
                    <span className="text-xs text-gray-500">{cards.length}</span>
                  </div>
                  <ul className="p-2 space-y-2 max-h-[70vh] overflow-y-auto">
                    {cards.length === 0 ? (
                      <li className="text-xs text-gray-500 italic px-2 py-3">
                        Aucune session
                      </li>
                    ) : (
                      cards.map((c) => (
                        <li key={c.id}>
                          <Link
                            href={`/sessions/${c.id}`}
                            className="block bg-gray-800 border border-gray-700 rounded p-2 hover:border-red-600 transition-colors"
                          >
                            <div className="text-sm text-gray-100 font-medium truncate">
                              {c.formation.titre}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              {new Date(c.dateDebut).toLocaleDateString("fr-FR")}
                              {" → "}
                              {new Date(c.dateFin).toLocaleDateString("fr-FR")}
                            </div>
                            {c.formateur && (
                              <div className="text-xs text-gray-500 mt-0.5">
                                {c.formateur.prenom} {c.formateur.nom}
                              </div>
                            )}
                            <div className="flex items-center gap-3 mt-2 text-xs">
                              <span className="text-gray-500">
                                {c._count.inscriptions} insc.
                              </span>
                              {c.pendingTasksCount > 0 && (
                                <span className="text-amber-400">
                                  {c.pendingTasksCount} tâche
                                  {c.pendingTasksCount > 1 ? "s" : ""}
                                </span>
                              )}
                            </div>
                          </Link>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
