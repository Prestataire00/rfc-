"use client";

import { useEffect, useState } from "react";
import { X, Sparkles, Loader2, Trash2 } from "lucide-react";

interface Suggestion {
  titre: string;
  description: string;
  priorite: "basse" | "moyenne" | "haute" | "urgente";
}

type EditableSuggestion = Suggestion & { id: string; selected: boolean };

interface Props {
  projetId: string;
  onClose: () => void;
  onCreated: () => void;
}

const PRIO_OPTIONS = ["basse", "moyenne", "haute", "urgente"] as const;

/**
 * Modal en 2 phases :
 *  1) Phase "preview"  : appel POST /api/projets/[id]/taches/generate → propose
 *     N tâches que l'admin peut éditer/désélectionner.
 *  2) Phase "saving"   : confirme → POST /generate/accept qui crée la TaskList +
 *     les items en transaction.
 */
export function GenerateTasksModal({ projetId, onClose, onCreated }: Props) {
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<EditableSuggestion[]>([]);
  const [listNom, setListNom] = useState("Tâches générées par IA");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/projets/${projetId}/taches/generate`, { method: "POST" });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? res.statusText);
        }
        const data = await res.json();
        if (cancelled) return;
        setSuggestions(
          (data.suggestions as Suggestion[]).map((s, idx) => ({
            ...s,
            id: `tmp-${idx}`,
            selected: true,
          })),
        );
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projetId]);

  const updateField = (id: string, patch: Partial<EditableSuggestion>) => {
    setSuggestions((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const removeOne = (id: string) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
  };

  const selectedCount = suggestions.filter((s) => s.selected).length;

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const items = suggestions
        .filter((s) => s.selected && s.titre.trim().length > 0)
        .map((s) => ({
          titre: s.titre.trim(),
          description: s.description.trim() || null,
          priorite: s.priorite,
        }));
      if (items.length === 0) {
        setError("Sélectionne au moins une tâche.");
        setSaving(false);
        return;
      }
      const res = await fetch(`/api/projets/${projetId}/taches/generate/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listNom: listNom.trim() || "Tâches générées par IA", items }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? res.statusText);
      }
      onCreated();
      onClose();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-purple-500/30 rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        <header className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="font-semibold text-gray-100 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-400" />
            Tâches proposées par Claude
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading && (
            <div className="flex items-center justify-center py-12 text-gray-400 gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Génération en cours… (environ 5-10 secondes)</span>
            </div>
          )}

          {!loading && error && (
            <div className="p-3 border border-red-500/30 bg-red-500/10 text-red-300 text-sm rounded">
              {error}
            </div>
          )}

          {!loading && !error && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 uppercase tracking-wide">Nom de la liste</label>
                <input
                  type="text"
                  value={listNom}
                  onChange={(e) => setListNom(e.target.value)}
                  className="w-full p-2 bg-gray-800 border border-gray-700 rounded text-sm"
                />
              </div>

              <p className="text-xs text-gray-500 mt-3">
                {selectedCount} sur {suggestions.length} tâche{suggestions.length > 1 ? "s" : ""} sélectionnée{selectedCount > 1 ? "s" : ""}.
                Décoche celles que tu ne veux pas, édite les autres.
              </p>

              <ul className="space-y-2">
                {suggestions.map((s) => (
                  <li
                    key={s.id}
                    className={`rounded-lg border p-3 transition-colors ${s.selected ? "border-gray-700 bg-gray-800" : "border-gray-800 bg-gray-900 opacity-50"}`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={s.selected}
                        onChange={(e) => updateField(s.id, { selected: e.target.checked })}
                        className="mt-1 shrink-0"
                      />
                      <div className="flex-1 min-w-0 space-y-2">
                        <input
                          type="text"
                          value={s.titre}
                          onChange={(e) => updateField(s.id, { titre: e.target.value })}
                          className="w-full p-1.5 bg-gray-900 border border-gray-700 rounded text-sm font-medium"
                        />
                        <textarea
                          value={s.description}
                          onChange={(e) => updateField(s.id, { description: e.target.value })}
                          rows={2}
                          className="w-full p-1.5 bg-gray-900 border border-gray-700 rounded text-xs"
                        />
                        <div className="flex items-center gap-2">
                          <select
                            value={s.priorite}
                            onChange={(e) =>
                              updateField(s.id, {
                                priorite: e.target.value as Suggestion["priorite"],
                              })
                            }
                            className="text-[10px] bg-gray-900 border border-gray-700 rounded px-1 py-0.5"
                          >
                            {PRIO_OPTIONS.map((p) => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => removeOne(s.id)}
                            className="ml-auto text-gray-500 hover:text-red-400 p-1"
                            title="Retirer cette suggestion"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <footer className="flex items-center justify-between p-4 border-t border-gray-700">
          <p className="text-xs text-gray-500">
            La liste sera créée en violet pour signaler son origine IA.
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-200"
            >
              Annuler
            </button>
            <button
              onClick={submit}
              disabled={loading || saving || selectedCount === 0}
              className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm rounded inline-flex items-center gap-1.5"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {saving ? "Création…" : `Créer ${selectedCount} tâche${selectedCount > 1 ? "s" : ""}`}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
