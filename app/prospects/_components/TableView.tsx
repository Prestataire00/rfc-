"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users as UsersIcon, AlertCircle } from "lucide-react";
import { BESOIN_PRIORITES } from "@/lib/constants";
import { formatDate, formatCurrency } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";
import { RowActions } from "./RowActions";
import type { Besoin } from "./KanbanView";

interface TableViewProps {
  besoins: Besoin[];
  onRefresh: () => void;
}

const PRIORITE_STYLE: Record<string, string> = {
  basse:   "text-gray-500",
  normale: "text-blue-400",
  haute:   "text-orange-400",
  urgente: "text-red-400 font-semibold",
};

export function TableView({ besoins, onRefresh }: TableViewProps) {
  const router = useRouter();

  // Sort by createdAt desc (newest first)
  const sorted = [...besoins].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-gray-400 mb-4">Aucun prospect pour l&apos;instant</p>
        <Link
          href="/prospects/nouveau"
          className="inline-flex items-center gap-2 rounded-md bg-red-600 hover:bg-red-700 px-4 py-2 text-sm font-medium text-white transition-colors"
        >
          + Nouvelle demande
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-700 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-900 border-b border-gray-700">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-36">
              Statut
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Prospect
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell w-48">
              Formation
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-28 hidden sm:table-cell">
              Montant
            </th>
            <th className="px-3 py-3 w-10" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700/60 bg-gray-800">
          {sorted.map((b) => (
            <TableRow key={b.id} b={b} onRefresh={onRefresh} onNavigate={(id) => router.push(`/prospects/${id}`)} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TableRow({
  b,
  onRefresh,
  onNavigate,
}: {
  b: Besoin;
  onRefresh: () => void;
  onNavigate: (id: string) => void;
}) {
  const prioStyle = PRIORITE_STYLE[b.priorite] ?? "text-gray-400";
  const prioLabel = BESOIN_PRIORITES[b.priorite as keyof typeof BESOIN_PRIORITES]?.label ?? b.priorite;
  const isUrgent = b.priorite === "urgente";

  // Prospect display name
  const prospectName =
    b.entreprise?.nom ?? (b.contact ? `${b.contact.prenom} ${b.contact.nom}` : b.titre);
  const prospectSub = b.entreprise
    ? b.contact
      ? `${b.contact.prenom} ${b.contact.nom}`
      : null
    : null;

  // Montant from budget (list endpoint returns budget, not devis.montantTTC)
  const montant = b.budget ?? null;

  return (
    <tr
      className="group hover:bg-gray-700/40 cursor-pointer transition-colors"
      onClick={() => onNavigate(b.id)}
    >
      {/* Statut — stop propagation so click on badge doesn't navigate */}
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <StatusBadge demandeId={b.id} statut={b.statut} onRefresh={onRefresh} />
      </td>

      {/* Prospect */}
      <td className="px-4 py-3 max-w-xs">
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-gray-100 truncate">{prospectName}</span>
          {prospectSub && <span className="text-xs text-gray-400 truncate">{prospectSub}</span>}
          <div className="flex items-center gap-2 mt-0.5">
            {isUrgent && (
              <span className={`inline-flex items-center gap-0.5 text-[10px] ${prioStyle}`}>
                <AlertCircle className="h-3 w-3" /> {prioLabel}
              </span>
            )}
            {!isUrgent && b.priorite !== "normale" && (
              <span className={`text-[10px] ${prioStyle}`}>{prioLabel}</span>
            )}
            <span className="text-[10px] text-gray-500">{formatDate(b.createdAt)}</span>
            {b.devis && (
              <span className="text-[10px] text-gray-500">· Devis {b.devis.numero}</span>
            )}
          </div>
        </div>
      </td>

      {/* Formation */}
      <td className="px-4 py-3 hidden md:table-cell">
        {b.formation ? (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-gray-300 truncate max-w-[180px]">{b.formation.titre}</span>
            {b.nbStagiaires && (
              <span className="inline-flex items-center gap-1 text-[10px] text-gray-500">
                <UsersIcon className="h-3 w-3" /> {b.nbStagiaires} stagiaire{b.nbStagiaires > 1 ? "s" : ""}
              </span>
            )}
          </div>
        ) : (
          <span className="text-gray-600">—</span>
        )}
      </td>

      {/* Montant */}
      <td className="px-4 py-3 text-right hidden sm:table-cell">
        {montant ? (
          <span className="text-sm font-medium text-gray-200">{formatCurrency(montant)}</span>
        ) : (
          <span className="text-gray-600">—</span>
        )}
      </td>

      {/* Actions — stop propagation so ⋮ click doesn't navigate */}
      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
        <RowActions demandeId={b.id} currentStatut={b.statut} onRefresh={onRefresh} />
      </td>
    </tr>
  );
}
