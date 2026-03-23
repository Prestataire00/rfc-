"use client";

import { useState, useEffect } from "react";
import { BarChart3, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatCurrency } from "@/lib/utils";
import { FINANCEMENT_TYPES } from "@/lib/constants";

const MOIS_LABELS = ["Jan", "Fev", "Mar", "Avr", "Mai", "Jun", "Jul", "Aou", "Sep", "Oct", "Nov", "Dec"];

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

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Sessions par mois */}
        <div className="rounded-lg border bg-gray-800 p-6">
          <h3 className="font-semibold text-gray-100 mb-4">Sessions par mois</h3>
          <div className="flex items-end gap-2 h-40">
            {data.parMois.map((m, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col items-center">
                  <div
                    className="w-full bg-red-900/200 rounded-t"
                    style={{ height: `${(m.total / maxMoisTotal) * 120}px`, minHeight: m.total > 0 ? 4 : 0 }}
                  />
                </div>
                <span className="text-[10px] text-gray-400">{MOIS_LABELS[idx]}</span>
                <span className="text-[10px] font-medium text-gray-300">{m.total || ""}</span>
              </div>
            ))}
          </div>
        </div>

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
                      className="h-full bg-indigo-900/200 rounded-full"
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
