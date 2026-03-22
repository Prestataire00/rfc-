"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Building2,
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
} from "lucide-react";
import { StatutBadge } from "@/components/shared/StatutBadge";
import { SESSION_STATUTS, CONTACT_TYPES } from "@/lib/constants";
import { formatDate, formatCurrency } from "@/lib/utils";

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
  caPrevisionnel: number;
  nbStagiairesFormes: number;
  nbFormationsRealisees: number;
  nbBesoinsEnCours: number;
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
  const [data, setData] = useState<DashboardData | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard/stats").then((r) => r.ok ? r.json() : null),
      fetch("/api/notifications").then((r) => r.ok ? r.json() : []),
    ]).then(([d, n]) => {
      setData(d);
      setNotifications(Array.isArray(n) ? n : []);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
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

      {/* CA Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="rounded-lg border bg-gradient-to-br from-green-50 to-emerald-50 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Euro className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-300">CA Realise (Mois)</span>
          </div>
          <p className="text-3xl font-bold text-green-900">{formatCurrency(stats.caFactureMois)}</p>
          <p className="text-xs text-green-600 mt-1">Annee: {formatCurrency(stats.caFactureAnnee)}</p>
        </div>
        <div className="rounded-lg border bg-gradient-to-br from-red-50 to-gray-100 p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-red-600" />
            <span className="text-sm font-medium text-red-800">CA Previsionnel</span>
          </div>
          <p className="text-3xl font-bold text-red-900">{formatCurrency(stats.caPrevisionnel)}</p>
          <p className="text-xs text-red-600 mt-1">{stats.devisEnvoyes} devis en cours</p>
        </div>
        <div className="rounded-lg border bg-gradient-to-br from-purple-50 to-violet-50 p-5">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-5 w-5 text-purple-600" />
            <span className="text-sm font-medium text-purple-800">Formations Realisees</span>
          </div>
          <p className="text-3xl font-bold text-purple-900">{stats.nbFormationsRealisees}</p>
          <p className="text-xs text-purple-600 mt-1">{stats.nbStagiairesFormes} stagiaires formes cette annee</p>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={CalendarDays} label="Sessions a venir" value={stats.sessionsAVenir} href="/sessions" color="bg-amber-900/200" />
        <StatCard icon={ClipboardList} label="Besoins en cours" value={stats.nbBesoinsEnCours} href="/besoins" color="bg-orange-900/200" />
        <StatCard icon={Users} label="Contacts" value={stats.nbContacts} href="/contacts" color="bg-red-900/200" />
        <StatCard icon={Building2} label="Entreprises" value={stats.nbEntreprises} href="/entreprises" color="bg-violet-500" />
      </div>

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
          <Link href="/sessions" className="text-sm text-red-600 hover:underline flex items-center gap-1">
            Voir tout <ArrowRight className="h-3 w-3" />
          </Link>
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
