"use client";

// Page Planning admin — vue étendue du planning hebdomadaire avec navigation
// semaine, filtre formateur et filtre statut. Complète le widget "Planning
// de la semaine" du dashboard (qui ne montre que la semaine en cours).

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Filter,
  Users,
  MapPin,
  ArrowLeft,
} from "lucide-react";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
} from "date-fns";
import { fr } from "date-fns/locale";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatutBadge } from "@/components/shared/StatutBadge";
import { useApi } from "@/hooks/useApi";
import { SESSION_STATUTS } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Session = {
  id: string;
  dateDebut: string;
  dateFin: string;
  lieu: string | null;
  statut: string;
  capaciteMax: number;
  formation: { id: string; titre: string };
  formateur: { id: string; nom: string; prenom: string } | null;
  _count: { inscriptions: number };
};

type Formateur = { id: string; nom: string; prenom: string };

type SessionsResponse = {
  data: Session[];
  formateurs?: Formateur[];
} | Session[];

const STATUT_OPTIONS = [
  { value: "", label: "Tous statuts" },
  { value: "planifiee", label: "Planifiée" },
  { value: "confirmee", label: "Confirmée" },
  { value: "en_cours", label: "En cours" },
  { value: "terminee", label: "Terminée" },
  { value: "annulee", label: "Annulée" },
];

type ViewMode = "week" | "month";

