"use client";

import { useState } from "react";
import { Save, Trash2, Plus, X } from "lucide-react";
import { TRIGGER_LABELS, ACTION_TYPE_LABELS, CONDITION_FIELDS } from "@/lib/automations-v2-constants";

type Condition = { field: string; operator: string; value: string };
type ActionConfig = Record<string, string>;

type Rule = {
  id?: string;
  nom: string;
  description: string;
  enabled: boolean;
  trigger: string;
  conditions: Condition[];
  delayType: string;
  delayValue: number;
  actionType: string;
  actionConfig: ActionConfig;
  deduplicationKey: string;
};

type Props = {
  initial?: Partial<Rule>;
  onSave: (rule: Rule) => Promise<void>;
  onDelete?: () => Promise<void>;
  saving?: boolean;
  templates?: { id: string; type: string; nom: string }[];
};

export function RuleForm({ initial, onSave, onDelete, saving, templates = [] }: Props) {
  const [nom, setNom] = useState(initial?.nom || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [trigger, setTrigger] = useState(initial?.trigger || "session_start");
  const [conditions, setConditions] = useState<Condition[]>(initial?.conditions || []);
  const [delayType, setDelayType] = useState(initial?.delayType || "immediate");
  const [delayValue, setDelayValue] = useState(initial?.delayValue || 0);
  const [actionType, setActionType] = useState(initial?.actionType || "send_email");
  const [actionConfig, setActionConfig] = useState<ActionConfig>(initial?.actionConfig || {});
  const [deduplicationKey, setDeduplicationKey] = useState(initial?.deduplicationKey || "session_contact");

  const addCondition = () => {
    setConditions([...conditions, { field: "formation.categorie", operator: "equals", value: "" }]);
  };
  const removeCondition = (i: number) => {
    setConditions(conditions.filter((_, idx) => idx !== i));
  };
  const updateCondition = (i: number, patch: Partial<Condition>) => {
    setConditions(conditions.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: initial?.id,
      nom,
      description,
      enabled: initial?.enabled ?? true,
      trigger,
      conditions,
      delayType,
      delayValue,
      actionType,
      actionConfig,
      deduplicationKey,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Nom + description */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1">Nom de la regle *</label>
          <input value={nom} onChange={(e) => setNom(e.target.value)} required className="w-full h-10 rounded-md border border-gray-600 bg-gray-900 px-3 text-sm text-gray-100" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1">Description</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} className="w-full h-10 rounded-md border border-gray-600 bg-gray-900 px-3 text-sm text-gray-100" />
        </div>
      </div>

      {/* Declencheur */}
      <div>
        <label className="block text-xs font-semibold text-gray-200 mb-2 uppercase tracking-wider">Declencheur</label>
        <select value={trigger} onChange={(e) => setTrigger(e.target.value)} className="w-full h-10 rounded-md border border-gray-600 bg-gray-900 text-sm text-gray-100 px-3">
          {Object.entries(TRIGGER_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* Conditions */}
      <div>
        <label className="block text-xs font-semibold text-gray-200 mb-2 uppercase tracking-wider">
          Conditions <span className="text-gray-500 font-normal normal-case">(optionnel — toutes doivent etre vraies)</span>
        </label>
        <div className="space-y-2">
          {conditions.map((cond, i) => (
            <div key={i} className="flex items-center gap-2">
              <select value={cond.field} onChange={(e) => updateCondition(i, { field: e.target.value })} className="h-9 rounded-md border border-gray-600 bg-gray-900 text-xs text-gray-200 px-2 flex-1">
                {CONDITION_FIELDS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
              <select value={cond.operator} onChange={(e) => updateCondition(i, { operator: e.target.value })} className="h-9 w-28 rounded-md border border-gray-600 bg-gray-900 text-xs text-gray-200 px-2">
                <option value="equals">egal a</option>
                <option value="not_equals">different de</option>
                <option value="in">dans la liste</option>
              </select>
              <input value={cond.value} onChange={(e) => updateCondition(i, { value: e.target.value })} placeholder="Valeur" className="h-9 flex-1 rounded-md border border-gray-600 bg-gray-900 text-xs text-gray-200 px-2" />
              <button type="button" onClick={() => removeCondition(i)} className="p-1.5 rounded text-red-400 hover:bg-red-900/30">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addCondition} className="mt-2 inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300">
          <Plus className="h-3 w-3" /> Ajouter une condition
        </button>
      </div>

      {/* Delai */}
      <div>
        <label className="block text-xs font-semibold text-gray-200 mb-2 uppercase tracking-wider">Delai</label>
        <div className="flex items-center gap-3">
          <select value={delayType} onChange={(e) => setDelayType(e.target.value)} className="h-10 rounded-md border border-gray-600 bg-gray-900 text-sm text-gray-100 px-3">
            <option value="immediate">Immediat</option>
            <option value="minutes">Minutes</option>
            <option value="hours">Heures</option>
            <option value="days">Jours</option>
          </select>
          {delayType !== "immediate" && (
            <input type="number" min={0} value={delayValue} onChange={(e) => setDelayValue(parseInt(e.target.value) || 0)} className="h-10 w-24 rounded-md border border-gray-600 bg-gray-900 text-sm text-gray-100 px-3" />
          )}
        </div>
      </div>

      {/* Action */}
      <div>
        <label className="block text-xs font-semibold text-gray-200 mb-2 uppercase tracking-wider">Action</label>
        <select value={actionType} onChange={(e) => { setActionType(e.target.value); setActionConfig({}); }} className="w-full h-10 rounded-md border border-gray-600 bg-gray-900 text-sm text-gray-100 px-3 mb-3">
          {Object.entries(ACTION_TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        {/* Config contextuelle */}
        {actionType === "send_email" && (
          <div>
            <label className="block text-xs text-gray-400 mb-1">Template email</label>
            <select value={actionConfig.templateId || ""} onChange={(e) => setActionConfig({ ...actionConfig, templateId: e.target.value })} className="w-full h-9 rounded-md border border-gray-600 bg-gray-900 text-xs text-gray-200 px-2">
              <option value="">-- Choisir un template --</option>
              {templates.map((t) => (
                <option key={t.type} value={t.type}>{t.nom}</option>
              ))}
            </select>
          </div>
        )}

        {actionType === "change_status" && (
          <div>
            <label className="block text-xs text-gray-400 mb-1">Statut cible</label>
            <select value={actionConfig.targetStatus || ""} onChange={(e) => setActionConfig({ ...actionConfig, targetStatus: e.target.value })} className="w-full h-9 rounded-md border border-gray-600 bg-gray-900 text-xs text-gray-200 px-2">
              <option value="">-- Choisir --</option>
              <option value="confirmee">Confirmee</option>
              <option value="en_cours">En cours</option>
              <option value="terminee">Terminee</option>
            </select>
          </div>
        )}

        {actionType === "create_task" && (
          <div>
            <label className="block text-xs text-gray-400 mb-1">Titre de la tache</label>
            <input value={actionConfig.taskTitle || ""} onChange={(e) => setActionConfig({ ...actionConfig, taskTitle: e.target.value })} className="w-full h-9 rounded-md border border-gray-600 bg-gray-900 text-xs text-gray-200 px-2" placeholder="ex: Verifier les inscriptions" />
          </div>
        )}

        {actionType === "send_sms" && (
          <div>
            <label className="block text-xs text-gray-400 mb-1">Contenu SMS</label>
            <textarea value={actionConfig.smsContent || ""} onChange={(e) => setActionConfig({ ...actionConfig, smsContent: e.target.value })} rows={3} className="w-full rounded-md border border-gray-600 bg-gray-900 text-xs text-gray-200 px-2 py-1.5" placeholder="Bonjour {{stagiaire.prenom}}..." />
            <p className="text-[9px] text-gray-500 mt-1">Integration SMS (Brevo/OVH) requise.</p>
          </div>
        )}
      </div>

      {/* Deduplication */}
      <div>
        <label className="block text-xs font-semibold text-gray-200 mb-2 uppercase tracking-wider">Deduplication</label>
        <select value={deduplicationKey} onChange={(e) => setDeduplicationKey(e.target.value)} className="h-10 rounded-md border border-gray-600 bg-gray-900 text-sm text-gray-100 px-3">
          <option value="session_contact">Par session + stagiaire (defaut)</option>
          <option value="session">Par session uniquement</option>
          <option value="contact">Par stagiaire uniquement</option>
        </select>
        <p className="text-[10px] text-gray-500 mt-1">Empeche la regle de s&apos;executer deux fois pour la meme cle.</p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-700">
        {onDelete ? (
          <button type="button" onClick={onDelete} className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300">
            <Trash2 className="h-3.5 w-3.5" /> Supprimer cette regle
          </button>
        ) : (
          <div />
        )}
        <button type="submit" disabled={saving || !nom || !trigger || !actionType} className="inline-flex items-center gap-2 rounded-md bg-red-600 hover:bg-red-700 px-5 py-2 text-sm font-medium text-white disabled:opacity-50">
          <Save className="h-4 w-4" /> {saving ? "..." : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}
