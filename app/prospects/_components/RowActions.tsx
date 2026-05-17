"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, ExternalLink, XCircle, ChevronRight } from "lucide-react";
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

interface RowActionsProps {
  demandeId: string;
  currentStatut: string;
  onRefresh: () => void;
}

export function RowActions({ demandeId, currentStatut, onRefresh }: RowActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [showStatuts, setShowStatuts] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) { setShowStatuts(false); return; }
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  async function patchStatut(newStatut: string) {
    if (newStatut === currentStatut) { setOpen(false); return; }

    if (currentStatut === "nouveau" && newStatut === "qualifie") {
      const ok = window.confirm(
        "Qualifier ce prospect va déclencher la génération automatique d'un devis par l'IA. Continuer ?"
      );
      if (!ok) { setOpen(false); return; }
    }

    setOpen(false);
    try {
      const res = await fetch(`/api/demandes/${demandeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut: newStatut }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.ai?.generated) {
        notify.success("Statut mis à jour", "Devis IA généré automatiquement");
      } else {
        notify.success("Statut mis à jour");
      }
      onRefresh();
    } catch {
      notify.error("Impossible de changer le statut");
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        data-testid="row-actions-trigger"
        className="h-7 w-7 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-200 hover:bg-gray-700 transition-colors opacity-0 group-hover:opacity-100"
        title="Actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-[180px] rounded-lg border border-gray-600 bg-gray-800 shadow-xl py-1">
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(false); router.push(`/prospects/${demandeId}`); }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700 text-left"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Ouvrir la fiche
          </button>

          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowStatuts((s) => !s); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700 text-left"
            >
              <span className={`h-2 w-2 rounded-full ${STATUS_DOT[currentStatut] ?? "bg-gray-500"}`} />
              Changer le statut
              <ChevronRight className="h-3 w-3 ml-auto" />
            </button>
            {showStatuts && (
              <div className="absolute right-full top-0 mr-1 min-w-[160px] rounded-lg border border-gray-600 bg-gray-800 shadow-xl py-1">
                {BESOIN_STATUTS_PIPELINE.map((key) => {
                  const val = BESOIN_STATUTS[key];
                  return (
                    <button
                      key={key}
                      onClick={(e) => { e.stopPropagation(); patchStatut(key); }}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-gray-700 ${key === currentStatut ? "text-gray-300 font-medium" : "text-gray-400"}`}
                    >
                      <span className={`h-2 w-2 rounded-full ${STATUS_DOT[key] ?? "bg-gray-500"}`} />
                      {val.label}
                      {key === currentStatut && <span className="ml-auto text-gray-500">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-gray-700 my-1" />

          <button
            onClick={(e) => { e.stopPropagation(); patchStatut("refuse"); }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-gray-700 text-left"
          >
            <XCircle className="h-3.5 w-3.5" /> Marquer comme perdu
          </button>
        </div>
      )}
    </div>
  );
}
