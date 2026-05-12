"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { useApi } from "@/hooks/useApi";
import { notify } from "@/lib/toast";
import { SESSION_STAGE_LABELS } from "@/lib/pipeline/stages";

const STAGE_LABELS: Record<string, string> = SESSION_STAGE_LABELS;

type SessionTask = {
  id: string;
  etape: string;
  titre: string;
  description: string | null;
  completed: boolean;
  dueDate: string | null;
  session: {
    id: string;
    dateDebut: string;
    dateFin: string;
    formation: { id: string; titre: string };
  } | null;
};

type ProspectTask = {
  id: string;
  etape: string;
  titre: string;
  description: string | null;
  completed: boolean;
  dueDate: string | null;
  prospect: {
    id: string;
    nom: string;
    prenom: string;
    entreprise: string | null;
  } | null;
};

type ApiData = {
  sessionTasks: SessionTask[];
  prospectTasks: ProspectTask[];
};

export default function MesTachesPipelinePage() {
  const { data, isLoading, mutate } = useApi<ApiData>(
    "/api/formateur/mes-taches-pipeline",
  );
  const [busy, setBusy] = useState<string | null>(null);

  async function toggle(taskId: string, completed: boolean) {
    if (busy) return;
    setBusy(taskId);
    try {
      const res = await fetch(`/api/sessions/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: "Erreur" }));
        notify.error("Mise à jour impossible", j.error);
        return;
      }
      await mutate();
    } finally {
      setBusy(null);
    }
  }

  const sessionTasks = data?.sessionTasks ?? [];
  const pending = useMemo(() => sessionTasks.filter((t) => !t.completed), [sessionTasks]);
  const done = useMemo(() => sessionTasks.filter((t) => t.completed), [sessionTasks]);

  // Regroupe les tâches en attente par Session pour afficher en blocs.
  type Group = { titreFormation: string; sessionId: string; tasks: SessionTask[] };
  const groupedPending = useMemo<Group[]>(() => {
    const map = new Map<string, Group>();
    for (const t of pending) {
      if (!t.session) continue;
      const key = t.session.id;
      const existing = map.get(key);
      if (existing) {
        existing.tasks.push(t);
      } else {
        map.set(key, {
          titreFormation: t.session.formation.titre,
          sessionId: t.session.id,
          tasks: [t],
        });
      }
    }
    return Array.from(map.values());
  }, [pending]);

  return (
    <div className="p-6">
      <PageHeader
        title="Mes tâches du pipeline"
        description="Tâches qui vous sont assignées sur les sessions en cours."
      />

      {isLoading ? (
        <p className="text-sm text-gray-500">Chargement…</p>
      ) : (
        <div className="space-y-6 mt-6">
          {pending.length === 0 ? (
            <div className="border border-gray-700 rounded-lg p-6 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm text-gray-300">Aucune tâche en attente.</p>
            </div>
          ) : (
            groupedPending.map((g) => (
              <section key={g.sessionId} className="border border-gray-700 rounded-lg p-4 bg-gray-800/30">
                <header className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-medium text-gray-100">
                    {g.titreFormation}
                  </h2>
                  <Link
                    href={`/sessions/${g.sessionId}`}
                    className="text-xs text-red-500 hover:text-red-400 flex items-center gap-1"
                  >
                    Voir la session <ExternalLink className="w-3 h-3" />
                  </Link>
                </header>
                <ul className="space-y-2">
                  {g.tasks.map((t) => (
                    <li key={t.id} className="flex items-start gap-3 p-2 bg-gray-800 rounded">
                      <input
                        type="checkbox"
                        checked={t.completed}
                        onChange={() => toggle(t.id, !t.completed)}
                        disabled={busy === t.id}
                        className="mt-1 h-4 w-4"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-100">{t.titre}</div>
                        {t.description && (
                          <div className="text-xs text-gray-400 mt-0.5">{t.description}</div>
                        )}
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span>
                            Étape : {STAGE_LABELS[t.etape] ?? t.etape}
                          </span>
                          {t.dueDate && (
                            <span>
                              Échéance : {new Date(t.dueDate).toLocaleDateString("fr-FR")}
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}

          {done.length > 0 && (
            <details className="border border-gray-700 rounded-lg p-4 bg-gray-800/20">
              <summary className="text-sm text-gray-300 cursor-pointer">
                Tâches complétées ({done.length})
              </summary>
              <ul className="mt-3 space-y-1.5">
                {done.map((t) => (
                  <li key={t.id} className="text-xs text-gray-500 line-through">
                    {t.titre}
                    {t.session && ` — ${t.session.formation.titre}`}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
