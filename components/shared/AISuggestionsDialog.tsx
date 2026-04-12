"use client";

import { useState } from "react";
import { Sparkles, X, Loader2, CheckCircle2 } from "lucide-react";

type SuggestionType = "amelioration" | "incident" | "audit";

type Props<T> = {
  type: SuggestionType;
  label: string;
  onImport: (items: T[]) => void;
  count?: number;
  buttonLabel?: string;
};

export function AISuggestionsDialog<T extends Record<string, unknown>>({
  type,
  label,
  onImport,
  count = 3,
  buttonLabel = "Suggerer avec IA",
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<T[]>([]);
  const [selected, setSelected] = useState<boolean[]>([]);
  const [error, setError] = useState("");

  const generate = async () => {
    setLoading(true);
    setError("");
    setItems([]);
    setSelected([]);
    try {
      const res = await fetch("/api/ai/qualiopi/suggerer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, count }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur IA");
      } else if (Array.isArray(data.items)) {
        setItems(data.items);
        setSelected(data.items.map(() => true));
      }
    } catch {
      setError("Erreur reseau");
    }
    setLoading(false);
  };

  const handleOpen = () => {
    setOpen(true);
    if (items.length === 0) generate();
  };

  const toggle = (i: number) => {
    setSelected((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  };

  const handleImport = () => {
    const picked = items.filter((_, i) => selected[i]);
    onImport(picked);
    setOpen(false);
    // Reset pour prochaine ouverture
    setItems([]);
    setSelected([]);
  };

  const selectedCount = selected.filter(Boolean).length;

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 px-3 py-2 text-sm font-medium text-white transition-all shadow-sm"
      >
        <Sparkles className="h-4 w-4" />
        {buttonLabel}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-red-500" />
                <h2 className="text-base font-semibold text-gray-100">
                  Suggestions IA — {label}
                </h2>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5">
              {loading && (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-red-500" />
                  <p className="text-sm text-gray-400">Claude analyse vos donnees qualite...</p>
                </div>
              )}

              {error && !loading && (
                <div className="rounded-md bg-red-900/20 border border-red-700 p-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              {!loading && !error && items.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-8 italic">
                  Aucune suggestion generee.
                </p>
              )}

              {!loading && items.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs text-gray-400 mb-2">
                    Selectionnez les elements a importer ({selectedCount} / {items.length} selectionne(s))
                  </p>
                  {items.map((item, i) => (
                    <label
                      key={i}
                      className={`block rounded-lg border p-4 cursor-pointer transition-colors ${
                        selected[i]
                          ? "border-red-600 bg-red-900/10"
                          : "border-gray-700 bg-gray-900 hover:border-gray-500"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selected[i]}
                          onChange={() => toggle(i)}
                          className="mt-0.5 h-4 w-4"
                        />
                        <div className="flex-1 min-w-0 space-y-1 text-sm">
                          {Object.entries(item).map(([key, value]) => (
                            <div key={key} className="flex items-start gap-2">
                              <span className="text-xs text-gray-500 uppercase tracking-wide shrink-0 w-24">
                                {key.replace(/_/g, " ")}
                              </span>
                              <span className="text-gray-200 flex-1">
                                {typeof value === "string" || typeof value === "number" ? String(value) : JSON.stringify(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-5 py-4 border-t border-gray-700 bg-gray-900/50">
              <button
                onClick={generate}
                disabled={loading}
                className="text-xs text-gray-400 hover:text-gray-200 disabled:opacity-50 inline-flex items-center gap-1"
              >
                <Sparkles className="h-3 w-3" /> Regenerer
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setOpen(false)}
                  className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-200"
                >
                  Annuler
                </button>
                <button
                  onClick={handleImport}
                  disabled={loading || selectedCount === 0}
                  className="inline-flex items-center gap-2 rounded-md bg-red-600 hover:bg-red-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" /> Importer ({selectedCount})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
