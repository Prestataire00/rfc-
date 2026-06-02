"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Users,
  GraduationCap,
  BookOpen,
  CalendarDays,
  TrendingUp,
  ArrowRight,
  Euro,
  ClipboardList,
  CheckCircle,
  Clock,
  Bell,
  AlertTriangle,
  Info,
  AlertCircle,
  UserPlus,
  BadgeCheck,
  FileText,
  PenLine,
  Trophy,
  Smile,
  TrendingDown,
  Send,
} from "lucide-react";
import { StatutBadge } from "@/components/shared/StatutBadge";
import { SkeletonStats, SkeletonCard } from "@/components/shared/Skeleton";
import { SESSION_STATUTS, CONTACT_TYPES } from "@/lib/constants";
import { formatDate, formatCurrency } from "@/lib/utils";
import { MaJournee } from "@/components/dashboard/MaJournee";
import { useApi } from "@/hooks/useApi";

type Stats = {
  nbContacts: number;
  nbEntreprises: number;
  nbFormateurs: number;
  nbFormations: number;
  sessionsAVenir: number;
  devisEnvoyes: number;
  montantDevisEnvoyes: number;
  caFactureMois: number;
  caFactureAnnee: number;
  caFiltre: number;
  periodLabel: string;
  caPrevisionnel: number;
  nbStagiairesFormes: number;
  nbFormationsRealisees: number;
  nbBesoinsEnCours: number;
  nbDevisEnCours: number;
  // Heures vendues (cahier des charges art. 2.3)
  heuresVenduesMois: number;
  heuresVenduesTrimestre: number;
  heuresVenduesAnnee: number;
  heuresVenduesFiltre: number;
  // V2 KPIs
  nbBadges30j: number;
  nbRecyclagesUrgents: number;
  nbDocsAValider: number;
  tauxSignatureNum: number;
};

type Session = {
  id: string;
  dateDebut: string;
  dateFin: string;
  lieu: string | null;
  statut: string;
  capaciteMax: number;
  formation: { titre: string };
  formateur: { nom: string; prenom: string } | null;
  _count: { inscriptions: number };
};

type Contact = {
  id: string;
  nom: string;
  prenom: string;
  type: string;
  createdAt: string;
  entreprise: { nom: string } | null;
};

type DashboardData = {
  stats: Stats;
  prochainsSessions: Session[];
  derniersContacts: Contact[];
  sessionsSemaine: Session[];
  sessionsAujourdhui: Session[];
};

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  href,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  href: string;
  color: string;
}) {
  return (
    <Link href={href} className="block rounded-lg border bg-gray-800 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">{label}</p>
          <p className="text-2xl font-bold text-gray-100 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`rounded-full p-3 ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </Link>
  );
}

// Widget tunnel commercial : 6 étapes horizontales avec compteurs cliquables.
// Cible le mois en cours par défaut. Chaque étape route vers la page filtrée
// correspondante pour permettre à l'admin de voir la liste sous-jacente.
type FunnelCounts = {
  period: string;
  steps: {
    prospects: number;
    fichesEnvoyees: number;
    fichesRepondues: number;
    devisBrouillons: number;
    devisEnvoyes: number;
    devisSignes: number;
  };
  tauxConversion: number;
};

