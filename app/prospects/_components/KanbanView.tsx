"use client";

import { Building2, GraduationCap, Users as UsersIcon, Euro, User } from "lucide-react";
import { AlertCircle, Clock, MessageSquare, CheckCircle2, XCircle } from "lucide-react";
import { BESOIN_PRIORITES } from "@/lib/constants";
import { formatDate, formatCurrency } from "@/lib/utils";

export type Besoin = {
  id: string;
  titre: string;
  description: string | null;
  origine: string;
  statut: string;
  priorite: string;
  nbStagiaires: number | null;
  budget: number | null;
  createdAt: string;
  entreprise: { id: string; nom: string } | null;
  contact: { id: string; nom: string; prenom: string } | null;
  formation: { id: string; titre: string } | null;
  devis: { id: string; numero: string; statut: string } | null;
};

export const PIPELINE_COLS = [
  { key: "nouveau",        label: "Nouveau",        color: "border-sky-500/40",     dot: "bg-sky-500",     icon: AlertCircle },
  { key: "devis_envoye",   label: "Devis envoyé",   color: "border-amber-500/40",   dot: "bg-amber-500",   icon: Clock },
  { key: "en_negociation", label: "En négociation", color: "border-orange-500/40",  dot: "bg-orange-500",  icon: MessageSquare },
  { key: "accepte",        label: "Gagné",          color: "border-emerald-500/40", dot: "bg-emerald-500", icon: CheckCircle2 },
  { key: "refuse",         label: "Perdu",          color: "border-red-500/40",     dot: "bg-red-500",     icon: XCircle },
];

const ORIGINE_STYLE: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  client:    { icon: Building2, label: "Client",    color: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
  stagiaire: { icon: User,      label: "Stagiaire", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  centre:    { icon: Building2, label: "Centre",    color: "bg-red-500/10 text-red-400 border-red-500/30" },
};

const PRIORITE_STYLE: Record<string, string> = {
  basse:   "text-gray-400 bg-gray-500/10",
  normale: "text-blue-400 bg-blue-500/10",
  haute:   "text-orange-400 bg-orange-500/10",
  urgente: "text-red-400 bg-red-500/10 ring-1 ring-red-500/30",
};

function BesoinCard({ b, onOpen }: { b: Besoin; onOpen: (id: string) => void }) {
  const OrigIcon = ORIGINE_STYLE[b.origine]?.icon ?? Building2;
  const origStyle = ORIGINE_STYLE[b.origine]?.color ?? "bg-gray-500/10 text-gray-400 border-gray-500/30";
  const prio = PRIORITE_STYLE[b.priorite] ?? "text-gray-400 bg-gray-500/10";
  const prioLabel = BESOIN_PRIORITES[b.priorite as keyof typeof BESOIN_PRIORITES]?.label ?? b.priorite;
  const isUrgent = b.priorite === "urgente";
  return (
    <button
      onClick={() => onOpen(b.id)}
      className={`w-full text-left bg-gray-900 rounded-lg border p-3 hover:bg-gray-700 hover:shadow-md transition-all ${isUrgent ? "border-red-500/50 ring-1 ring-red-500/20" : "border-gray-700"}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-medium text-gray-100 line-clamp-2 flex-1">{b.titre}</p>
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium whitespace-nowrap ${origStyle}`}>
          <OrigIcon className="h-3 w-3 mr-1" />
          {ORIGINE_STYLE[b.origine]?.label ?? b.origine}
        </span>
      </div>
      {(b.entreprise || b.contact) && (
        <p className="text-xs text-gray-400 truncate mb-2">
          {b.entreprise?.nom || (b.contact ? `${b.contact.prenom} ${b.contact.nom}` : "")}
        </p>
      )}
      {b.formation && (
        <div className="flex items-center gap-1 text-xs text-red-400 mb-2 truncate">
          <GraduationCap className="h-3 w-3 shrink-0" />
          <span className="truncate">{b.formation.titre}</span>
        </div>
      )}
      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-700">
        <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${prio}`}>
          {prioLabel}
        </span>
        {b.nbStagiaires && (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-400">
            <UsersIcon className="h-3 w-3" /> {b.nbStagiaires}
          </span>
        )}
        {b.budget && (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-400 ml-auto">
            <Euro className="h-3 w-3" /> {formatCurrency(b.budget)}
          </span>
        )}
      </div>
      {b.devis && (
        <div className="mt-2 text-[10px] text-gray-500 flex items-center justify-between">
          <span>Devis {b.devis.numero}</span>
          <span className="text-gray-400">{formatDate(b.createdAt)}</span>
        </div>
      )}
      {!b.devis && (
        <p className="mt-2 text-[10px] text-gray-500 text-right">{formatDate(b.createdAt)}</p>
      )}
    </button>
  );
}

export function KanbanView({
  cols,
  byStatut,
  onOpen,
}: {
  cols: typeof PIPELINE_COLS;
  byStatut: Record<string, Besoin[]>;
  onOpen: (id: string) => void;
}) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2">
      {cols.map((col) => {
        const list = byStatut[col.key] || [];
        const Icon = col.icon;
        return (
          <div key={col.key} className={`flex-shrink-0 w-72 rounded-xl border bg-gray-800 ${col.color}`}>
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${col.dot}`} />
                <Icon className="h-3.5 w-3.5 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-200">{col.label}</h3>
              </div>
              <span className="text-xs font-medium text-gray-400 bg-gray-900 rounded-full px-2 py-0.5">
                {list.length}
              </span>
            </div>
            <div className="p-2 space-y-2 max-h-[70vh] overflow-y-auto">
              {list.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-6 italic">Vide</p>
              ) : (
                list.map((b) => <BesoinCard key={b.id} b={b} onOpen={onOpen} />)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
