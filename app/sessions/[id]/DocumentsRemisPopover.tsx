"use client";

import { useState, useRef, useEffect } from "react";
import { FileCheck2, Check } from "lucide-react";

export const DOCUMENTS_RFC = [
  { key: "piece_identite", label: "Piece d'identite" },
  { key: "casier_b3", label: "Casier judiciaire B3" },
  { key: "test_b1", label: "Test B1" },
  { key: "diplome_ssiap", label: "Diplome SSIAP" },
  { key: "diplome", label: "Diplome" },
  { key: "photos", label: "2 Photos" },
  { key: "cnaps_preal", label: "CNAPS : Autorisation prealable" },
  { key: "cnaps_car", label: "CNAPS : CAR" },
  { key: "cv", label: "CV" },
  { key: "titre_sejour", label: "B1 / Titre de sejour" },
  { key: "justif_domicile", label: "Justificatif de domicile" },
] as const;

type Props = {
  sessionId: string;
  inscriptionId: string;
  documentsRemis: string | null | undefined;
  onChange: (next: string[]) => void;
};

function parseDocs(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function DocumentsRemisPopover({ sessionId, inscriptionId, documentsRemis, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [docs, setDocs] = useState<string[]>(parseDocs(documentsRemis));
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setDocs(parseDocs(documentsRemis));
  }, [documentsRemis]);

  // Click outside pour fermer
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const toggle = async (key: string) => {
    const next = docs.includes(key) ? docs.filter((d) => d !== key) : [...docs, key];
    // Optimistic update
    const before = docs;
    setDocs(next);
    onChange(next);
    setSaving(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/inscriptions/${inscriptionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentsRemis: next }),
      });
      if (!res.ok) throw new Error("update failed");
    } catch {
      // Rollback en cas d'erreur
      setDocs(before);
      onChange(before);
    } finally {
      setSaving(false);
    }
  };

  const total = DOCUMENTS_RFC.length;
  const count = docs.length;
  const complete = count === total;

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
          complete
            ? "border-green-600 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
            : count > 0
            ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
            : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
        }`}
        title="Documents recus pour cette inscription"
      >
        {complete ? <Check className="h-3.5 w-3.5" /> : <FileCheck2 className="h-3.5 w-3.5" />}
        Documents ({count}/{total})
      </button>

      {open && (
        <div className="absolute right-0 mt-1 z-30 w-72 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg p-3 text-left">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Documents remis</p>
            {saving && <span className="text-xs text-gray-500">Enregistrement...</span>}
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1.5">
            {DOCUMENTS_RFC.map((doc) => {
              const checked = docs.includes(doc.key);
              return (
                <label
                  key={doc.key}
                  className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer text-sm text-gray-800 dark:text-gray-200"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(doc.key)}
                    className="h-4 w-4 rounded text-red-600 focus:ring-red-500"
                  />
                  <span className={checked ? "line-through text-gray-500 dark:text-gray-400" : ""}>{doc.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