function FunnelWidget() {
  const { data } = useApi<FunnelCounts>("/api/funnel/counts?period=mois");
  const s = data?.steps ?? {
    prospects: 0,
    fichesEnvoyees: 0,
    fichesRepondues: 0,
    devisBrouillons: 0,
    devisEnvoyes: 0,
    devisSignes: 0,
  };

  const steps: Array<{
    key: string;
    label: string;
    count: number;
    href: string;
    icon: React.ElementType;
    color: string;
  }> = [
    { key: "prospects", label: "Prospects", count: s.prospects, href: "/prospects", icon: UserPlus, color: "bg-sky-500" },
    { key: "fichesEnv", label: "Fiches envoyées", count: s.fichesEnvoyees, href: "/qualiopi/fiches-pre-formation", icon: BadgeCheck, color: "bg-indigo-500" },
    { key: "fichesRep", label: "Fiches reçues", count: s.fichesRepondues, href: "/qualiopi/fiches-pre-formation", icon: ClipboardList, color: "bg-violet-500" },
    { key: "devisBr", label: "Devis à réviser", count: s.devisBrouillons, href: "/commercial?tab=devis&statut=brouillon", icon: FileText, color: "bg-amber-500" },
    { key: "devisEnv", label: "En signature", count: s.devisEnvoyes, href: "/commercial?tab=devis&statut=envoye", icon: PenLine, color: "bg-orange-500" },
    { key: "signes", label: "Gagnés", count: s.devisSignes, href: "/commercial?tab=devis&statut=signe", icon: Trophy, color: "bg-emerald-500" },
  ];

  return (
    <div className="mb-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Tunnel commercial — ce mois
          </h2>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
            Cliquer une étape pour voir la liste sous-jacente
          </p>
        </div>
        {data && data.tauxConversion > 0 && (
          <div className="text-right shrink-0">
            <p className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">Conversion</p>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{data.tauxConversion}%</p>
          </div>
        )}
      </div>
      <ol className="flex items-stretch gap-1 overflow-x-auto pb-1">
        {steps.map((step, idx) => {
          const isLast = idx === steps.length - 1;
          const Icon = step.icon;
          return (
            <li key={step.key} className="flex items-stretch gap-1 shrink-0">
              <Link
                href={step.href}
                className="group flex flex-col items-center gap-1 rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 hover:border-gray-400 dark:hover:border-gray-500 hover:shadow-sm transition-all min-w-[88px]"
              >
                <div className={`flex h-9 w-9 items-center justify-center rounded-full ${step.color} text-white shadow-sm group-hover:scale-105 transition-transform`}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-2xl font-bold leading-none text-gray-900 dark:text-gray-100">{step.count}</span>
                <span className="text-[10px] text-center leading-tight text-gray-600 dark:text-gray-400">{step.label}</span>
              </Link>
              {!isLast && (
                <div className="flex items-center">
                  <ArrowRight className="h-4 w-4 text-gray-300 dark:text-gray-600" />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// Widget Taux de Réussite — KPI Qualiopi (indicateur de performance pédagogique).
// Brut = réussis / total presents (inclut les non-évalués)
// Ajusté = réussis / évalués (ignore les non-évalués). On affiche les 2 pour
// que l'admin voie si l'évaluation est à jour ou si elle gonfle artificiellement
// le taux affiché.
type TauxReussite = {
  period: string;
  total: number;
  reussis: number;
  echecs: number;
  nonEvalues: number;
  evalues: number;
  tauxBrut: number;
  tauxAjuste: number;
  topFormations: Array<{
    formationId: string;
    titre: string;
    total: number;
    reussis: number;
    echecs: number;
    taux: number;
  }>;
};

function TauxReussiteWidget() {
  const { data } = useApi<TauxReussite>("/api/stats/taux-reussite?period=annee");
  const taux = data?.tauxAjuste ?? 0;
  const color =
    taux >= 80 ? "bg-emerald-500" :
    taux >= 60 ? "bg-amber-500" :
    "bg-red-500";

  return (
    <div className="mb-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Taux de réussite — cette année
          </h2>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
            Indicateur Qualiopi · cible 80% — basé sur les certificats de réalisation envoyés
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="rounded-md border border-gray-200 dark:border-gray-700 p-3 col-span-1 md:col-span-2">
          <div className="flex items-baseline gap-2 mb-2">
            <span className={`inline-flex h-3 w-3 rounded-full ${color}`} />
            <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">{taux}%</span>
            <span className="text-xs text-gray-500">ajusté · {data?.tauxBrut ?? 0}% brut</span>
          </div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400 space-y-0.5">
            <div>{data?.reussis ?? 0} réussis sur {data?.evalues ?? 0} évalués</div>
            {(data?.nonEvalues ?? 0) > 0 && (
              <div className="text-amber-600 dark:text-amber-400">
                ⚠ {data?.nonEvalues} stagiaires non encore évalués (allez sur la fiche session)
              </div>
            )}
          </div>
        </div>
        <div className="rounded-md border border-gray-200 dark:border-gray-700 p-3 md:col-span-2">
          <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-2">Top formations (volume)</p>
          {data?.topFormations.length === 0 ? (
            <p className="text-xs text-gray-400">Aucune session terminée cette année.</p>
          ) : (
            <ul className="space-y-1.5">
              {data?.topFormations.slice(0, 3).map((f) => (
                <li key={f.formationId} className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-gray-700 dark:text-gray-300 truncate flex-1">{f.titre}</span>
                  <span className="text-gray-500 shrink-0">{f.reussis}/{f.total}</span>
                  <span className={`shrink-0 font-medium ${f.taux >= 80 ? "text-emerald-500" : f.taux >= 60 ? "text-amber-500" : "text-red-500"}`}>
                    {f.taux}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function getWeekDates() {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - day + (day === 0 ? -6 : 1));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function isSameDay(d1: Date, d2: Date) {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

function isInRange(date: Date, start: Date, end: Date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  return d >= s && d <= e;
}

type Notification = {
  id: string;
  type: "warning" | "info" | "success" | "danger";
  titre: string;
  message: string;
  lien?: string;
};

export default function DashboardPage() {
  const [period, setPeriod] = useState<"mois" | "trimestre" | "annee">("mois");

  const { data: statsData, isLoading: statsLoading } = useApi<DashboardData>(
    `/api/dashboard/stats?period=${period}`
  );
  const { data: notifsData, isLoading: notifsLoading } = useApi<Notification[] | { notifications: Notification[] }>(
    "/api/notifications"
  );

  const data = statsData ?? null;
  const notifications = Array.isArray(notifsData)
    ? notifsData
    : Array.isArray((notifsData as { notifications?: Notification[] } | undefined)?.notifications)
      ? ((notifsData as { notifications: Notification[] }).notifications)
      : [];
  const loading = statsLoading || notifsLoading;

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-700" />
        <SkeletonStats />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonCard className="h-64" />
          <SkeletonCard className="h-64" />
        </div>
      </div>
    );
  }

  if (!data) return (
    <div className="flex flex-col items-center justify-center py-24 text-gray-400">
      <p className="text-lg font-medium">Impossible de charger le tableau de bord</p>
      <p className="text-sm mt-1">Vérifiez la connexion à la base de données</p>
    </div>
  );

  const { stats, prochainsSessions, derniersContacts, sessionsSemaine, sessionsAujourdhui } = data;
  const now = new Date();
  const mois = now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const weekDates = getWeekDates();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-100">Tableau de bord</h1>
        <p className="text-gray-400 mt-1">Vue d'ensemble de l'activite - {mois}</p>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="mb-6 rounded-lg border bg-gray-800 p-4">
          <h2 className="font-semibold text-gray-100 mb-3 flex items-center gap-2">
            <Bell className="h-4 w-4 text-orange-500" />
            Alertes ({notifications.length})
          </h2>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {notifications.slice(0, 8).map((n) => {
              const iconMap = {
                warning: <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />,
                danger: <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />,
                info: <Info className="h-4 w-4 text-red-500 shrink-0" />,
                success: <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />,
              };
              const bgMap = {
                warning: "bg-orange-900/20 border-orange-700",
                danger: "bg-red-900/20 border-red-700",
                info: "bg-red-900/20 border-red-700",
                success: "bg-green-900/20 border-green-700",
              };
              const content = (
                <div className={`flex items-start gap-3 rounded-lg border px-3 py-2 ${bgMap[n.type]}`}>
                  {iconMap[n.type]}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-100">{n.titre}</p>
                    <p className="text-xs text-gray-400 truncate">{n.message}</p>
                  </div>
                </div>
              );
              return n.lien ? (
                <Link key={n.id} href={n.lien} className="block hover:opacity-80 transition-opacity">
                  {content}
                </Link>
              ) : (
                <div key={n.id}>{content}</div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Tunnel commercial ── */}
      <FunnelWidget />

      {/* ── Taux de réussite formations (KPI Qualiopi) ── */}
      <TauxReussiteWidget />

      {/* CA Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="rounded-lg border bg-gradient-to-br from-green-50 to-emerald-50 p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Euro className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-300">CA Réalisé ({stats.periodLabel})</span>
            </div>
            <div className="flex rounded-md border border-green-700 overflow-hidden">
              {([["mois", "Mois"], ["trimestre", "Trim."], ["annee", "Année"]] as const).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setPeriod(val)}
                  className={`px-2 py-0.5 text-xs font-medium transition-colors ${
                    period === val
                      ? "bg-green-700 text-white"
                      : "text-green-400 hover:bg-green-900/30"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <p className="text-3xl font-bold text-green-900">{formatCurrency(stats.caFiltre)}</p>
          <p className="text-xs text-green-600 mt-1">Année: {formatCurrency(stats.caFactureAnnee)}</p>
        </div>
        <div className="rounded-lg border bg-gradient-to-br from-red-50 to-gray-100 p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-red-600" />
            <span className="text-sm font-medium text-red-800">CA Previsionnel</span>
          </div>
          <p className="text-3xl font-bold text-red-900">{formatCurrency(stats.caPrevisionnel)}</p>
          <p className="text-xs text-red-600 mt-1">{stats.nbDevisEnCours} devis en cours</p>
        </div>
        <div className="rounded-lg border bg-gradient-to-br from-purple-50 to-violet-50 p-5">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-5 w-5 text-purple-600" />
            <span className="text-sm font-medium text-purple-800">Formations Realisees</span>
          </div>
          <p className="text-3xl font-bold text-purple-900">{stats.nbFormationsRealisees}</p>
          <p className="text-xs text-purple-600 mt-1">{stats.nbStagiairesFormes} stagiaires formés cette année</p>
        </div>
      </div>

      {/* KPI satisfaction Qualiopi — calculés en direct depuis les évaluations
          remplies par les stagiaires (indicateurs 30/31 + acquis). */}
      <SatisfactionKpis />

      {/* Heures vendues (cahier des charges art. 2.3) — réutilise le filtre période ci-dessus */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="rounded-lg border bg-gradient-to-br from-blue-50 to-sky-50 p-5">
          <div className="flex items-center gap-2 mb-2">
            <CalendarDays className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">Heures vendues ({stats.periodLabel})</span>
          </div>
          <p className="text-3xl font-bold text-blue-900">{stats.heuresVenduesFiltre} h</p>
          <p className="text-xs text-blue-600 mt-1">
            Année : {stats.heuresVenduesAnnee} h · Trim. : {stats.heuresVenduesTrimestre} h
          </p>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={CalendarDays} label="Sessions a venir" value={stats.sessionsAVenir} href="/sessions" color="bg-amber-900/200" />
        <StatCard icon={ClipboardList} label="Demandes en cours" value={stats.nbBesoinsEnCours} href="/demandes" color="bg-orange-900/200" />
        <StatCard icon={Users} label="Contacts" value={stats.nbContacts} href="/contacts" color="bg-red-900/200" />
      </div>

      {/* V2 KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-3">
          <p className="text-[10px] uppercase text-gray-500 font-semibold">Signature num.</p>
          <p className="text-xl font-bold text-gray-100">{stats.tauxSignatureNum}%</p>
        </div>
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-3">
          <p className="text-[10px] uppercase text-gray-500 font-semibold">Badges (30j)</p>
          <p className="text-xl font-bold text-gray-100">{stats.nbBadges30j}</p>
        </div>
        <div className={`rounded-lg border p-3 ${stats.nbRecyclagesUrgents > 0 ? "border-amber-700 bg-amber-900/20" : "border-gray-700 bg-gray-800"}`}>
          <p className="text-[10px] uppercase text-gray-500 font-semibold">Recyclages &lt;60j</p>
          <p className={`text-xl font-bold ${stats.nbRecyclagesUrgents > 0 ? "text-amber-400" : "text-gray-100"}`}>{stats.nbRecyclagesUrgents}</p>
        </div>
        <div className={`rounded-lg border p-3 ${stats.nbDocsAValider > 0 ? "border-blue-700 bg-blue-900/20" : "border-gray-700 bg-gray-800"}`}>
          <p className="text-[10px] uppercase text-gray-500 font-semibold">Docs a valider</p>
          <p className={`text-xl font-bold ${stats.nbDocsAValider > 0 ? "text-blue-400" : "text-gray-100"}`}>{stats.nbDocsAValider}</p>
        </div>
      </div>

      {/* Ma Journee */}
      <MaJournee />

      {/* Planning du jour */}
      {sessionsAujourdhui.length > 0 && (
        <div className="rounded-lg border bg-gray-800 mb-6 overflow-hidden">
          <div className="px-6 py-4 border-b bg-red-900/20">
            <h2 className="font-semibold text-red-900 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Planning du jour - {now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
            </h2>
          </div>
          <div className="divide-y">
            {sessionsAujourdhui.map((s) => {
              const st = SESSION_STATUTS[s.statut as keyof typeof SESSION_STATUTS];
              return (
                <Link key={s.id} href={`/sessions/${s.id}`} className="flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3 hover:bg-gray-700">
                  <div className="text-xs sm:text-sm font-mono text-gray-400 w-24 sm:w-32 shrink-0">
                    {new Date(s.dateDebut).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    {" - "}
                    {new Date(s.dateFin).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-100">{s.formation.titre}</p>
                    <p className="text-xs text-gray-400">
                      {s.formateur ? `${s.formateur.prenom} ${s.formateur.nom}` : "Formateur non assigne"}
                      {s.lieu ? ` - ${s.lieu}` : ""}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">{s._count.inscriptions}/{s.capaciteMax}</span>
                  {st && <StatutBadge label={st.label} color={st.color} />}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Planning semaine */}
      <div className="rounded-lg border bg-gray-800 mb-6 overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b">
          <h2 className="font-semibold text-gray-100">Planning de la semaine</h2>
          <div className="flex items-center gap-3">
            <Link href="/dashboard/planning" className="text-sm text-red-600 hover:underline flex items-center gap-1">
              Planning complet <ArrowRight className="h-3 w-3" />
            </Link>
            <Link href="/sessions" className="text-sm text-gray-400 hover:underline flex items-center gap-1">
              Liste sessions <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
        <div className="overflow-x-auto">
        <div className="grid grid-cols-7 divide-x min-w-[640px]">
          {weekDates.map((date, idx) => {
            const today = isSameDay(date, now);
            const daySessions = sessionsSemaine.filter((s) =>
              isInRange(date, new Date(s.dateDebut), new Date(s.dateFin))
            );
            return (
              <div key={idx} className={`min-h-[120px] p-2 ${today ? "bg-red-900/20" : ""}`}>
                <div className={`text-center mb-2 ${today ? "text-red-400 font-bold" : "text-gray-400"}`}>
                  <div className="text-xs">{JOURS[idx]}</div>
                  <div className={`text-lg ${today ? "bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto" : ""}`}>
                    {date.getDate()}
                  </div>
                </div>
                <div className="space-y-1">
                  {daySessions.map((s) => {
                    const colors: Record<string, string> = {
                      confirmee: "bg-red-900/30 border-red-300 text-red-800",
                      planifiee: "bg-gray-700 border-gray-600 text-gray-300",
                      en_cours: "bg-yellow-900/30 border-yellow-300 text-yellow-300",
                    };
                    return (
                      <Link
                        key={s.id}
                        href={`/sessions/${s.id}`}
                        className={`block rounded border px-1.5 py-1 text-[10px] leading-tight truncate hover:opacity-80 ${colors[s.statut] || "bg-gray-700 border-gray-600 text-gray-300"}`}
                      >
                        {s.formation.titre}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        </div>
      </div>

      {/* Bottom panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Prochaines sessions */}
        <div className="rounded-lg border bg-gray-800 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="font-semibold text-gray-100">Prochaines sessions</h2>
            <Link href="/sessions" className="text-sm text-red-600 hover:underline flex items-center gap-1">
              Voir tout <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {prochainsSessions.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">Aucune session planifiee</div>
          ) : (
            <div className="divide-y">
              {prochainsSessions.map((s) => {
                const st = SESSION_STATUTS[s.statut as keyof typeof SESSION_STATUTS];
                return (
                  <Link key={s.id} href={`/sessions/${s.id}`} className="flex items-start gap-3 px-6 py-4 hover:bg-gray-700 transition-colors">
                    <div className="flex-shrink-0 text-center w-10">
                      <div className="text-lg font-bold text-red-600 leading-none">{new Date(s.dateDebut).getDate()}</div>
                      <div className="text-xs text-gray-400 uppercase">
                        {new Date(s.dateDebut).toLocaleDateString("fr-FR", { month: "short" })}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-100 truncate">{s.formation.titre}</p>
                      <p className="text-xs text-gray-400">
                        {s.formateur ? `${s.formateur.prenom} ${s.formateur.nom}` : "Formateur non assigne"}
                        {s.lieu ? ` - ${s.lieu}` : ""}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{s._count.inscriptions}/{s.capaciteMax} participants</p>
                    </div>
                    <div className="flex-shrink-0">
                      {st && <StatutBadge label={st.label} color={st.color} />}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Derniers contacts */}
        <div className="rounded-lg border bg-gray-800 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="font-semibold text-gray-100">Derniers contacts</h2>
            <Link href="/contacts" className="text-sm text-red-600 hover:underline flex items-center gap-1">
              Voir tout <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {derniersContacts.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">Aucun contact</div>
          ) : (
            <div className="divide-y">
              {derniersContacts.map((c) => {
                const ct = CONTACT_TYPES[c.type as keyof typeof CONTACT_TYPES];
                return (
                  <Link key={c.id} href={`/contacts/${c.id}`} className="flex items-center gap-3 px-6 py-4 hover:bg-gray-700 transition-colors">
                    <div className="flex-shrink-0 h-9 w-9 rounded-full bg-red-900/30 flex items-center justify-center text-red-400 font-semibold text-sm">
                      {c.prenom[0]}{c.nom[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-100">{c.prenom} {c.nom}</p>
                      <p className="text-xs text-gray-400 truncate">{c.entreprise?.nom || "Sans entreprise"}</p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      {ct && (
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${ct.color}`}>
                          {ct.label}
                        </span>
                      )}
                      <p className="text-xs text-gray-400 mt-1">{formatDate(c.createdAt)}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// SatisfactionKpis — 3 cards de KPI Qualiopi calculés en direct depuis
// /api/dashboard/satisfaction. Tendance J-30 vs J-60 affichée si dispo.
// ──────────────────────────────────────────────────────────────────────────────
type SatisfactionStats = {
  noteMoyenne: number | null;
  noteMoyenneChaud: number | null;
  noteMoyenneFroid: number | null;
  noteMoyenneAcquis: number | null;
  nbCompletes: number;
  nbTotal: number;
  tauxReponseGlobal: number;
  tendanceJ30: number | null;
  nbReponses: number;
};

function fmtNote(n: number | null | undefined): string {
  return n == null ? "—" : `${n.toFixed(1)} / 5`;
}

function SatisfactionKpis() {
  const { data, isLoading } = useApi<SatisfactionStats>("/api/dashboard/satisfaction");
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }
  if (!data) return null;

  const noteGlobalePct = data.noteMoyenne != null ? Math.round((data.noteMoyenne / 5) * 100) : null;
  const tendance = data.tendanceJ30;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* Note de satisfaction moyenne globale */}
      <div className="rounded-lg border bg-gradient-to-br from-amber-50 to-yellow-50 p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Smile className="h-5 w-5 text-amber-600" />
            <span className="text-sm font-medium text-amber-800">Satisfaction moyenne</span>
          </div>
          {tendance != null && (
            <span
              className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${
                tendance >= 0 ? "text-emerald-700" : "text-red-700"
              }`}
              title="Évolution sur 30 jours vs 30 jours précédents"
            >
              {tendance >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {tendance >= 0 ? "+" : ""}{tendance.toFixed(1)}
            </span>
          )}
        </div>
        <p className="text-3xl font-bold text-amber-900">{fmtNote(data.noteMoyenne)}</p>
        <p className="text-xs text-amber-600 mt-1">
          {data.nbReponses} réponse{data.nbReponses > 1 ? "s" : ""}
          {noteGlobalePct != null ? ` · ${noteGlobalePct}%` : ""}
        </p>
      </div>

      {/* Taux de réponse */}
      <div className="rounded-lg border bg-gradient-to-br from-blue-50 to-sky-50 p-5">
        <div className="flex items-center gap-2 mb-2">
          <Send className="h-5 w-5 text-blue-600" />
          <span className="text-sm font-medium text-blue-800">Taux de réponse</span>
        </div>
        <p className="text-3xl font-bold text-blue-900">{data.tauxReponseGlobal}%</p>
        <p className="text-xs text-blue-600 mt-1">
          {data.nbCompletes} / {data.nbTotal} envoyée{data.nbTotal > 1 ? "s" : ""}
        </p>
      </div>

      {/* Détail par type */}
      <div className="rounded-lg border bg-gradient-to-br from-violet-50 to-purple-50 p-5">
        <div className="flex items-center gap-2 mb-2">
          <ClipboardList className="h-5 w-5 text-violet-600" />
          <span className="text-sm font-medium text-violet-800">Par type d'évaluation</span>
        </div>
        <div className="space-y-1 mt-2">
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-violet-700">À chaud</span>
            <span className="font-semibold text-violet-900">{fmtNote(data.noteMoyenneChaud)}</span>
          </div>
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-violet-700">À froid</span>
            <span className="font-semibold text-violet-900">{fmtNote(data.noteMoyenneFroid)}</span>
          </div>
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-violet-700">Acquis</span>
            <span className="font-semibold text-violet-900">{fmtNote(data.noteMoyenneAcquis)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
