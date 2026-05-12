"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Plus, Trash2, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { useApi, useApiMutation, invalidate } from "@/hooks/useApi";
import { notify } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { StatusPipeline } from "@/components/shared/StatusPipeline";
import {
  SESSION_STAGES,
  SESSION_STAGE_LABELS,
  SESSION_TERMINAL_ALT,
  PROSPECT_STAGES,
  PROSPECT_STAGE_LABELS,
  PROSPECT_TERMINAL_ALT,
} from "@/lib/pipeline/stages";
import { TaskCreateDialog } from "./TaskCreateDialog";
import type { PipelineData, PipelineTask, AssignableUser } from "./types";

type Props = {
  entityType: "session" | "prospect";
  entityId: string;
  currentUserRole: "admin" | "formateur" | "client" | string;
  currentUserId?: string;
  assignableUsers?: AssignableUser[];
};

export function PipelinePanel({
  entityType,
  entityId,
  currentUserRole,
  currentUserId,
  assignableUsers = [],
}: Props) {
  const apiBase = `/api/${entityType}s/${entityId}`;
  const { data, isLoading, mutate } = useApi<PipelineData>(`${apiBase}/pipeline`);

  const isSession = entityType === "session";
  const stages = isSession ? SESSION_STAGES : PROSPECT_STAGES;
  const labels: Record<string, string> = isSession
    ? SESSION_STAGE_LABELS
    : PROSPECT_STAGE_LABELS;
  const terminalAlt = isSession ? SESSION_TERMINAL_ALT : PROSPECT_TERMINAL_ALT;

  const currentEtape =
    (isSession ? data?.session?.etape : data?.prospect?.etape) ?? null;

  const tasksByEtape = useMemo(() => {
    const map: Record<string, PipelineTask[]> = {};
    for (const t of data?.tasks ?? []) {
      (map[t.etape] ??= []).push(t);
    }
    return map;
  }, [data?.tasks]);

  const currentTasks = currentEtape ? tasksByEtape[currentEtape] ?? [] : [];
  const completedCount = currentTasks.filter((t) => t.completed).length;

  const isAdmin = currentUserRole === "admin";
  const isTerminal = currentEtape === terminalAlt || currentEtape === stages[stages.length - 1];

  const [advancing, setAdvancing] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);
  const [openCancel, setOpenCancel] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const stepperSteps = stages.map((s) => ({
    value: s,
    label: labels[s],
  }));

  async function advanceTo(toEtape: string) {
    if (advancing) return;
    setAdvancing(true);
    try {
      const res = await fetch(`${apiBase}/avancer-etape`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toEtape }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: "Erreur" }));
        notify.error("Avancement impossible", j.error);
        return;
      }
      notify.success(`Étape : ${labels[toEtape as keyof typeof labels] ?? toEtape}`);
      await mutate();
    } finally {
      setAdvancing(false);
    }
  }

  async function toggleTask(task: PipelineTask) {
    const res = await fetch(`/api/${entityType}s/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !task.completed }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({ error: "Erreur" }));
      notify.error("Mise à jour impossible", j.error);
      return;
    }
    await mutate();
  }

  async function reassignTask(taskId: string, assigneeId: string | null) {
    const res = await fetch(`/api/${entityType}s/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assigneeId }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({ error: "Erreur" }));
      notify.error("Assignation impossible", j.error);
      return;
    }
    await mutate();
  }

  async function deleteTask(taskId: string) {
    const res = await fetch(`/api/${entityType}s/tasks/${taskId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({ error: "Erreur" }));
      notify.error("Suppression impossible", j.error);
      return;
    }
    await mutate();
  }

  if (isLoading || !data) {
    return (
      <div className="text-sm text-gray-500 p-4">Chargement du pipeline…</div>
    );
  }

  const isAnnuleeOrPerdu = currentEtape === terminalAlt;
  const currentIdx = currentEtape ? stages.indexOf(currentEtape as never) : -1;
  const nextEtape = currentIdx >= 0 && currentIdx < stages.length - 1
    ? stages[currentIdx + 1]
    : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6 pb-4">
          <StatusPipeline
            steps={stepperSteps}
            currentStatus={currentEtape ?? stages[0]}
            lostStatus={terminalAlt}
            successStatus={isSession ? "clos" : "signe"}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500">
                Étape courante
              </div>
              <div className="text-lg font-medium">
                {currentEtape ? labels[currentEtape as keyof typeof labels] : "—"}
              </div>
              {currentTasks.length > 0 && (
                <div className="text-xs text-gray-500 mt-1">
                  {completedCount} / {currentTasks.length} tâches complétées
                </div>
              )}
            </div>
            {isAdmin && !isTerminal && (
              <div className="flex items-center gap-2">
                {!isAnnuleeOrPerdu && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOpenCancel(true)}
                  >
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    {isSession ? "Annuler" : "Marquer perdu"}
                  </Button>
                )}
                {nextEtape && (
                  <Button
                    size="sm"
                    onClick={() => advanceTo(nextEtape)}
                    disabled={advancing}
                  >
                    Avancer : {labels[nextEtape]}
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {currentTasks.length > 0 ? (
            <ul className="space-y-2">
              {currentTasks.map((t) => (
                <li
                  key={t.id}
                  className="flex items-start gap-3 p-2 rounded border border-gray-200 hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={t.completed}
                    disabled={
                      !(isAdmin || (currentUserRole === "formateur" && t.assigneeId === currentUserId))
                    }
                    onChange={() => toggleTask(t)}
                    className="mt-1 h-4 w-4"
                  />
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-sm ${
                        t.completed ? "line-through text-gray-400" : ""
                      }`}
                    >
                      {t.titre}
                    </div>
                    {t.description && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        {t.description}
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      {t.dueDate && (
                        <span>Échéance : {new Date(t.dueDate).toLocaleDateString("fr-FR")}</span>
                      )}
                      {isAdmin ? (
                        <select
                          value={t.assigneeId ?? ""}
                          onChange={(e) =>
                            reassignTask(t.id, e.target.value || null)
                          }
                          className="text-xs border border-gray-200 rounded px-1 py-0.5"
                        >
                          <option value="">— Non assigné —</option>
                          {assignableUsers.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.prenom} {u.nom}
                              {u.role === "formateur" ? " (formateur)" : ""}
                            </option>
                          ))}
                        </select>
                      ) : t.assigneeId ? (
                        <span>
                          Assigné à{" "}
                          {(() => {
                            const u = assignableUsers.find((x) => x.id === t.assigneeId);
                            return u ? `${u.prenom} ${u.nom}` : "(…)";
                          })()}
                        </span>
                      ) : null}
                      <span className="text-gray-400">
                        {t.source === "template" ? "[template]" : "[ad-hoc]"}
                      </span>
                    </div>
                  </div>
                  {isAdmin && t.source === "adhoc" && (
                    <button
                      type="button"
                      onClick={() => setDeleteId(t.id)}
                      className="text-gray-400 hover:text-red-600"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 italic">
              Aucune tâche pour cette étape.
            </p>
          )}

          {isAdmin && !isTerminal && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpenCreate(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Ajouter une tâche
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 pb-2">
          <button
            type="button"
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 w-full text-left"
            onClick={() => setHistoryOpen((v) => !v)}
          >
            {historyOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Historique des étapes ({data.transitions.length})
          </button>
          {historyOpen && (
            <ul className="mt-3 space-y-1.5 text-xs text-gray-600">
              {data.transitions.length === 0 ? (
                <li className="italic">Aucune transition enregistrée.</li>
              ) : (
                data.transitions.map((tr) => (
                  <li key={tr.id} className="flex items-baseline gap-2">
                    <span className="text-gray-400 tabular-nums">
                      {new Date(tr.createdAt).toLocaleString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span>
                      {tr.fromEtape
                        ? `${labels[tr.fromEtape as keyof typeof labels] ?? tr.fromEtape} → `
                        : ""}
                      <strong>
                        {labels[tr.toEtape as keyof typeof labels] ?? tr.toEtape}
                      </strong>
                      {tr.notes && (
                        <span className="ml-2 text-gray-500">({tr.notes})</span>
                      )}
                    </span>
                  </li>
                ))
              )}
            </ul>
          )}
        </CardContent>
      </Card>

      <TaskCreateDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        entityType={entityType}
        entityId={entityId}
        etape={currentEtape ?? stages[0]}
        assignableUsers={assignableUsers}
        onCreated={async () => {
          await mutate();
          await invalidate(`${apiBase}/pipeline`);
        }}
      />

      <ConfirmDialog
        open={openCancel}
        onOpenChange={setOpenCancel}
        title={isSession ? "Annuler cette session ?" : "Marquer ce prospect comme perdu ?"}
        description="Cette action déplace l'entité dans son état terminal alternatif. Action réversible uniquement via SQL."
        confirmLabel={isSession ? "Annuler la session" : "Marquer perdu"}
        onConfirm={() => advanceTo(terminalAlt)}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Supprimer cette tâche ?"
        description="La tâche sera définitivement supprimée."
        confirmLabel="Supprimer"
        onConfirm={async () => {
          if (deleteId) await deleteTask(deleteId);
          setDeleteId(null);
        }}
      />
    </div>
  );
}
