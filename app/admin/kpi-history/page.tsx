"use client";

import { useMemo, useState } from "react";
import { BarChart3, RefreshCw, Calendar } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { SkeletonTable } from "@/components/shared/Skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useApi, useApiMutation, invalidate } from "@/hooks/useApi";
import { notify } from "@/lib/toast";
import { ApiError } from "@/lib/fetcher";
import { formatDate, formatDatetime } from "@/lib/utils";

interface KpiSnapshot {
  id: string;
  dateSnapshot: string;
  kpis: Record<string, number | string>;
  source: string;
  createdAt: string;
}

const KPI_OPTIONS = [
  { value: "totalContacts", label: "Total contacts" },
  { value: "totalEntreprises", label: "Total entreprises" },
  { value: "totalFormations", label: "Total formations" },
  { value: "totalSessions", label: "Total sessions" },
  { value: "totalInscriptions", label: "Total inscriptions" },
  { value: "totalDevis", label: "Total devis" },
  { value: "totalFactures", label: "Total factures" },
  { value: "totalProspects", label: "Total prospects" },
];

function defaultDateRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

function readKpi(snap: KpiSnapshot, key: string): number {
  const v = snap.kpis?.[key];
  if (typeof v === "number") return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function LineChart({
  points,
  labelFor,
}: {
  points: { date: string; value: number }[];
  labelFor: string;
}) {
  if (points.length < 2) {
    return (
      <div className="flex items-center justify-center h-64 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400">
        Au moins 2 snapshots sont necessaires pour tracer une courbe.
      </div>
    );
  }

  const W = 760;
  const H = 240;
  const PAD_X = 40;
  const PAD_Y = 24;

  const sorted = [...points].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const values = sorted.map((p) => p.value);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, min + 1);
  const range = max - min || 1;

  const xStep = (W - PAD_X * 2) / (sorted.length - 1);

  const path = sorted
    .map((p, i) => {
      const x = PAD_X + i * xStep;
      const y = H - PAD_Y - ((p.value - min) / range) * (H - PAD_Y * 2);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const areaPath = `${path} L${PAD_X + (sorted.length - 1) * xStep},${H - PAD_Y} L${PAD_X},${H - PAD_Y} Z`;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 overflow-x-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{labelFor}</h3>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Min : <span className="text-gray-800 dark:text-gray-200 font-mono">{min}</span> · Max :{" "}
          <span className="text-gray-800 dark:text-gray-200 font-mono">{max}</span>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-64"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="kpiGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#dc2626" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Gridlines */}
        {[0, 1, 2, 3].map((i) => {
          const y = PAD_Y + (i * (H - PAD_Y * 2)) / 3;
          return (
            <line
              key={i}
              x1={PAD_X}
              x2={W - PAD_X / 2}
              y1={y}
              y2={y}
              stroke="#374151"
              strokeDasharray="3 3"
              strokeWidth={0.5}
            />
          );
        })}
        <path d={areaPath} fill="url(#kpiGradient)" />
        <path d={path} fill="none" stroke="#dc2626" strokeWidth={2} />
        {sorted.map((p, i) => {
          const x = PAD_X + i * xStep;
          const y = H - PAD_Y - ((p.value - min) / range) * (H - PAD_Y * 2);
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={3} fill="#dc2626" />
              <title>
                {p.date} : {p.value}
              </title>
            </g>
          );
        })}
        {/* X axis labels (start, mid, end) */}
        {[0, Math.floor((sorted.length - 1) / 2), sorted.length - 1].map((i) => {
          const x = PAD_X + i * xStep;
          return (
            <text
              key={i}
              x={x}
              y={H - 6}
              fontSize="10"
              fill="#9ca3af"
              textAnchor="middle"
            >
              {formatDate(sorted[i].date)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

export default function KpiHistoryPage() {
  const initRange = defaultDateRange();
  const [from, setFrom] = useState(initRange.from);
  const [to, setTo] = useState(initRange.to);
  const [kpiKey, setKpiKey] = useState("totalContacts");

  const url = `/api/kpi/history?dateFrom=${from}&dateTo=${to}`;
  const { data, isLoading } = useApi<KpiSnapshot[]>(url);
  const items = data ?? [];

  const points = useMemo(
    () =>
      items.map((s) => ({
        date: s.dateSnapshot,
        value: readKpi(s, kpiKey),
      })),
    [items, kpiKey]
  );

  const { trigger: triggerSnapshot, isMutating: snapshotting } = useApiMutation<
    Record<string, unknown>,
    KpiSnapshot
  >("/api/kpi", "POST");

  const handleSnapshot = async () => {
    try {
      await triggerSnapshot({});
      await invalidate(url);
      notify.success("Snapshot KPI cree");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Erreur snapshot";
      notify.error("Erreur", msg);
    }
  };

  const kpiLabel =
    KPI_OPTIONS.find((o) => o.value === kpiKey)?.label ?? kpiKey;

  return (
    <div>
      <PageHeader
        title="Historique KPI"
        description="Suivez l'evolution des indicateurs cles dans le temps"
      />

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-5">
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-500 dark:text-gray-400">Du</Label>
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-500 dark:text-gray-400">Au</Label>
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-500 dark:text-gray-400">Indicateur</Label>
          <Select
            value={kpiKey}
            onChange={(e) => setKpiKey(e.target.value)}
            options={KPI_OPTIONS}
            className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 h-9"
          />
        </div>
        <div className="flex items-end">
          <Button
            onClick={handleSnapshot}
            disabled={snapshotting}
            className="bg-red-600 hover:bg-red-700 w-full"
          >
            <RefreshCw className={`h-4 w-4 ${snapshotting ? "animate-spin" : ""}`} />
            {snapshotting ? "Capture..." : "Capturer maintenant"}
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <LineChart points={points} labelFor={kpiLabel} />
      </div>

      <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-red-400" /> Snapshots ({items.length})
      </h3>

      {isLoading ? (
        <SkeletonTable rows={5} cols={4} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="Aucun snapshot dans l'intervalle"
          description="Modifiez les dates ou capturez un snapshot maintenant."
        />
      ) : (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 text-xs uppercase text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-3 py-3 text-left">Date snapshot</th>
                <th className="px-3 py-3 text-left">Source</th>
                <th className="px-3 py-3 text-left">Cree le</th>
                <th className="px-3 py-3 text-right">{kpiLabel}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {items.map((s) => (
                <tr key={s.id} className="hover:bg-gray-750">
                  <td className="px-3 py-2.5 text-gray-900 dark:text-gray-100">
                    {formatDate(s.dateSnapshot)}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                      {s.source}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-500 dark:text-gray-400">
                    {formatDatetime(s.createdAt)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-gray-900 dark:text-gray-100">
                    {readKpi(s, kpiKey)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
