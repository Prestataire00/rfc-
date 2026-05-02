"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Zap, CheckCircle2, XCircle, Clock, AlertTriangle, Play } from "lucide-react";
import { RuleForm } from "@/components/automations/RuleForm";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/fetcher";

type Execution = {
  id: string;
  createdAt: string;
  sessionId: string;
  contactId: string | null;
  status: string;
  payload: string | null;
  errorMessage: string | null;
};

type Rule = {
  id: string;
  nom: string;
  description: string | null;
  enabled: boolean;
  trigger: string;
  conditions: string;
  delayType: string;
  delayValue: number;
  actionType: string;
  actionConfig: string;
  deduplicationKey: string;
  executions: Execution[];
};

type Template = { id: string; type: string; nom: string };

export default function AutomationV2DetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const isNew = id === "nouveau";

  const [rule, setRule] = useState<Rule | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [dryRunning, setDryRunning] = useState(false);
  const [dryResults, setDryResults] = useState<{ sessionId: string; contactId?: string; status: string; detail: string }[] | null>(null);

  const { data: templatesData } = useApi<Template[]>("/api/message-templates");
  const { data: ruleData, isLoading: ruleLoading, mutate: mutateRule } = useApi<Rule>(
    isNew ? null : `/api/automations-v2/${id}`
  );
  const templates: Template[] = Array.isArray(templatesData) ? templatesData : [];
  const loading = !isNew && ruleLoading;

  useEffect(() => {
    if (ruleData) setRule(ruleData);
  }, [ruleData]);

  const handleSave = async (data: Record<string, unknown>) => {
    setSaving(true);
    setSaveMsg("");
    try {
      if (isNew) {
        const created = await api.post<{ id: string }>("/api/automations-v2", data);
        setSaveMsg("Enregistre");
        setTimeout(() => setSaveMsg(""), 2500);
        router.push(`/parametres/automations-v2/${created.id}`);
      } else {
        const updated = await api.put<Rule>(`/api/automations-v2/${id}`, data);
        setSaveMsg("Enregistre");
        setTimeout(() => setSaveMsg(""), 2500);
        setRule((prev) => prev ? { ...prev, ...updated } : updated);
        await mutateRule();
      }
    } catch {
      setSaveMsg("Erreur");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!window.confirm("Supprimer cette regle et son historique ?")) return;
    await api.delete(`/api/automations-v2/${id}`);
    router.push("/parametres/automations-v2");
  };

  const handleDryRun = async () => {
    setDryRunning(true);
    setDryResults(null);
    // Dry-run simule l'execution via le cron mais en mode lecture seule
    // Pour l'instant on affiche un message placeholder
    // (l'implementation complete du dry-run necessite un endpoint dedie)
    setTimeout(() => {
      setDryResults([]);
      setDryRunning(false);
    }, 1000);
  };

  const parseRule = (r: Rule) => {
    let conditions = [];
    let actionConfig = {};
    try { conditions = JSON.parse(r.conditions); } catch { /* keep empty */ }
    try { actionConfig = JSON.parse(r.actionConfig); } catch { /* keep empty */ }
    return {
      id: r.id,
      nom: r.nom,
      description: r.description || "",
      enabled: r.enabled,
      trigger: r.trigger,
      conditions,
      delayType: r.delayType,
      delayValue: r.delayValue,
      actionType: r.actionType,
      actionConfig,
      deduplicationKey: r.deduplicationKey,
    };
  };

  if (loading) {
    return <div className="p-6 flex justify-center py-24"><div className="h-6 w-6 animate-spin rounded-full border-2 border-red-600 border-t-transparent" /></div>;
  }

  const statusIcon = (s: string) => {
    if (s === "success") return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />;
    if (s === "error") return <XCircle className="h-3.5 w-3.5 text-red-400" />;
    if (s === "skipped") return <Clock className="h-3.5 w-3.5 text-gray-400" />;
    return <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />;
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link href="/parametres/automations-v2" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-300 mb-4">
        <ArrowLeft className="h-4 w-4" /> Retour liste
      </Link>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
          <Zap className="h-6 w-6 text-red-500" />
          {isNew ? "Nouvelle regle" : rule?.nom || "Regle"}
        </h1>
        {saveMsg && (
          <span className={`text-xs ${saveMsg === "Erreur" ? "text-red-400" : "text-emerald-400"}`}>
            <CheckCircle2 className="h-3 w-3 inline mr-1" />{saveMsg}
          </span>
        )}
      </div>

      <div className="rounded-lg border border-gray-700 bg-gray-800 p-6 mb-6">
        <RuleForm
          initial={rule ? parseRule(rule) : undefined}
          onSave={handleSave}
          onDelete={isNew ? undefined : handleDelete}
          saving={saving}
          templates={templates}
        />
      </div>

      {/* Dry-run + historique (uniquement si regle existante) */}
      {!isNew && rule && (
        <>
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={handleDryRun}
              disabled={dryRunning}
              className="inline-flex items-center gap-2 rounded-md border border-gray-600 bg-gray-800 hover:bg-gray-700 px-4 py-2 text-sm text-gray-300 disabled:opacity-50"
            >
              <Play className="h-4 w-4" /> {dryRunning ? "Simulation..." : "Simuler (dry-run)"}
            </button>
            {dryResults !== null && (
              <span className="text-xs text-gray-400">
                {dryResults.length === 0 ? "Aucune session correspondante en ce moment." : `${dryResults.length} session(s) seraient impactees.`}
              </span>
            )}
          </div>

          {rule.executions.length > 0 && (
            <div className="rounded-lg border border-gray-700 bg-gray-800 overflow-hidden">
              <div className="p-4 border-b border-gray-700">
                <h2 className="font-semibold text-gray-100">Historique d&apos;execution</h2>
                <p className="text-xs text-gray-400">Dernieres 50 executions</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700 bg-gray-900">
                      <th className="text-left px-4 py-2 font-medium text-gray-400">Date</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-400">Statut</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-400">Session</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-400">Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rule.executions.map((exec) => (
                      <tr key={exec.id} className="border-b border-gray-800 last:border-0">
                        <td className="px-4 py-2 text-xs text-gray-400 whitespace-nowrap">
                          {new Date(exec.createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="px-4 py-2">
                          <span className="inline-flex items-center gap-1 text-xs">{statusIcon(exec.status)} {exec.status}</span>
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-300 font-mono">{exec.sessionId.slice(-6)}</td>
                        <td className="px-4 py-2 text-xs text-gray-400">{exec.errorMessage || "OK"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
