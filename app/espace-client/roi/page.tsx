"use client";

import { useMemo, useState } from "react";
import {
  TrendingUp,
  Users,
  Clock,
  GraduationCap,
  Smile,
  Banknote,
  CircleDollarSign,
  Activity,
} from "lucide-react";

import { useApi } from "@/hooks/useApi";

type RoiKpis = {
  nbStagiairesFormes: number;
  nbInscriptionsTotal: number;
  nbInscriptionsPresentes: number;
  nbFormationsDistinctes: number;
  heuresTotalesFormation: number;
  tauxAssiduite: number;
  noteSatisfactionMoyenne: number | null;
  nbEvaluationsCompletes: number;
  investissementTotalTTC: number;
  coutParStagiaire: number | null;
  coutHoraire: number | null;
};

const PERIODES = [
  { label: "Année en cours", value: "ytd" },
  { label: "12 derniers mois", value: "12m" },
  { label: "Tout l'historique", value: "all" },
];

function computeSince(periode: string): string | null {
  const now = new Date();
  if (periode === "ytd") return new Date(now.getFullYear(), 0, 1).toISOString();
  if (periode === "12m") {
    const d = new Date(now);
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString();
  }
  return null;
}

function fmtEur(value: number | null): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function fmtPercent(value: number): string {
  return `${Math.round(value * 100)} %`;
}

export default function RoiPage() {
  const [periode, setPeriode] = useState("ytd");

  const since = useMemo(() => computeSince(periode), [periode]);
  const queryString = since ? `?since=${encodeURIComponent(since)}` : "";

  const { data: roi, isLoading, error } =
    useApi<RoiKpis>(`/api/client/roi${queryString}`);

  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
          <TrendingUp className="h-6 w-6" /> ROI Formation
        </h1>
        <p className="text-gray-400 mt-1">
          Indicateurs agrégés pour votre entreprise — investissement,
          assiduité, satisfaction.
        </p>
      </header>

      <div className="flex gap-2">
        {PERIODES.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriode(p.value)}
            className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
              periode === p.value
                ? "bg-red-600 text-white"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
        </div>
      ) : error ? (
        <div className="rounded-md border border-red-700 bg-red-900/20 p-4 text-red-300">
          Impossible de charger les indicateurs : {error.message}
        </div>
      ) : !roi ? null : (
        <>
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              icon={Users}
              label="Stagiaires formés"
              value={String(roi.nbStagiairesFormes)}
              hint={`${roi.nbInscriptionsPresentes} présences sur ${roi.nbInscriptionsTotal} inscriptions`}
            />
            <KpiCard
              icon={GraduationCap}
              label="Formations suivies"
              value={String(roi.nbFormationsDistinctes)}
              hint="Formations distinctes auxquelles vos collaborateurs ont participé"
            />
            <KpiCard
              icon={Clock}
              label="Heures de formation"
              value={`${roi.heuresTotalesFormation} h`}
              hint="Cumulées sur la période"
            />
            <KpiCard
              icon={Activity}
              label="Taux d'assiduité"
              value={fmtPercent(roi.tauxAssiduite)}
              hint="Présents / (présents + absents)"
              tone={
                roi.tauxAssiduite >= 0.9
                  ? "good"
                  : roi.tauxAssiduite >= 0.7
                    ? "warn"
                    : "bad"
              }
            />
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              icon={Banknote}
              label="Investissement (factures payées)"
              value={fmtEur(roi.investissementTotalTTC)}
              hint="TTC, sur les factures encaissées uniquement"
            />
            <KpiCard
              icon={CircleDollarSign}
              label="Coût / stagiaire"
              value={fmtEur(roi.coutParStagiaire)}
              hint="Investissement ÷ stagiaires distincts formés"
            />
            <KpiCard
              icon={CircleDollarSign}
              label="Coût / heure"
              value={fmtEur(roi.coutHoraire)}
              hint="Investissement ÷ heures de formation"
            />
            <KpiCard
              icon={Smile}
              label="Satisfaction moyenne"
              value={
                roi.noteSatisfactionMoyenne == null
                  ? "—"
                  : `${roi.noteSatisfactionMoyenne.toFixed(1)} / 5`
              }
              hint={`${roi.nbEvaluationsCompletes} évaluation${
                roi.nbEvaluationsCompletes > 1 ? "s" : ""
              } à chaud`}
              tone={
                roi.noteSatisfactionMoyenne == null
                  ? undefined
                  : roi.noteSatisfactionMoyenne >= 4
                    ? "good"
                    : roi.noteSatisfactionMoyenne >= 3
                      ? "warn"
                      : "bad"
              }
            />
          </section>
        </>
      )}
    </div>
  );
}

type KpiCardProps = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
  tone?: "good" | "warn" | "bad";
};

function KpiCard({ icon: Icon, label, value, hint, tone }: KpiCardProps) {
  const toneClass =
    tone === "good"
      ? "border-emerald-700/40 bg-emerald-900/10"
      : tone === "warn"
        ? "border-amber-700/40 bg-amber-900/10"
        : tone === "bad"
          ? "border-red-700/40 bg-red-900/10"
          : "border-gray-700 bg-gray-800";

  return (
    <div className={`rounded-lg border p-5 ${toneClass}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">{label}</p>
        <Icon className="h-5 w-5 text-gray-400" />
      </div>
      <p className="mt-2 text-2xl font-bold text-gray-100">{value}</p>
      {hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
    </div>
  );
}
