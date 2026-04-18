"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Zap, ToggleLeft, ToggleRight, Pencil, Clock, Mail, MessageSquare, FileText, ListChecks } from "lucide-react";
import { TRIGGER_LABELS, ACTION_TYPE_LABELS } from "@/lib/automations-v2-constants";

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
  _count: { executions: number };
};

const ACTION_ICONS: Record<string, React.ElementType> = {
  send_email: Mail,
  send_sms: MessageSquare,
  generate_document: FileText,
  create_task: ListChecks,
  change_status: ToggleRight,
};

function formatDelay(type: string, value: number): string {
  if (type === "immediate") return "Immediat";
  const unit = type === "minutes" ? "min" : type === "hours" ? "h" : "j";
  return `+${value}${unit}`;
}

export default function AutomationsV2Page() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    fetch("/api/automations-v2").then((r) => r.ok ? r.json() : []).then((d) => {
      setRules(Array.isArray(d) ? d : []);
      setLoading(false);
    });
  };

  useEffect(load, []);

  const handleToggle = async (id: string) => {
    await fetch(`/api/automations-v2/${id}/toggle`, { method: "PATCH" });
    load();
  };

  if (loading) {
    return <div className="p-6 flex justify-center py-24"><div className="h-6 w-6 animate-spin rounded-full border-2 border-red-600 border-t-transparent" /></div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <Link href="/parametres" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-300 mb-4">
          <ArrowLeft className="h-4 w-4" /> Retour Parametres
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
              <Zap className="h-6 w-6 text-red-500" /> Automatisations V2
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Creez des regles personnalisees : declencheur → conditions → delai → action.
            </p>
          </div>
          <Link href="/parametres/automations-v2/nouveau" className="inline-flex items-center gap-2 rounded-md bg-red-600 hover:bg-red-700 px-4 py-2 text-sm font-medium text-white">
            <Plus className="h-4 w-4" /> Nouvelle regle
          </Link>
        </div>
      </div>

      <div className="mb-4">
        <Link href="/parametres/automations" className="text-xs text-gray-500 hover:text-gray-400 underline">
          Voir les automatisations classiques (V1)
        </Link>
      </div>

      {rules.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-600 bg-gray-800/50 p-12 text-center">
          <Zap className="h-10 w-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 font-medium mb-1">Aucune regle V2</p>
          <p className="text-sm text-gray-500 mb-4">Creez votre premiere regle d&apos;automatisation personnalisee.</p>
          <Link href="/parametres/automations-v2/nouveau" className="inline-flex items-center gap-2 rounded-md bg-red-600 hover:bg-red-700 px-4 py-2 text-sm font-medium text-white">
            <Plus className="h-4 w-4" /> Creer une regle
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => {
            const ActionIcon = ACTION_ICONS[rule.actionType] || Zap;
            const condCount = (() => { try { return JSON.parse(rule.conditions).length; } catch { return 0; } })();
            return (
              <div key={rule.id} className={`rounded-lg border p-4 ${rule.enabled ? "border-gray-700 bg-gray-800" : "border-gray-700/50 bg-gray-800/40 opacity-60"}`}>
                <div className="flex items-start gap-4">
                  <button onClick={() => handleToggle(rule.id)} className="mt-0.5 shrink-0" title={rule.enabled ? "Desactiver" : "Activer"}>
                    {rule.enabled ? <ToggleRight className="h-6 w-6 text-emerald-500" /> : <ToggleLeft className="h-6 w-6 text-gray-500" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-100">{rule.nom}</h3>
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-900 border border-gray-700 px-2 py-0.5 text-[10px] text-gray-300">
                        <Clock className="h-2.5 w-2.5" />
                        {TRIGGER_LABELS[rule.trigger] || rule.trigger}
                      </span>
                      {condCount > 0 && (
                        <span className="text-[10px] text-amber-400">{condCount} condition{condCount > 1 ? "s" : ""}</span>
                      )}
                      <span className="text-[10px] text-gray-500">{formatDelay(rule.delayType, rule.delayValue)}</span>
                    </div>
                    {rule.description && <p className="text-xs text-gray-400 mb-1">{rule.description}</p>}
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <ActionIcon className="h-3 w-3" /> {ACTION_TYPE_LABELS[rule.actionType] || rule.actionType}
                      </span>
                      <span>{rule._count.executions} execution{rule._count.executions !== 1 ? "s" : ""}</span>
                    </div>
                  </div>

                  <Link href={`/parametres/automations-v2/${rule.id}`} className="inline-flex items-center gap-1 rounded-md border border-gray-600 bg-gray-800 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700">
                    <Pencil className="h-3 w-3" /> Modifier
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
