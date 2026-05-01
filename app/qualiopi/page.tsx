"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  BadgeCheck, BarChart3, Shield, ChevronLeft, ChevronRight,
  Search, Download, Target, ClipboardList, Users, BookOpen,
  TrendingUp, MessageSquare, Sparkles,
} from "lucide-react";
import { AIButton } from "@/components/shared/AIButton";
import { useApi } from "@/hooks/useApi";

// ─── Types ───
interface QualiteRow {
  id: string;
  formation: string;
  satisfaction_chaud: number | null;
  satisfaction_froid: number | null;
  eval_acquis: number | null;
  noteGlobale: number | null;
}

type ViewMode = "table" | "qualiopi";

// ─── Helpers ───
function fmt(val: number | null): string {
  if (val === null || val === undefined) return "-- %";
  return `${val.toFixed(1)} %`;
}

function fmtCell(val: number | null): { text: string; bg: string } {
  if (val === null || val === undefined) return { text: "-- %", bg: "" };
  const bg = val >= 80 ? "bg-emerald-900/30 text-emerald-400" : val >= 50 ? "bg-amber-900/30 text-amber-400" : "bg-red-900/30 text-red-400";
  return { text: `${val.toFixed(1)} %`, bg };
}

function avg(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null && v !== undefined);
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

const COLUMNS = [
  { key: "satisfaction_chaud" as const, label: "Satisfaction a chaud" },
  { key: "satisfaction_froid" as const, label: "Satisfaction a froid" },
  { key: "eval_acquis" as const, label: "Evaluation des acquis" },
];

const QUALIOPI_CRITERIA = [
  { num: 1, title: "Information du public", description: "Conditions d'information du public sur les prestations, delais et resultats", indicators: ["satisfaction_chaud"], icon: Target, color: "text-blue-500 bg-blue-900/30" },
  { num: 2, title: "Identification des objectifs", description: "Identification precise des objectifs et adaptation aux beneficiaires", indicators: ["eval_acquis"], icon: ClipboardList, color: "text-emerald-500 bg-emerald-900/30" },
  { num: 3, title: "Adaptation des prestations", description: "Adaptation aux publics beneficiaires et modalites d'accueil", indicators: ["satisfaction_chaud"], icon: Users, color: "text-purple-500 bg-purple-900/30" },
  { num: 4, title: "Moyens pedagogiques", description: "Adequation des moyens pedagogiques, techniques et d'encadrement", indicators: ["satisfaction_chaud", "satisfaction_froid"], icon: BookOpen, color: "text-amber-500 bg-amber-900/30" },
  { num: 5, title: "Qualification des personnels", description: "Qualification et developpement des competences des personnels", indicators: ["eval_acquis"], icon: BadgeCheck, color: "text-red-500 bg-red-900/30" },
  { num: 6, title: "Environnement professionnel", description: "Inscription et investissement dans l'environnement professionnel", indicators: ["satisfaction_froid"], icon: TrendingUp, color: "text-cyan-500 bg-cyan-900/30" },
  { num: 7, title: "Amelioration continue", description: "Recueil et prise en compte des appreciations et reclamations", indicators: ["satisfaction_chaud", "satisfaction_froid", "eval_acquis"], icon: MessageSquare, color: "text-pink-500 bg-pink-900/30" },
];

