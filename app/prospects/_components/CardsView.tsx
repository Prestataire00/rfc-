"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { GraduationCap, Users as UsersIcon, AlertCircle } from "lucide-react";
import { BESOIN_PRIORITES } from "@/lib/constants";
import { formatDate, formatCurrency } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";
import { RowActions } from "./RowActions";
import type { Besoin } from "./KanbanView";

interface CardsViewProps {
  besoins: Besoin[];
  onRefresh: () => void;
}

const PRIORITE_STYLE: Record<string, string> = {
  basse:   "text-gray-500",
  normale: "text-blue-400",
  haute:   "text-orange-400",
  urgente: "text-red-400 font-semibold",
};

export function CardsView({ besoins, onRefresh }: CardsViewProps) {
  const router = useRouter();

  // Sort by createdAt desc (newest first)
  const sorted = [...besoins].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-gray-400 mb-4">Aucun prospect</p>
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {sorted.map((b) => (
        <ProspectCard
          key={b.id}
          b={b}
          onRefresh={onRefresh}
          onNavigate={(id) => router.push(`/prospects/${id}`)}
        />
      ))}
    </div>
  );
}

function ProspectCard({
  b,
  onRefresh,
  onNavigate,
}: {
  b: Besoin;
  onRefresh: () => void;
  onNavigate: (id: string) => void;
}) {
  const prioStyle = PRIORITE_STYLE[b.priorite] ?? "text-gray-400";
  const prioLabel =
    BESOIN_PRIORITES[b.priorite as keyof typeof BESOIN_PRIORITES]?.label ?? b.priorite;
  const isUrgent = b.priorite === "urgente";

  // Prospect display name: contact name first, then company, then titre
  const prospectName = b.contact
    ? `${b.contact.prenom} ${b.contact.nom}`
    : b.entreprise?.nom ?? b.titre;
  // Subtitle: company name (when contact name is primary)
  const prospectSub = b.contact && b.entreprise ? b.entreprise.nom : null;

  return (
    <div
      className="group relative border border-gray-700 bg-gray-800 rounded-lg p-4 hover:shadow-md hover:border-gray-600 cursor-pointer transition-all flex flex-col gap-3"
      onClick={() => onNavigate(b.id)}
      data-testid="prospect-card"
    >
      {/* Header: status badge + menu — stopPropagation so clicks here don't navigate */}
      <div
        className="flex items-start justify-between gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <StatusBadge demandeId={b.id} statut={b.statut} onRefresh={onRefresh} />
        <RowActions demandeId={b.id} currentStatut={b.statut} onRefresh={onRefresh} />
      </div>

      {/* Prospect name + company subtitle */}
      <div className="flex flex-col gap-0.5">
        <span className="font-semibold text-base text-gray-100 leading-tight">
          {prospectName}
        </span>
        {prospectSub && (
          <span className="text-sm text-gray-400 truncate">{prospectSub}</span>
        )}
      </div>

      {/* Formation + nb stagiaires */}
      {b.formation && (
        <div className="flex items-center justify-between gap-2 text-sm text-gray-300">
          <span className="flex items-center gap-1 truncate min-w-0">
            <GraduationCap className="h-4 w-4 shrink-0 text-red-400" />
            <span className="truncate">{b.formation.titre}</span>
          </span>
          {b.nbStagiaires && (
            <span className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
              <UsersIcon className="h-3.5 w-3.5" />
              {b.nbStagiaires} stagiaire{b.nbStagiaires > 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}

      {/* Devis + montant */}
      {b.devis && (
        <div className="text-xs text-gray-400">
          Devis {b.devis.numero}
          {b.budget != null && <span> · {formatCurrency(b.budget)} HT</span>}
        </div>
      )}

      {/* Footer: priority + date */}
      <div className="flex items-center justify-between gap-2 mt-auto pt-2 border-t border-gray-700/60 text-xs">
        <span
          className={
            isUrgent ? `flex items-center gap-1 ${prioStyle}` : prioStyle
          }
        >
          {isUrgent && <AlertCircle className="h-3 w-3" />}
          {prioLabel}
        </span>
        <span className="text-gray-500">{formatDate(b.createdAt)}</span>
      </div>
    </div>
  );
}
