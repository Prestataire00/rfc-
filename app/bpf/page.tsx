"use client";

import { useState, useEffect } from "react";
import { BarChart3, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatCurrency } from "@/lib/utils";
import { FINANCEMENT_TYPES } from "@/lib/constants";

const MOIS_LABELS = ["Jan", "Fev", "Mar", "Avr", "Mai", "Jun", "Jul", "Aou", "Sep", "Oct", "Nov", "Dec"];

type Facture = {
  id: string;
  numero: string;
  dateEmission: string;
  montantHT: number;
  montantTTC: number;
  statut: string;
  entreprise: { nom: string } | null;
  devis: { objet: string } | null;
};

type BPFData = {
  annee: number;
  sessionsTerminees: number;
  totalStagiaires: number;
  totalHeures: number;
  caRealiseHT: number;
  caRealiseTTC: number;
  parCategorie: Record<string, { sessions: number; stagiaires: number }>;
  parMois: { mois: number; total: number; terminees: number }[];
  financementsParType: Record<string, number>;
  financements: any[];
  certifications: any[];
  factures: Facture[];
};

export default function BPFPage() {
  const [annee, setAnnee] = useState(new Date().getFullYear());
  const [data, setData] = useState<BPFData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/bpf?annee=${annee}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { setData(d); setLoading(false); });
  }, [annee]);

  if (loading) {
    return <div className="flex justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" /></div>;
  }

  if (!data) return null;

  const maxMoisTotal = Math.max(...data.parMois.map((m) => m.total), 1);

  return (
    <div>
      <PageHeader title="Bilan Pedagogique et Financier" description="Donnees annuelles pour le BPF" />

      {/* Year selector + Export */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => setAnnee(annee - 1)} className="rounded-md border p-2 hover:bg-gray-700">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xl font-bold text-gray-100">{annee}</span>
          <button onClick={() => setAnnee(annee + 1)} className="rounded-md border p-2 hover:bg-gray-700">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/api/bpf/export-pdf?annee=${annee}`}
            target="_blank"
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm font-medium"
          >
            <Download className="h-4 w-4" />
            Exporter PDF
          </a>
          <a
            href={`/api/bpf/export?annee=${annee}`}
            className="flex items-center gap-2 border border-gray-600 text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-700 text-sm font-medium"
          >
            <Download className="h-4 w-4" />
            CSV
          </a>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="rounded-lg border bg-gray-800 p-5">
          <p className="text-sm text-gray-400">Sessions realisees</p>
          <p className="text-3xl font-bold text-gray-100">{data.sessionsTerminees}</p>
        </div>
        <div className="rounded-lg border bg-gray-800 p-5">
          <p className="text-sm text-gray-400">Stagiaires formes</p>
          <p className="text-3xl font-bold text-gray-100">{data.totalStagiaires}</p>
        </div>
        <div className="rounded-lg border bg-gray-800 p-5">
          <p className="text-sm text-gray-400">Heures de formation</p>
          <p className="text-3xl font-bold text-gray-100">{data.totalHeures}h</p>
        </div>
        <div className="rounded-lg border bg-gray-800 p-5">
          <p className="text-sm text-gray-400">CA Realise HT</p>
          <p className="text-3xl font-bold text-green-600">{formatCurrency(data.caRealiseHT)}</p>
        </div>
      </div>

      <div className="col-span-2 grid grid-cols-1 gap-6 mb-6">
        {/* Sessions par mois — graphique complet */}
        <div className="rounded-lg border bg-gray-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-gray-100 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-red-400" />
              Sessions par mois — {annee}
            </h3>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-red-500" />Total</span>
              <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-green-500" />Terminées</span>
            </div>
          </div>

          {/* Chart area */}
          <div className="relative">
            {/* Y-axis grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8">
              {[maxMoisTotal, Math.ceil(maxMoisTotal * 0.75), Math.ceil(maxMoisTotal * 0.5), Math.ceil(maxMoisTotal * 0.25), 0].map((val, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-500 w-4 text-right">{val}</span>
                  <div className="flex-1 border-t border-gray-700/50" />
                </div>
              ))}
            </div>

            {/* Bars */}
            <div className="ml-6 flex items-end gap-1.5 h-48 pb-8">
              {data.parMois.map((m, idx) => {
                const totalPct = maxMoisTotal > 0 ? (m.total / maxMoisTotal) * 100 : 0;
                const termPct = maxMoisTotal > 0 ? (m.terminees / maxMoisTotal) * 100 : 0;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-0 group relative">
                    {/* Tooltip */}
                    {m.total > 0 && (
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-10">
                        <div className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs text-gray-100 whitespace-nowrap shadow-lg">
                          <div className="text-red-400">{m.total} session{m.total > 1 ? "s" : ""}</div>
                          <div className="text-green-400">{m.terminees} terminée{m.terminees > 1 ? "s" : ""}</div>
                        </div>
                        <div className="w-2 h-2 bg-gray-900 border-b border-r border-gray-600 rotate-45 -mt-1" />
                      </div>
                    )}
                    {/* Value above bar */}
                    {m.total > 0 && (
                      <span className="text-[10px] font-bold text-gray-300 mb-1">{m.total}</span>
                    )}
                    {/* Bar container */}
                    <div className="w-full flex-1 flex items-end">
                      <div className="relative w-full" style={{ height: `${Math.max(totalPct, 0)}%`, minHeight: m.total > 0 ? "4px" : "0" }}>
                        {/* Total bar */}
                        <div className="absolute inset-0 bg-red-500/30 rounded-t" />
                        {/* Terminées bar */}
                        <div
                          className="absolute bottom-0 left-0 right-0 bg-green-500 rounded-t transition-all"
                          style={{ height: m.total > 0 ? `${(m.terminees / m.total) * 100}%` : "0%" }}
                        />
                        {/* Total outline */}
                        <div className="absolute inset-0 border-t-2 border-x-2 border-red-500 rounded-t" />
                      </div>
                    </div>
                    <span className={`text-[10px] mt-1 font-medium ${m.total > 0 ? "text-gray-200" : "text-gray-500"}`}>
                      {MOIS_LABELS[idx]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary row */}
          <div className="mt-4 pt-4 border-t border-gray-700 grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-400">Total sessions</p>
              <p className="text-lg font-bold text-gray-100">{data.parMois.reduce((s, m) => s + m.total, 0)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Terminées</p>
              <p className="text-lg font-bold text-green-400">{data.parMois.reduce((s, m) => s + m.terminees, 0)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Mois actifs</p>
              <p className="text-lg font-bold text-gray-100">{data.parMois.filter((m) => m.total > 0).length}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Pic mensuel</p>
              <p className="text-lg font-bold text-red-400">{maxMoisTotal} <span className="text-xs font-normal text-gray-400">sessions</span></p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Par categorie */}
        <div className="rounded-lg border bg-gray-800 p-6">
          <h3 className="font-semibold text-gray-100 mb-4">Par categorie</h3>
          {Object.keys(data.parCategorie).length === 0 ? (
            <p className="text-sm text-gray-400">Aucune donnee</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(data.parCategorie).map(([cat, val]) => (
                <div key={cat}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-300 font-medium">{cat}</span>
                    <span className="text-gray-400">{val.sessions} sessions - {val.stagiaires} stag.</span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: `${(val.sessions / data.sessionsTerminees) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Financements */}
        <div className="rounded-lg border bg-gray-800 p-6">
          <h3 className="font-semibold text-gray-100 mb-4">Provenance des financements</h3>
          {Object.keys(data.financementsParType).length === 0 ? (
            <p className="text-sm text-gray-400">Aucun financement enregistré</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(data.financementsParType).map(([type, montant]) => (
                <div key={type} className="flex items-center justify-between py-2 border-b last:border-0">
                  <span className="text-sm text-gray-300">{FINANCEMENT_TYPES[type as keyof typeof FINANCEMENT_TYPES]?.label || type}</span>
                  <span className="text-sm font-semibold text-gray-100">{formatCurrency(montant)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 font-bold">
                <span className="text-sm text-gray-100">Total</span>
                <span className="text-sm text-gray-100">
                  {formatCurrency(Object.values(data.financementsParType).reduce((a, b) => a + b, 0))}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Certifications */}
        <div className="rounded-lg border bg-gray-800 p-6">
          <h3 className="font-semibold text-gray-100 mb-4">Formations certifiantes</h3>
          {data.certifications.length === 0 ? (
            <p className="text-sm text-gray-400">Aucune certification cette annee</p>
          ) : (
            <div className="space-y-3">
              {data.certifications.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-100">{c.formation.titre}</p>
                    {c.formation.codeRNCP && <p className="text-xs text-gray-400">RNCP: {c.formation.codeRNCP}</p>}
                  </div>
                  <span className="text-sm text-gray-400">{c._count.inscriptions} stag.</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>


    </div>
  );
}