export default function PlanningPage() {
  const [view, setView] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [formateurFilter, setFormateurFilter] = useState("");
  const [statutFilter, setStatutFilter] = useState("");

  const range = useMemo(() => {
    if (view === "week") {
      return {
        start: startOfWeek(currentDate, { weekStartsOn: 1 }),
        end: endOfWeek(currentDate, { weekStartsOn: 1 }),
      };
    }
    return {
      start: startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }),
      end: endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 }),
    };
  }, [currentDate, view]);

  const days = useMemo(
    () => eachDayOfInterval({ start: range.start, end: range.end }),
    [range],
  );

  const apiParams = new URLSearchParams({
    dateFrom: range.start.toISOString(),
    dateTo: range.end.toISOString(),
    limit: "200",
  });
  if (formateurFilter) apiParams.set("formateurId", formateurFilter);
  if (statutFilter) apiParams.set("statut", statutFilter);

  const { data, isLoading } = useApi<SessionsResponse>(`/api/sessions?${apiParams.toString()}`);

  const sessions: Session[] = Array.isArray(data) ? data : data?.data ?? [];
  const formateursList: Formateur[] = Array.isArray(data) ? [] : data?.formateurs ?? [];

  const navigate = (direction: "prev" | "next" | "today") => {
    if (direction === "today") return setCurrentDate(new Date());
    const fn = view === "week"
      ? (direction === "next" ? addWeeks : subWeeks)
      : (direction === "next" ? addMonths : subMonths);
    setCurrentDate(fn(currentDate, 1));
  };

  const sessionsByDay = useMemo(() => {
    const map = new Map<string, Session[]>();
    for (const s of sessions) {
      const day = format(parseISO(s.dateDebut), "yyyy-MM-dd");
      const existing = map.get(day) ?? [];
      existing.push(s);
      map.set(day, existing);
    }
    return map;
  }, [sessions]);

  const headerLabel = view === "week"
    ? `Semaine du ${format(range.start, "d MMM", { locale: fr })} au ${format(range.end, "d MMM yyyy", { locale: fr })}`
    : format(currentDate, "MMMM yyyy", { locale: fr });

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-2">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200"
        >
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
      </div>
      <PageHeader
        title="Planning"
        description="Vue d'ensemble des sessions de formation avec filtres formateur et statut."
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Toggle vue */}
        <div className="inline-flex rounded-md border border-gray-700 overflow-hidden">
          {(["week", "month"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setView(mode)}
              className={cn(
                "px-3 py-1.5 text-sm transition-colors",
                view === mode
                  ? "bg-red-600 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700",
              )}
            >
              {mode === "week" ? "Semaine" : "Mois"}
            </button>
          ))}
        </div>

        {/* Nav prev/today/next */}
        <div className="inline-flex items-center gap-1">
          <button
            onClick={() => navigate("prev")}
            className="p-1.5 rounded-md hover:bg-gray-700 text-gray-300"
            title={view === "week" ? "Semaine précédente" : "Mois précédent"}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => navigate("today")}
            className="text-sm text-gray-300 hover:text-gray-100 px-3 py-1 rounded hover:bg-gray-700"
          >
            Aujourd&apos;hui
          </button>
          <button
            onClick={() => navigate("next")}
            className="p-1.5 rounded-md hover:bg-gray-700 text-gray-300"
            title={view === "week" ? "Semaine suivante" : "Mois suivant"}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <h2 className="text-sm font-semibold text-gray-200 capitalize">{headerLabel}</h2>

        {/* Filtres */}
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-gray-500" />
          <select
            value={formateurFilter}
            onChange={(e) => setFormateurFilter(e.target.value)}
            className="rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-200"
          >
            <option value="">Tous formateurs</option>
            {formateursList.map((f) => (
              <option key={f.id} value={f.id}>{f.prenom} {f.nom}</option>
            ))}
          </select>
          <select
            value={statutFilter}
            onChange={(e) => setStatutFilter(e.target.value)}
            className="rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-200"
          >
            {STATUT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grille */}
      <div className="rounded-lg border border-gray-700 bg-gray-800 overflow-hidden">
        {/* En-têtes jours */}
        <div className="grid grid-cols-7 border-b border-gray-700 bg-gray-900">
          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
            <div key={d} className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase">
              {d}
            </div>
          ))}
        </div>

        {/* Grille jours */}
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
          </div>
        ) : (
          <div className={cn("grid grid-cols-7 auto-rows-fr", view === "week" && "min-h-[480px]")}>
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const daySessions = sessionsByDay.get(key) ?? [];
              const inCurrentPeriod = view === "month" ? isSameMonth(day, currentDate) : true;
              const today = isToday(day);

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "border-b border-r border-gray-700 last:border-r-0 p-2 group",
                    view === "week" ? "min-h-[120px]" : "min-h-[100px]",
                    !inCurrentPeriod && "bg-gray-900/50",
                    today && "bg-red-900/10",
                  )}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={cn(
                        "inline-flex h-6 min-w-[1.5rem] px-1 items-center justify-center rounded-full text-xs",
                        today ? "bg-red-600 text-white font-semibold" : "text-gray-300",
                        !inCurrentPeriod && "text-gray-600",
                      )}
                    >
                      {format(day, view === "week" ? "EEE d" : "d", { locale: fr })}
                    </span>
                    {daySessions.length > 0 && (
                      <span className="text-[10px] text-gray-500">
                        {daySessions.length} session{daySessions.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    {daySessions.map((s) => {
                      const st = SESSION_STATUTS[s.statut as keyof typeof SESSION_STATUTS];
                      return (
                        <Link
                          key={s.id}
                          href={`/sessions/${s.id}`}
                          className="block rounded border px-1.5 py-1 text-[11px] leading-tight hover:opacity-80 bg-gray-900 border-gray-700"
                          title={`${s.formation.titre} — ${s.formateur ? `${s.formateur.prenom} ${s.formateur.nom}` : "sans formateur"}`}
                        >
                          <div className="flex items-center gap-1 mb-0.5">
                            <span className="text-[10px] font-mono text-gray-500">
                              {format(parseISO(s.dateDebut), "HH:mm")}
                            </span>
                            {st && (
                              <span className={cn("inline-block w-1.5 h-1.5 rounded-full", st.color.split(" ").find((c) => c.startsWith("bg-")))} />
                            )}
                          </div>
                          <div className="font-medium text-gray-100 truncate">{s.formation.titre}</div>
                          {s.formateur && (
                            <div className="text-gray-400 truncate text-[10px]">
                              {s.formateur.prenom.charAt(0)}. {s.formateur.nom}
                            </div>
                          )}
                          {s.lieu && (
                            <div className="text-gray-500 truncate text-[10px] flex items-center gap-0.5">
                              <MapPin className="h-2.5 w-2.5" />
                              {s.lieu}
                            </div>
                          )}
                          <div className="text-gray-500 text-[10px] flex items-center gap-0.5 mt-0.5">
                            <Users className="h-2.5 w-2.5" />
                            {s._count.inscriptions}/{s.capaciteMax}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Légende */}
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
        {Object.entries(SESSION_STATUTS).map(([key, meta]) => {
          const dotColor = meta.color.split(" ").find((c) => c.startsWith("bg-"));
          return (
            <div key={key} className="flex items-center gap-1.5">
              <span className={cn("inline-block w-2 h-2 rounded-full", dotColor)} />
              <span>{meta.label}</span>
            </div>
          );
        })}
        <div className="ml-auto">
          <StatutBadge label="Cliquez sur une session pour ouvrir" color="bg-gray-700 text-gray-300" />
        </div>
      </div>
    </div>
  );
}
