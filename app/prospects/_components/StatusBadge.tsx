"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { BESOIN_STATUTS, BESOIN_STATUTS_PIPELINE } from "@/lib/constants";
import { notify } from "@/lib/toast";

const STATUS_DOT: Record<string, string> = {
  nouveau:        "bg-sky-500",
  qualifie:       "bg-violet-500",
  devis_envoye:   "bg-amber-500",
  en_negociation: "bg-orange-500",
  accepte:        "bg-emerald-500",
  refuse:         "bg-red-500",
  archive:        "bg-slate-500",
};

interface StatusBadgeProps {
  demandeId: string;
  statut: string;
  onRefresh: () => void;
}

export function StatusBadge({ demandeId, statut, onRefresh }: StatusBadgeProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  async function changeStatut(newStatut: string) {
    if (newStatut === statut) { setOpen(false); return; }

    // Confirm before triggering AI generation (Nouveau → Devis envoyé)
    if (statut === "nouveau" && newStatut === "devis_envoye") {
      const ok = window.confirm(
        "Passer en 'Devis envoyé' va générer automatiquement un devis brouillon par l'IA. Continuer ?"
      );
      if (!ok) { setOpen(false); return; }
    }

    setOpen(false);
    setBusy(true);
    try {
      const res = await fetch(`/api/demandes/${demandeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut: newStatut }),
      });
      if (!res.ok) throw new Error("Erreur serveur");
      const data = await res.json();
      if (data.ai?.generated) {
        notify.success("Statut mis à jour", "Devis généré automatiquement par l'IA");
      } else {
        notify.success("Statut mis à jour");
      }
      onRefresh();
    } catch {
      notify.error("Impossible de changer le statut");
    } finally {
      setBusy(false);
    }
  }

  const info = BESOIN_STATUTS[statut as keyof typeof BESOIN_STATUTS];
  const dot = STATUS_DOT[statut] ?? "bg-gray-500";

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        disabled={busy}
        data-testid="status-badge-trigger"
        className="inline-flex items-center gap-1.5 rounded-full border border-gray-600 px-2.5 py-1 text-xs font-medium transition-colors hover:bg-gray-700 disabled:opacity-50"
      >
        <span className={`h-2 w-2 rounded-full shrink-0 ${dot}`} />
        <span>{info?.label ?? statut}</span>
        <ChevronDown className="h-3 w-3 text-gray-400 ml-0.5" />
      </button>

      {open && (
        <div
          data-testid="status-badge-dropdown"
          className="absolute left-0 top-full mt-1 z-50 min-w-[160px] rounded-lg border border-gray-600 bg-gray-800 shadow-xl py-1"
        >
          {BESOIN_STATUTS_PIPELINE.map((key) => {
            const val = BESOIN_STATUTS[key];
            return (
              <button
                key={key}
                onClick={(e) => { e.stopPropagation(); changeStatut(key); }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-gray-700 transition-colors ${key === statut ? "text-gray-300 font-medium" : "text-gray-400"}`}
              >
                <span className={`h-2 w-2 rounded-full shrink-0 ${STATUS_DOT[key] ?? "bg-gray-500"}`} />
                {val.label}
                {key === statut && <span className="ml-auto text-gray-500">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