export default function QualiopiPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [searchName, setSearchName] = useState("");
  const [aiResult, setAiResult] = useState("");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: evaluationsData, isLoading: evalLoading } = useApi<any>("/api/evaluations");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: sessionsData, isLoading: sessionsLoading } = useApi<any>("/api/sessions");
  const loading = evalLoading || sessionsLoading;

  const rows = useMemo<QualiteRow[]>(() => {
    const evalsArr = Array.isArray(evaluationsData) ? evaluationsData : [];
    const sessionsArr = Array.isArray(sessionsData)
      ? sessionsData
      : sessionsData?.sessions || sessionsData?.data || [];

    // Group evaluations by session -> formation
    const sessionMap: Record<string, { formation: string; chaud: number[]; froid: number[]; acquis: number[]; notes: number[] }> = {};

    for (const ev of evalsArr) {
      const sId = ev.session?.id;
      const fName = ev.session?.formation?.titre || "Sans titre";
      if (!sId) continue;
      if (!sessionMap[sId]) sessionMap[sId] = { formation: fName, chaud: [], froid: [], acquis: [], notes: [] };
      if (ev.estComplete && ev.noteGlobale) {
        sessionMap[sId].notes.push(ev.noteGlobale);
        const pct = ((ev.noteGlobale - 1) / 4) * 100; // Convert 1-5 to 0-100%
        if (ev.type === "satisfaction_chaud") sessionMap[sId].chaud.push(pct);
        else if (ev.type === "satisfaction_froid") sessionMap[sId].froid.push(pct);
        else if (ev.type === "acquis") sessionMap[sId].acquis.push(pct);
      }
    }

    // Also add sessions without evaluations
    for (const s of sessionsArr) {
      if (!sessionMap[s.id]) {
        sessionMap[s.id] = { formation: s.formation?.titre || s.lieu || "Session", chaud: [], froid: [], acquis: [], notes: [] };
      }
    }

    return Object.entries(sessionMap).map(([id, data]) => ({
      id,
      formation: data.formation,
      satisfaction_chaud: data.chaud.length > 0 ? data.chaud.reduce((a, b) => a + b, 0) / data.chaud.length : null,
      satisfaction_froid: data.froid.length > 0 ? data.froid.reduce((a, b) => a + b, 0) / data.froid.length : null,
      eval_acquis: data.acquis.length > 0 ? data.acquis.reduce((a, b) => a + b, 0) / data.acquis.length : null,
      noteGlobale: data.notes.length > 0 ? data.notes.reduce((a, b) => a + b, 0) / data.notes.length : null,
    }));
  }, [evaluationsData, sessionsData]);

  const filtered = rows.filter((r) => {
    if (!searchName.trim()) return true;
    return r.formation.toLowerCase().includes(searchName.toLowerCase());
  });

  const colAverages: Record<string, number | null> = {};
  for (const col of COLUMNS) {
    colAverages[col.key] = avg(filtered.map((r) => r[col.key]));
  }

  function moyenneGen(r: QualiteRow): number | null {
    return avg([r.satisfaction_chaud, r.satisfaction_froid, r.eval_acquis]);
  }

  const qualiopiScores = useMemo(() => {
    const allIndicators: Record<string, number[]> = {};
    for (const row of filtered) {
      for (const col of COLUMNS) {
        const val = row[col.key];
        if (val !== null) {
          if (!allIndicators[col.key]) allIndicators[col.key] = [];
          allIndicators[col.key].push(val);
        }
      }
    }
    return QUALIOPI_CRITERIA.map((criterion) => {
      const scores: number[] = [];
      for (const ind of criterion.indicators) {
        const vals = allIndicators[ind];
        if (vals && vals.length > 0) scores.push(vals.reduce((a, b) => a + b, 0) / vals.length);
      }
      const score = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
      return { ...criterion, score, hasData: scores.length > 0 };
    });
  }, [filtered]);

  if (loading) {
    return <div className="p-6 flex items-center justify-center py-24"><div className="h-6 w-6 animate-spin rounded-full border-2 border-red-600 border-t-transparent" /></div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-100 mb-6">Suivi Qualite (Evaluation & Satisfaction)</h1>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg border border-gray-600 overflow-hidden">
            <button onClick={() => setViewMode("table")} className={`px-3 py-2 text-sm font-medium flex items-center gap-1.5 ${viewMode === "table" ? "bg-red-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}>
              <BarChart3 className="h-4 w-4" /> Tableau
            </button>
            <button onClick={() => setViewMode("qualiopi")} className={`px-3 py-2 text-sm font-medium flex items-center gap-1.5 ${viewMode === "qualiopi" ? "bg-red-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}>
              <Shield className="h-4 w-4" /> Qualiopi
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              placeholder="Rechercher une formation..."
              className="border border-gray-600 bg-gray-800 rounded-lg pl-9 pr-3 py-2 text-sm w-56 focus:outline-none focus:border-red-500 text-gray-200"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <AIButton endpoint="/api/ai/qualiopi" payload={{ action: "synthese_qualite" }} onResult={(t) => setAiResult(t)} label="Synthese IA" size="md" />
          <AIButton endpoint="/api/ai/qualiopi" payload={{ action: "plan_amelioration" }} onResult={(t) => setAiResult(t)} label="Plan d'amelioration" size="md" />
          <AIButton endpoint="/api/ai/qualiopi" payload={{ action: "preparer_audit" }} onResult={(t) => setAiResult(t)} label="Preparer audit" size="md" />
          <Link href="/qualiopi/amelioration" className="inline-flex items-center gap-2 rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors">
            Amelioration
          </Link>
          <Link href="/qualiopi/incidents" className="inline-flex items-center gap-2 rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors">
            Incidents
          </Link>
        </div>
      </div>

      {/* Resultat IA */}
      {aiResult && (
        <div className="mb-6 p-4 rounded-xl border border-gray-700 bg-gray-800 relative">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-red-500" />
              Analyse IA
            </h3>
            <div className="flex items-center gap-3 text-xs">
              <button onClick={() => navigator.clipboard.writeText(aiResult)} className="text-gray-400 hover:text-gray-200">Copier</button>
              <button onClick={() => setAiResult("")} className="text-gray-400 hover:text-gray-200">Fermer</button>
            </div>
          </div>
          <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{aiResult}</pre>
        </div>
      )}

      {viewMode === "qualiopi" ? (
        /* ─── VUE QUALIOPI ─── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {qualiopiScores.map((criterion) => {
            const statusBorder = !criterion.hasData ? "border-gray-700" : criterion.score !== null && criterion.score >= 80 ? "border-emerald-700" : criterion.score !== null && criterion.score >= 50 ? "border-amber-700" : "border-red-700";
            const statusBg = !criterion.hasData ? "bg-gray-800" : criterion.score !== null && criterion.score >= 80 ? "bg-emerald-900/20" : criterion.score !== null && criterion.score >= 50 ? "bg-amber-900/20" : "bg-red-900/20";
            const dotColor = !criterion.hasData ? "bg-gray-500" : criterion.score !== null && criterion.score >= 80 ? "bg-emerald-500" : criterion.score !== null && criterion.score >= 50 ? "bg-amber-500" : "bg-red-500";
            const Icon = criterion.icon;

            return (
              <div key={criterion.num} className={`rounded-xl border-2 p-5 ${statusBorder} ${statusBg}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-3 h-3 rounded-full ${dotColor}`} />
                  <span className="text-xs font-semibold text-gray-400 uppercase">Critere {criterion.num}</span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${criterion.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <h3 className="font-bold text-gray-200 text-sm">{criterion.title}</h3>
                </div>
                <p className="text-xs text-gray-400 mb-3">{criterion.description}</p>
                <div className="flex items-end justify-between">
                  <span className="text-2xl font-bold text-gray-100">
                    {criterion.score !== null ? `${criterion.score.toFixed(0)}%` : "—"}
                  </span>
                  {!criterion.hasData && <span className="text-xs text-gray-500">Pas de donnees</span>}
                </div>
                <div className="mt-2">
                  <div className="w-full bg-gray-700 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full transition-all ${dotColor}`} style={{ width: `${criterion.score ?? 0}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ─── VUE TABLEAU ─── */
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-gray-900 border-b border-gray-700">
                <th className="px-4 py-3 text-left font-semibold text-gray-400 min-w-[250px]">Formation</th>
                {COLUMNS.map((col) => (
                  <th key={col.key} className="px-4 py-3 text-center font-semibold text-gray-400 min-w-[120px]">{col.label}</th>
                ))}
                <th className="px-4 py-3 text-center font-semibold text-gray-400 min-w-[120px]">Moyenne Generale</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={COLUMNS.length + 2} className="px-4 py-16 text-center text-gray-500">Aucune donnee disponible</td></tr>
              ) : (
                <>
                  {filtered.map((row) => {
                    const mGen = moyenneGen(row);
                    return (
                      <tr key={row.id} className="border-b border-gray-700 hover:bg-gray-750 transition-colors">
                        <td className="px-4 py-3 text-red-500 font-medium">{row.formation}</td>
                        {COLUMNS.map((col) => {
                          const { text, bg } = fmtCell(row[col.key]);
                          return <td key={col.key} className={`px-4 py-3 text-center ${bg} rounded-sm`}>{text}</td>;
                        })}
                        {(() => { const { text, bg } = fmtCell(mGen); return <td className={`px-4 py-3 text-center font-semibold ${bg} rounded-sm`}>{text}</td>; })()}
                      </tr>
                    );
                  })}
                  {/* Moyenne Finale */}
                  <tr className="bg-gray-900 border-t-2 border-gray-600 font-semibold">
                    <td className="px-4 py-3 text-gray-200">Moyenne Finale</td>
                    {COLUMNS.map((col) => {
                      const { text, bg } = fmtCell(colAverages[col.key]);
                      return <td key={col.key} className={`px-4 py-3 text-center ${bg} rounded-sm`}>{text}</td>;
                    })}
                    {(() => {
                      const allGenAvg = avg(Object.values(colAverages));
                      const { text, bg } = fmtCell(allGenAvg);
                      return <td className={`px-4 py-3 text-center ${bg} rounded-sm`}>{text}</td>;
                    })()}
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
