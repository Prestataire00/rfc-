"use client";

import { useMemo } from "react";
import {
  Users, Building2, GraduationCap, BookOpen, FileText, Banknote,
  TrendingUp, Star, Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { useApi } from "@/hooks/useApi";
import { formatCurrency } from "@/lib/utils";

interface DashStats {
  nbContacts: number;
  nbEntreprises: number;
  nbFormateurs: number;
  nbFormations: number;
  sessionsAVenir: number;
  caFactureMois: number;
  caFactureAnnee: number;
  nbFacturesAEncaisser: number;
  caAEncaisser: number;
  nbStagiairesFormes: number;
  nbFormationsRealisees: number;
}

interface DashRes {
  stats: DashStats;
}

interface KpiSnapshot {
  id: string;
  dateSnapshot: string;
  kpis: Record<string, number | undefined>;
  source: string;
  createdAt: string;
}

interface FormationStat {
  id: string;
  titre: string;
  count: number;
}
interface EntrepriseStat {
  id: string;
  nom: string;
  ca: number;
}
interface FormateurStat {
  id: string;
  nom: string;
  prenom: string;
  noteMoyenne: number;
}

interface SessionRow {
  id: string;
  dateDebut: string;
  formation?: { id: string; titre: string };
  entreprise?: { id: string; nom: string } | null;
}

interface SessionsResponse {
  data: SessionRow[];
}

interface FactureRow {
  id: string;
  montantTTC: number;
  entreprise?: { id: string; nom: string } | null;
  statut: string;
}

interface EvalFormateur {
  id: string;
  formateurId: string;
  noteGlobale: number;
}

interface FormateurMin {
  id: string;
  nom: string;
  prenom: string;
}

function MiniLineChart({
  points,
  color = "#dc2626",
  height = 60,
}: {
  points: number[];
  color?: string;
  height?: number;
}) {
  if (points.length < 2) {
    return <p className="text-[11px] text-gray-500 text-center py-4">Donnees insuffisantes</p>;
  }
  const w = 200;
  const h = height;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const stepX = w / (points.length - 1);
  const path = points
    .map((v, i) => {
      const x = i * stepX;
      const y = h - ((v - min) / range) * (h - 6) - 3;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none">
      <path d={path} fill="none" stroke={color} strokeWidth={2} />
      {points.map((v, i) => {
        const x = i * stepX;
        const y = h - ((v - min) / range) * (h - 6) - 3;
        return <circle key={i} cx={x} cy={y} r={1.5} fill={color} />;
      })}
    </svg>
  );
}

export default function ReportingPage() {
  const { data: dashData, isLoading: loadingDash } = useApi<DashRes>("/api/dashboard/stats");
  const dateFrom30 = useMemo(() => {
    const d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return d.toISOString().split("T")[0];
  }, []);
  const { data: kpiHistory } = useApi<KpiSnapshot[]>(`/api/kpi/history?dateFrom=${dateFrom30}`);

  // Top sessions par formation (calcul cote client)
  const { data: sessionsData } = useApi<SessionsResponse>("/api/sessions?limit=200");
  const { data: facturesData } = useApi<{ data: FactureRow[] }>("/api/factures?limit=200");
  const { data: evalsData } = useApi<EvalFormateur[]>("/api/evaluations-formateur");
  const { data: formateursData } = useApi<FormateurMin[]>("/api/formateurs");

  const stats = dashData?.stats;

  const topFormations: FormationStat[] = useMemo(() => {
    const list = sessionsData?.data ?? [];
    if (list.length === 0) return [];
    const counts: Record<string, FormationStat> = {};
    for (const s of list) {
      const f = s.formation;
      if (!f) continue;
      if (!counts[f.id]) counts[f.id] = { id: f.id, titre: f.titre, count: 0 };
      counts[f.id].count++;
    }
    return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [sessionsData]);

  const topEntreprises: EntrepriseStat[] = useMemo(() => {
    const factures = facturesData?.data ?? [];
    const sums: Record<string, EntrepriseStat> = {};
    for (const f of factures) {
      if (!f.entreprise) continue;
      if (f.statut !== "payee" && f.statut !== "envoyee") continue;
      if (!sums[f.entreprise.id]) sums[f.entreprise.id] = { id: f.entreprise.id, nom: f.entreprise.nom, ca: 0 };
      sums[f.entreprise.id].ca += f.montantTTC;
    }
    return Object.values(sums).sort((a, b) => b.ca - a.ca).slice(0, 5);
  }, [facturesData]);

  const topFormateurs: FormateurStat[] = useMemo(() => {
    const evals = evalsData ?? [];
    const formateurs = formateursData ?? [];
    const groups: Record<string, number[]> = {};
    for (const e of evals) {
      (groups[e.formateurId] ??= []).push(e.noteGlobale);
    }
    const list: FormateurStat[] = formateurs
      .filter((f) => groups[f.id] && groups[f.id].length > 0)
      .map((f) => ({
        id: f.id,
        nom: f.nom,
        prenom: f.prenom,
        noteMoyenne:
          groups[f.id].reduce((a, b) => a + b, 0) / groups[f.id].length,
      }));
    return list.sort((a, b) => b.noteMoyenne - a.noteMoyenne).slice(0, 5);
  }, [evalsData, formateursData]);

  // Series KPI history (dernier vers premier => inverse)
  const series = useMemo(() => {
    const points = kpiHistory ?? [];
    const sorted = [...points].sort(
      (a, b) => new Date(a.dateSnapshot).getTime() - new Date(b.dateSnapshot).getTime()
    );
    return {
      caHistory: sorted.map((s) => Number(s.kpis?.totalFactures ?? 0)),
      inscriptions: sorted.map((s) => Number(s.kpis?.totalInscriptions ?? 0)),
      contacts: sorted.map((s) => Number(s.kpis?.totalContacts ?? 0)),
    };
  }, [kpiHistory]);

  if (loadingDash || !stats) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Reporting avance" description="KPIs, evolutions et top performances" />

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <KpiCard label="Contacts" value={stats.nbContacts} icon={Users} />
        <KpiCard label="Entreprises" value={stats.nbEntreprises} icon={Building2} />
        <KpiCard label="Sessions a venir" value={stats.sessionsAVenir} icon={BookOpen} />
        <KpiCard label="Stagiaires formes" value={stats.nbStagiairesFormes} icon={GraduationCap} />
        <KpiCard label="CA mois" value={formatCurrency(stats.caFactureMois)} icon={Banknote} highlight />
        <KpiCard label="A encaisser" value={formatCurrency(stats.caAEncaisser)} icon={FileText} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <ChartCard title="CA snapshot (30j)" color="#dc2626">
          <MiniLineChart points={series.caHistory} color="#dc2626" />
        </ChartCard>
        <ChartCard title="Inscriptions cumulees (30j)" color="#3b82f6">
          <MiniLineChart points={series.inscriptions} color="#3b82f6" />
        </ChartCard>
        <ChartCard title="Contacts cumules (30j)" color="#10b981">
          <MiniLineChart points={series.contacts} color="#10b981" />
        </ChartCard>
      </div>

      {/* Top tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <TopCard title="Top 5 formations (sessions)" icon={BookOpen}>
          {topFormations.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-4">Aucune donnee</p>
          ) : (
            topFormations.map((f, i) => (
              <div key={f.id} className="flex items-center gap-3 py-2 border-b border-gray-200 dark:border-gray-700 last:border-0">
                <span className="h-6 w-6 rounded-full bg-red-600/20 text-red-400 flex items-center justify-center text-xs font-bold shrink-0">
                  {i + 1}
                </span>
                <p className="text-sm text-gray-800 dark:text-gray-200 flex-1 truncate">{f.titre}</p>
                <span className="text-xs text-gray-500 dark:text-gray-400">{f.count} sessions</span>
              </div>
            ))
          )}
        </TopCard>
        <TopCard title="Top 5 entreprises (CA)" icon={Building2}>
          {topEntreprises.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-4">Aucune donnee</p>
          ) : (
            topEntreprises.map((e, i) => (
              <div key={e.id} className="flex items-center gap-3 py-2 border-b border-gray-200 dark:border-gray-700 last:border-0">
                <span className="h-6 w-6 rounded-full bg-red-600/20 text-red-400 flex items-center justify-center text-xs font-bold shrink-0">
                  {i + 1}
                </span>
                <p className="text-sm text-gray-800 dark:text-gray-200 flex-1 truncate">{e.nom}</p>
                <span className="text-xs text-emerald-400 font-semibold">{formatCurrency(e.ca)}</span>
              </div>
            ))
          )}
        </TopCard>
        <TopCard title="Top 5 formateurs (satisfaction)" icon={Star}>
          {topFormateurs.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-4">Aucune donnee</p>
          ) : (
            topFormateurs.map((f, i) => (
              <div key={f.id} className="flex items-center gap-3 py-2 border-b border-gray-200 dark:border-gray-700 last:border-0">
                <span className="h-6 w-6 rounded-full bg-red-600/20 text-red-400 flex items-center justify-center text-xs font-bold shrink-0">
                  {i + 1}
                </span>
                <p className="text-sm text-gray-800 dark:text-gray-200 flex-1 truncate">{f.prenom} {f.nom}</p>
                <span className="text-xs text-amber-700 dark:text-amber-300 font-semibold flex items-center gap-1">
                  <Star className="h-3 w-3 fill-amber-300" /> {f.noteMoyenne.toFixed(2)}
                </span>
              </div>
            ))
          )}
        </TopCard>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  highlight,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        highlight
          ? "border-red-300 dark:border-red-700/40 bg-red-600/10"
          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400">{label}</p>
        <Icon className={`h-4 w-4 ${highlight ? "text-red-400" : "text-gray-500"}`} />
      </div>
      <p className={`text-lg font-bold ${highlight ? "text-red-400" : "text-gray-900 dark:text-gray-100"}`}>{value}</p>
    </div>
  );
}

function ChartCard({
  title,
  color,
  children,
}: {
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-2">
          <TrendingUp className="h-3.5 w-3.5" style={{ color }} /> {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

function TopCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-2 mb-3">
        <Icon className="h-3.5 w-3.5" /> {title}
      </h3>
      <div>{children}</div>
    </div>
  );
}
