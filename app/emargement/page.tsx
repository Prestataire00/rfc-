"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ClipboardList, CalendarDays, Users, CheckCircle2, XCircle, Clock, MapPin, ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { SkeletonTable } from "@/components/shared/Skeleton";
import { StatutBadge } from "@/components/shared/StatutBadge";
import { SESSION_STATUTS } from "@/lib/constants";
import { formatDate, cn } from "@/lib/utils";
import { useApi } from "@/hooks/useApi";

type Row = {
  id: string;
  formation: string;
  formateur: string | null;
  lieu: string | null;
  statut: string;
  dateDebut: string;
  dateFin: string;
  nbJours: number;
  nbInscrits: number;
  nbPresents: number;
  nbAbsents: number;
  nbRetards: number;
  nbExcuses: number;
  nbSignes: number;
  nbCreneauxRenseignes: number;
  creneauxTheoriques: number;
  tauxPresence: number | null;
};

type Totaux = {
  sessions: number;
  inscrits: number;
  presents: number;
  absents: number;
  retards: number;
  signes: number;
  creneauxRenseignes: number;
  creneauxTheoriques: number;
  tauxPresenceGlobal: number | null;
  tauxCompletion: number | null;
};

type Response = {
  filtre: "actives" | "terminees" | "tous";
  totaux: Totaux;
  sessions: Row[];
};

const FILTRES = [
  { value: "actives", label: "Actives" },
  { value: "terminees", label: "Terminées (30j)" },
  { value: "tous", label: "Toutes" },
] as const;

export default function EmargementDashboardPage() {
  const [filtre, setFiltre] = useState<"actives" | "terminees" | "tous">("actives");
  const { data, isLoading } = useApi<Response>(`/api/emargement/dashboard?statut=${filtre}`);

  const totaux = data?.totaux;
  const rows = data?.sessions ?? [];

  return (
    <div className="p-6">
      <PageHeader
        title="Émargement"
        description="Suivi des présences / absences sur toutes les sessions de formation"
      />

      {/* Filtres */}
      <div className="flex items-center gap-1 mb-4 border-b border-gray-200 dark:border-gray-700">
        {FILTRES.map((f) => (
          <button
            key={f.value}
            onClick={() => setFiltre(f.value)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
              filtre === f.value
                ? "border-red-600 text-red-600"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* KPI globaux */}
      {totaux && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <KpiCard
            icon={CheckCircle2}
            color="emerald"
            label="Taux de présence"
            value={totaux.tauxPresenceGlobal != null ? `${totaux.tauxPresenceGlobal}%` : "—"}
            sub={`${totaux.presents} créneaux présents`}
          />
          <KpiCard
            icon={ClipboardList}
            color="blue"
            label="Complétion émargement"
            value={totaux.tauxCompletion != null ? `${totaux.tauxCompletion}%` : "—"}
            sub={`${totaux.creneauxRenseignes} / ${totaux.creneauxTheoriques} créneaux`}
          />
          <KpiCard
            icon={XCircle}
            color="red"
            label="Absences"
            value={String(totaux.absents)}
            sub={`${totaux.retards} retards · ${totaux.signes} signatures`}
          />
          <KpiCard
            icon={Users}
            color="violet"
            label="Sessions suivies"
            value={String(totaux.sessions)}
            sub={`${totaux.inscrits} stagiaires au total`}
          />
        </div>
      )}

      {/* Liste sessions */}
      {isLoading ? (
        <SkeletonTable rows={6} cols={6} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Aucune session à afficher"
          description={
            filtre === "actives"
              ? "Aucune session active actuellement."
              : filtre === "terminees"
              ? "Aucune session terminée dans les 30 derniers jours."
              : "Aucune session confirmée, en cours ou récemment terminée."
          }
        />
      ) : (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Formation</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Période</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Statut</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Inscrits</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Présence</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Complétion</th>
                <th className="px-4 py-3 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {rows.map((r) => {
                const st = SESSION_STATUTS[r.statut as keyof typeof SESSION_STATUTS];
                const completion = r.creneauxTheoriques > 0
                  ? Math.round((r.nbCreneauxRenseignes / r.creneauxTheoriques) * 100)
                  : null;
                return (
                  <tr
                    key={r.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer"
                    onClick={() => (window.location.href = `/sessions/${r.id}?tab=emargement`)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-gray-100">{r.formation}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-0.5">
                        {r.formateur && <span>👤 {r.formateur}</span>}
                        {r.lieu && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {r.lieu}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-xs">
                      <div className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {formatDate(r.dateDebut)}</div>
                      <div className="text-gray-500 dark:text-gray-400">→ {formatDate(r.dateFin)} ({r.nbJours}j)</div>
                    </td>
                    <td className="px-4 py-3">
                      {st && <StatutBadge label={st.label} color={st.color} />}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900 dark:text-gray-100 font-medium">{r.nbInscrits}</td>
                    <td className="px-4 py-3 text-right">
                      {r.tauxPresence != null ? (
                        <span className={cn(
                          "font-semibold",
                          r.tauxPresence >= 80 ? "text-emerald-600 dark:text-emerald-400" :
                          r.tauxPresence >= 50 ? "text-amber-600 dark:text-amber-400" :
                          "text-red-600 dark:text-red-400",
                        )}>
                          {r.tauxPresence}%
                        </span>
                      ) : <span className="text-gray-400 text-xs">—</span>}
                      <div className="text-[10px] text-gray-500 dark:text-gray-400">
                        {r.nbPresents}P · {r.nbAbsents}A · {r.nbRetards}R
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {completion != null ? (
                        <div className="inline-flex items-center gap-1.5">
                          <div className="w-12 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                            <div
                              className={cn(
                                "h-full",
                                completion >= 80 ? "bg-emerald-500" : completion >= 50 ? "bg-amber-500" : "bg-red-500",
                              )}
                              style={{ width: `${completion}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600 dark:text-gray-400">{completion}%</span>
                        </div>
                      ) : <span className="text-gray-400 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400">
                      <ArrowRight className="h-4 w-4 inline-block" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function KpiCard({
  icon: Icon, color, label, value, sub,
}: {
  icon: React.ElementType;
  color: "emerald" | "blue" | "red" | "violet";
  label: string;
  value: string;
  sub: string;
}) {
  const bg = {
    emerald: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700/50",
    blue: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700/50",
    red: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700/50",
    violet: "bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-700/50",
  }[color];
  const fg = {
    emerald: "text-emerald-700 dark:text-emerald-400",
    blue: "text-blue-700 dark:text-blue-400",
    red: "text-red-700 dark:text-red-400",
    violet: "text-violet-700 dark:text-violet-400",
  }[color];
  return (
    <div className={cn("rounded-lg border p-4", bg)}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={cn("h-4 w-4", fg)} />
        <span className={cn("text-xs font-medium", fg)}>{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">{sub}</p>
    </div>
  );
}
