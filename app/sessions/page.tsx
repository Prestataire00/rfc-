"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronLeft, ChevronRight, List, Calendar, Search, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatutBadge } from "@/components/shared/StatutBadge";
import { Input } from "@/components/ui/input";
import { SESSION_STATUTS } from "@/lib/constants";
import { formatDate, cn } from "@/lib/utils";

type Session = {
  id: string;
  dateDebut: string;
  dateFin: string;
  lieu: string | null;
  capaciteMax: number;
  statut: string;
  formation: { id: string; titre: string };
  formateur: { id: string; nom: string; prenom: string } | null;
  _count: { inscriptions: number };
};

type Formateur = { id: string; nom: string; prenom: string };

const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MOIS = [
  "Janvier", "Fevrier", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Aout", "Septembre", "Octobre", "Novembre", "Decembre",
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

export default function SessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [formateurs, setFormateurs] = useState<Formateur[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"liste" | "calendrier">("liste");
  const [statut, setStatut] = useState("");
  const [formateurId, setFormateurId] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [capacite, setCapacite] = useState("");
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statut) params.set("statut", statut);
    if (formateurId) params.set("formateurId", formateurId);
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (capacite) params.set("capacite", capacite);
    const res = await fetch(`/api/sessions?${params}`);
    const data = await res.json();
    setSessions(data.sessions || data);
    if (data.formateurs) setFormateurs(data.formateurs);
    setLoading(false);
  }, [statut, formateurId, debouncedSearch, capacite]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const sessionsByDate = sessions.reduce((acc, s) => {
    const d = new Date(s.dateDebut);
    if (d.getMonth() === calMonth && d.getFullYear() === calYear) {
      const key = d.getDate();
      if (!acc[key]) acc[key] = [];
      acc[key].push(s);
    }
    return acc;
  }, {} as Record<number, Session[]>);

  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfMonth(calYear, calMonth);

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1); }
    else { setCalMonth((m) => m - 1); }
  };

  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1); }
    else { setCalMonth((m) => m + 1); }
  };

  const statutOptions = [
    { value: "", label: "Tous les statuts" },
    ...Object.entries(SESSION_STATUTS).map(([v, s]) => ({ value: v, label: s.label })),
  ];

  const hasFilters = search || statut || formateurId || capacite;

  const getCapacityInfo = (s: Session) => {
    const ratio = s._count.inscriptions / s.capaciteMax;
    if (ratio >= 1) return { color: "text-red-600 bg-red-50", label: "Complet" };
    if (ratio >= 0.8) return { color: "text-orange-600 bg-orange-50", label: "Presque complet" };
    return { color: "text-green-600 bg-green-50", label: "Disponible" };
  };

  return (
    <div>
      <PageHeader
        title="Sessions de formation"
        description="Planifiez et suivez vos sessions"
        actionLabel="Nouvelle session"
        actionHref="/sessions/nouveau"
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("liste")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
            activeTab === "liste" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
          )}
        >
          <List className="h-4 w-4" /> Liste
        </button>
        <button
          onClick={() => setActiveTab("calendrier")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
            activeTab === "calendrier" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
          )}
        >
          <CalendarDays className="h-4 w-4" /> Calendrier
        </button>
      </div>

      {activeTab === "liste" && (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher (formation, formateur, lieu)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={statut}
              onChange={(e) => setStatut(e.target.value)}
              className="h-10 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              {statutOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <select
              value={formateurId}
              onChange={(e) => setFormateurId(e.target.value)}
              className="h-10 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">Tous les formateurs</option>
              {formateurs.map((f) => (
                <option key={f.id} value={f.id}>{f.prenom} {f.nom}</option>
              ))}
            </select>
            <select
              value={capacite}
              onChange={(e) => setCapacite(e.target.value)}
              className="h-10 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">Toutes capacites</option>
              <option value="disponible">Places disponibles</option>
              <option value="complet">Complet</option>
            </select>
            {hasFilters && (
              <button
                onClick={() => { setSearch(""); setStatut(""); setFormateurId(""); setCapacite(""); }}
                className="h-10 px-3 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                Effacer
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
          ) : sessions.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="Aucune session"
              description={hasFilters ? "Aucune session ne correspond aux filtres." : "Planifiez votre premiere session de formation"}
              actionLabel={hasFilters ? undefined : "Nouvelle session"}
              actionHref={hasFilters ? undefined : "/sessions/nouveau"}
            />
          ) : (
            <>
              <div className="rounded-lg border bg-white overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Formation</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Formateur</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Dates</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Lieu</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Participants</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s) => {
                      const st = SESSION_STATUTS[s.statut as keyof typeof SESSION_STATUTS];
                      const cap = getCapacityInfo(s);
                      return (
                        <tr
                          key={s.id}
                          className="border-b last:border-0 hover:bg-gray-50 cursor-pointer"
                          onClick={() => router.push(`/sessions/${s.id}`)}
                        >
                          <td className="px-4 py-3">
                            <Link
                              href={`/formations/${s.formation.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="font-medium text-blue-600 hover:underline"
                            >
                              {s.formation.titre}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {s.formateur ? (
                              `${s.formateur.prenom} ${s.formateur.nom}`
                            ) : (
                              <span className="inline-flex items-center gap-1 text-orange-500">
                                <AlertTriangle className="h-3.5 w-3.5" /> Non assigne
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            <div>{formatDate(s.dateDebut)}</div>
                            <div className="text-gray-400 text-xs">→ {formatDate(s.dateFin)}</div>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {s.lieu || <span className="text-gray-400">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className={cn("font-medium", cap.color.split(" ")[0])}>
                                {s._count.inscriptions}/{s.capaciteMax}
                              </span>
                              {s._count.inscriptions >= s.capaciteMax && (
                                <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">
                                  Complet
                                </span>
                              )}
                              {s._count.inscriptions >= s.capaciteMax * 0.8 && s._count.inscriptions < s.capaciteMax && (
                                <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-medium">
                                  Presque complet
                                </span>
                              )}
                            </div>
                            {/* Progress bar */}
                            <div className="w-20 h-1.5 bg-gray-200 rounded-full mt-1">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  s._count.inscriptions >= s.capaciteMax ? "bg-red-500" :
                                  s._count.inscriptions >= s.capaciteMax * 0.8 ? "bg-orange-500" : "bg-green-500"
                                )}
                                style={{ width: `${Math.min(100, (s._count.inscriptions / s.capaciteMax) * 100)}%` }}
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {st && <StatutBadge label={st.label} color={st.color} />}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-gray-500 mt-3">
                {sessions.length} session{sessions.length > 1 ? "s" : ""}
              </p>
            </>
          )}
        </>
      )}

      {activeTab === "calendrier" && (
        <div className="bg-white rounded-lg border p-6">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-6">
            <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-md transition-colors">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-semibold">{MOIS[calMonth]} {calYear}</h2>
            <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-md transition-colors">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {JOURS.map((j) => (
              <div key={j} className="text-center text-xs font-medium text-gray-500 py-2">{j}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[80px] rounded-md" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const daySessions = sessionsByDate[day] || [];
              const today = new Date();
              const isToday = today.getDate() === day && today.getMonth() === calMonth && today.getFullYear() === calYear;
              return (
                <div
                  key={day}
                  className={cn(
                    "min-h-[80px] rounded-md border p-1",
                    isToday ? "border-blue-300 bg-blue-50" : "border-gray-100"
                  )}
                >
                  <div className={cn(
                    "text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full",
                    isToday ? "bg-blue-600 text-white" : "text-gray-600"
                  )}>
                    {day}
                  </div>
                  {daySessions.map((s) => {
                    const st = SESSION_STATUTS[s.statut as keyof typeof SESSION_STATUTS];
                    const isFull = s._count.inscriptions >= s.capaciteMax;
                    return (
                      <Link
                        key={s.id}
                        href={`/sessions/${s.id}`}
                        className={cn(
                          "block text-xs px-1 py-0.5 rounded mb-0.5 truncate hover:opacity-80",
                          st?.color || "bg-gray-100 text-gray-600"
                        )}
                        title={`${s.formation.titre} - ${s._count.inscriptions}/${s.capaciteMax} participants${isFull ? " (COMPLET)" : ""}`}
                      >
                        {isFull && "● "}{s.formation.titre}
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-3">
            {Object.entries(SESSION_STATUTS).map(([k, v]) => (
              <div key={k} className="flex items-center gap-1.5">
                <span className={cn("w-3 h-3 rounded-full border", v.color)} />
                <span className="text-xs text-gray-600">{v.label}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <span className="text-xs">●</span>
              <span className="text-xs text-gray-600">Complet</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
