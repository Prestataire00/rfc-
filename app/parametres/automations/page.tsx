"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Save, Zap, Clock, CheckCircle2, Info, Calendar, UserPlus } from "lucide-react";

type Rule = {
  id: string;
  type: string;
  label: string;
  description: string | null;
  enabled: boolean;
  relativeTo: string;
  offsetDays: number;
  offsetHours: number;
  timeOfDay: string | null;
  canalEmail: boolean;
  templateId: string | null;
  ordre: number;
};

const RELATIVE_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
  dateDebut: { label: "debut de session", icon: Calendar },
  dateFin: { label: "fin de session", icon: CheckCircle2 },
  inscription: { label: "inscription", icon: UserPlus },
  creation_session: { label: "creation de session", icon: Zap },
};

function formatOffset(r: Rule): string {
  const rel = RELATIVE_LABELS[r.relativeTo]?.label || r.relativeTo;
  if (r.offsetDays === 0 && r.offsetHours === 0) {
    return `Le jour ${rel}${r.timeOfDay ? ` a ${r.timeOfDay}` : ""}`;
  }
  if (r.offsetDays !== 0) {
    const absDays = Math.abs(r.offsetDays);
    const prefix = r.offsetDays < 0 ? "J-" : "J+";
    const t = r.timeOfDay ? ` a ${r.timeOfDay}` : "";
    return `${prefix}${absDays} ${rel}${t}`;
  }
  const absH = Math.abs(r.offsetHours);
  const dir = r.offsetHours < 0 ? "avant" : "apres";
  return `${absH}h ${dir} ${rel}`;
}

export default function AutomationsSettingsPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  useEffect(() => {
    fetch("/api/automations").then((r) => r.ok ? r.json() : []).then((d) => {
      setRules(Array.isArray(d) ? d : []);
      setLoading(false);
    });
  }, []);

  const updateRule = (id: string, patch: Partial<Rule>) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg("");
    const res = await fetch("/api/automations", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rules }),
    });
    if (res.ok) {
      setSaveMsg("Automatisations enregistrees");
      setTimeout(() => setSaveMsg(""), 3000);
    } else {
      setSaveMsg("Erreur");
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="p-6 flex items-center justify-center py-24"><div className="h-6 w-6 animate-spin rounded-full border-2 border-red-600 border-t-transparent" /></div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/parametres" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-300 mb-4">
          <ArrowLeft className="h-4 w-4" /> Retour Parametres
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
              <Zap className="h-6 w-6 text-red-500" /> Automatisations
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Configurez quand envoyer automatiquement chaque document pour toutes vos sessions.
              Ces valeurs peuvent etre modifiees session par session.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {saveMsg && <span className={`text-xs ${saveMsg.includes("Erreur") ? "text-red-400" : "text-emerald-400"}`}>{saveMsg}</span>}
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-md bg-red-600 hover:bg-red-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              <Save className="h-4 w-4" /> {saving ? "..." : "Enregistrer"}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-md bg-blue-900/20 border border-blue-700 px-4 py-3 text-sm text-blue-300 flex items-start gap-2 mb-6">
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        <div>
          Les automatisations s&apos;executent toutes les heures via un cron. <strong>J-2</strong> signifie 2 jours avant, <strong>J+1</strong> signifie le lendemain. Chaque regle peut etre desactivee ou surchargee session par session.
        </div>
      </div>

      <div className="space-y-3">
        {rules.map((rule) => {
          const relIcon = RELATIVE_LABELS[rule.relativeTo]?.icon || Clock;
          const Icon = relIcon;
          return (
            <div
              key={rule.id}
              className={`rounded-lg border p-4 ${rule.enabled ? "border-gray-700 bg-gray-800" : "border-gray-700/50 bg-gray-800/40 opacity-70"}`}
            >
              <div className="flex items-start gap-4">
                <label className="flex items-center cursor-pointer shrink-0 mt-0.5">
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={(e) => updateRule(rule.id, { enabled: e.target.checked })}
                    className="h-5 w-5 rounded"
                  />
                </label>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-100">{rule.label}</h3>
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-900 text-gray-300 border border-gray-700 px-2 py-0.5 text-[10px] font-medium">
                      <Icon className="h-2.5 w-2.5" /> {formatOffset(rule)}
                    </span>
                  </div>
                  {rule.description && <p className="text-xs text-gray-400 mb-3">{rule.description}</p>}

                  {rule.enabled && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-gray-700">
                      <div>
                        <label className="block text-[10px] uppercase text-gray-500 mb-1">Par rapport a</label>
                        <select
                          value={rule.relativeTo}
                          onChange={(e) => updateRule(rule.id, { relativeTo: e.target.value })}
                          className="w-full h-8 rounded-md border border-gray-600 bg-gray-900 text-xs text-gray-200 px-2"
                        >
                          <option value="dateDebut">Debut session</option>
                          <option value="dateFin">Fin session</option>
                          <option value="inscription">Inscription</option>
                          <option value="creation_session">Creation session</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase text-gray-500 mb-1">Decalage jours</label>
                        <input
                          type="number"
                          value={rule.offsetDays}
                          onChange={(e) => updateRule(rule.id, { offsetDays: parseInt(e.target.value) || 0 })}
                          className="w-full h-8 rounded-md border border-gray-600 bg-gray-900 text-xs text-gray-200 px-2"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase text-gray-500 mb-1">Decalage heures</label>
                        <input
                          type="number"
                          value={rule.offsetHours}
                          onChange={(e) => updateRule(rule.id, { offsetHours: parseInt(e.target.value) || 0 })}
                          className="w-full h-8 rounded-md border border-gray-600 bg-gray-900 text-xs text-gray-200 px-2"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase text-gray-500 mb-1">Heure (HH:MM)</label>
                        <input
                          type="time"
                          value={rule.timeOfDay || ""}
                          onChange={(e) => updateRule(rule.id, { timeOfDay: e.target.value || null })}
                          className="w-full h-8 rounded-md border border-gray-600 bg-gray-900 text-xs text-gray-200 px-2"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
