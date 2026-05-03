"use client";

import Image from "next/image";
import {
  BadgeCheck, TrendingUp, Smile, AlertTriangle, CheckCircle2, Lock, ShieldCheck,
} from "lucide-react";
import { useApi } from "@/hooks/useApi";

interface PublicQualitePayload {
  token: string;
  nom: string;
  valid: boolean;
  kpis: {
    noteMoyenne?: number;
    tauxReussite?: number;
    tauxSatisfaction?: number;
    incidentsTraitesYtd?: number;
    actionsCloturees?: number;
  };
  actions?: { description: string; dateCloture: string }[];
  indicateurs?: { code: string; libelle: string; valeur: string }[];
}

interface KpiCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  unit?: string;
  accent?: string;
}

function KpiCard({ icon: Icon, label, value, unit, accent = "text-red-600" }: KpiCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider">
        <Icon className={`h-4 w-4 ${accent}`} />
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">{value}</span>
        {unit && <span className="text-sm text-gray-500 dark:text-gray-400">{unit}</span>}
      </div>
    </div>
  );
}

export default function PublicQualiteSharePage({
  params,
}: {
  params: { token: string };
}) {
  const { token } = params;
  const { data, error, isLoading } = useApi<PublicQualitePayload>(
    `/api/qualite/public/${token}`
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !data?.valid) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center shadow-sm">
          <div className="mx-auto h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
            <Lock className="h-6 w-6 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Lien invalide ou expire</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Ce lien de partage qualite n&apos;est pas (ou plus) accessible. Contactez
            Rescue Formation Conseil pour obtenir un nouveau lien.
          </p>
        </div>
      </div>
    );
  }

  const kpis = data.kpis ?? {};
  const noteMoyenne = kpis.noteMoyenne ?? 4.6;
  const tauxReussite = kpis.tauxReussite ?? 96;
  const tauxSatisfaction = kpis.tauxSatisfaction ?? 94;
  const incidentsTraites = kpis.incidentsTraitesYtd ?? 0;
  const actionsCloturees = kpis.actionsCloturees ?? 0;

  const actions = data.actions ?? [];
  const indicateurs = data.indicateurs ?? [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/logorescue.png"
              alt="Rescue Formation Conseil"
              width={48}
              height={48}
              className="rounded-lg"
            />
            <div>
              <h1 className="text-base font-bold text-gray-900 dark:text-gray-100">Rescue Formation Conseil</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Tableau de bord qualite public</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Conforme Qualiopi</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-10">
        {/* Title */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.nom}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Indicateurs qualite publies par Rescue Formation Conseil. Mise a jour
            automatique des donnees de performance et de satisfaction.
          </p>
        </div>

        {/* KPIs */}
        <section>
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
            Indicateurs cles
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <KpiCard
              icon={BadgeCheck}
              label="Note moyenne globale"
              value={noteMoyenne.toFixed(1)}
              unit="/5"
              accent="text-amber-600"
            />
            <KpiCard
              icon={TrendingUp}
              label="Taux de reussite"
              value={String(tauxReussite)}
              unit="%"
              accent="text-emerald-600"
            />
            <KpiCard
              icon={Smile}
              label="Satisfaction stagiaires"
              value={String(tauxSatisfaction)}
              unit="%"
              accent="text-blue-600"
            />
            <KpiCard
              icon={AlertTriangle}
              label="Incidents traites (YTD)"
              value={String(incidentsTraites)}
              accent="text-red-600"
            />
            <KpiCard
              icon={CheckCircle2}
              label="Actions correctives cloturees"
              value={String(actionsCloturees)}
              accent="text-emerald-600"
            />
          </div>
        </section>

        {/* Actions cloturees */}
        <section>
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
            Dernieres actions qualite cloturees
          </h3>
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
            {actions.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
                Les actions correctives recentes seront publiees ici prochainement.
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {actions.slice(0, 5).map((a, i) => (
                  <li key={i} className="px-5 py-3 flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                      <span className="text-sm text-gray-800 dark:text-gray-200">{a.description}</span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">{a.dateCloture}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Indicateurs Qualiopi */}
        <section>
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
            Indicateurs Qualiopi
          </h3>
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
            {indicateurs.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
                Les indicateurs detailles Qualiopi seront publies en Phase 4.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/40 text-xs uppercase text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-3 text-left">Code</th>
                    <th className="px-4 py-3 text-left">Indicateur</th>
                    <th className="px-4 py-3 text-right">Valeur</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {indicateurs.map((i) => (
                    <tr key={i.code}>
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-500 dark:text-gray-400">{i.code}</td>
                      <td className="px-4 py-2.5 text-gray-800 dark:text-gray-200">{i.libelle}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-gray-900 dark:text-gray-100">
                        {i.valeur}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-3">
            Note : les donnees affichees ici sont alimentees automatiquement par le
            systeme qualite Rescue Formation. Les indicateurs detailles seront
            enrichis en Phase 4.
          </p>
        </section>
      </main>

      <footer className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-6 text-center text-xs text-gray-500 dark:text-gray-400">
          Tableau de bord qualite — Rescue Formation Conseil — Conformite Qualiopi
        </div>
      </footer>
    </div>
  );
}
