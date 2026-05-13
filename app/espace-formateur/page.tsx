"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CalendarDays, Clock, CheckCircle,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { StatutBadge } from "@/components/shared/StatutBadge";
import { SESSION_STATUTS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { useApi } from "@/hooks/useApi";

type Session = {
  id: string;
  dateDebut: string;
  dateFin: string;
  lieu: string | null;
  statut: string;
  capaciteMax: number;
  formation: { titre: string; duree: number };
  _count: { inscriptions: number };
};

const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function getMonthDays(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: (Date | null)[] = [];
  let startOffset = firstDay.getDay() - 1;
  if (startOffset < 0) startOffset = 6;
  for (let i = 0; i < startOffset; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
  return days;
}

function isInRange(date: Date, start: string, end: string) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const s = new Date(new Date(start).getFullYear(), new Date(start).getMonth(), new Date(start).getDate()).getTime();
  const e = new Date(new Date(end).getFullYear(), new Date(end).getMonth(), new Date(end).getDate()).getTime();
  return d >= s && d <= e;
}

const SESSION_COLORS: Record<string, string> = {
  confirmee: "bg-red-900/30 text-red-300",
  planifiee: "bg-gray-700 text-gray-300",
  en_cours: "bg-yellow-900/30 text-yellow-300",
  terminee: "bg-green-900/30 text-green-300",
};

export default function EspaceFormateurPage() {
  const { data, isLoading } = useApi<Session[]>("/api/formateur/mes-sessions");
  const sessions: Session[] = Array.isArray(data) ? data : [];
  const loading = isLoading;

  const [planningDate, setPlanningDate] = useState(new Date());
  const year = planningDate.getFullYear();
  const month = planningDate.getMonth();
  const days = getMonthDays(year, month);
  const today = new Date();

  const now = new Date();
  const aVenir = sessions.filter((s) => new Date(s.dateDebut) > now && s.statut !== "annulee");
  const enCours = sessions.filter((s) => s.statut === "en_cours");
  const terminees = sessions.filter((s) => s.statut === "terminee");

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-100">Mon Espace Formateur</h1>
        <p className="text-gray-400 mt-1">Bienvenue dans votre espace personnel</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="rounded-lg border bg-gray-800 p-5 flex items-center gap-4">
          <div className="rounded-full p-3 bg-red-900/30">
            <CalendarDays className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <p className="text-sm text-gray-400">Sessions a venir</p>
            <p className="text-2xl font-bold text-gray-100">{aVenir.length}</p>
          </div>
        </div>
        <div className="rounded-lg border bg-gray-800 p-5 flex items-center gap-4">
          <div className="rounded-full p-3 bg-yellow-900/30">
            <Clock className="h-6 w-6 text-yellow-600" />
          </div>
          <div>
            <p className="text-sm text-gray-400">En cours</p>
            <p className="text-2xl font-bold text-gray-100">{enCours.length}</p>
          </div>
        </div>
        <div className="rounded-lg border bg-gray-800 p-5 flex items-center gap-4">
          <div className="rounded-full p-3 bg-green-900/30">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-400">Terminees</p>
            <p className="text-2xl font-bold text-gray-100">{terminees.length}</p>
          </div>
        </div>
      </div>

      {/* Planning calendrier */}
      <div className="rounded-lg border bg-gray-800 overflow-hidden mb-8">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold text-gray-100">Mon planning</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPlanningDate(new Date(year, month - 1, 1))}
              className="rounded-md border p-2 hover:bg-gray-700"
              aria-label="Mois précédent"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium text-gray-200 min-w-[140px] text-center">
              {MOIS[month]} {year}
            </span>
            <button
              onClick={() => setPlanningDate(new Date(year, month + 1, 1))}
              className="rounded-md border p-2 hover:bg-gray-700"
              aria-label="Mois suivant"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPlanningDate(new Date())}
              className="text-xs text-gray-400 hover:text-gray-200 ml-2"
            >
              Aujourd&apos;hui
            </button>
          </div>
        </div>

        {/* Jours de la semaine */}
        <div className="grid grid-cols-7 border-b">
          {JOURS.map((j) => (
            <div
              key={j}
              className="px-2 py-2 text-center text-xs font-medium text-gray-400 bg-gray-900"
            >
              {j}
            </div>
          ))}
        </div>

        {/* Grille calendrier */}
        <div className="grid grid-cols-7">
          {days.map((day, idx) => {
            if (!day) {
              return (
                <div
                  key={idx}
                  className="min-h-[88px] border-b border-r bg-gray-900"
                />
              );
            }
            const isToday = day.toDateString() === today.toDateString();
            const daySessions = sessions.filter((s) =>
              isInRange(day, s.dateDebut, s.dateFin),
            );
            return (
              <div
                key={idx}
                className={`min-h-[88px] border-b border-r p-1 ${
                  isToday ? "bg-red-900/20" : ""
                }`}
              >
                <div
                  className={`text-xs mb-1 ${
                    isToday
                      ? "bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center"
                      : "text-gray-400 px-1"
                  }`}
                >
                  {day.getDate()}
                </div>
                {daySessions.slice(0, 3).map((s) => (
                  <Link
                    key={s.id}
                    href={`/espace-formateur/sessions/${s.id}`}
                    className={`block rounded px-1 py-0.5 text-[10px] leading-tight truncate mb-0.5 hover:opacity-80 ${
                      SESSION_COLORS[s.statut] || "bg-gray-700 text-gray-300"
                    }`}
                    title={s.formation.titre}
                  >
                    {s.formation.titre}
                  </Link>
                ))}
                {daySessions.length > 3 ? (
                  <div className="text-[9px] text-gray-500 px-1">
                    +{daySessions.length - 3}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* Prochaines sessions (liste) */}
      <div className="rounded-lg border bg-gray-800 overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="font-semibold text-gray-100">Prochaines sessions</h2>
        </div>
        {aVenir.length === 0 ? (
          <div className="p-6 text-center text-gray-400 text-sm">
            Aucune session a venir
          </div>
        ) : (
          <div className="divide-y">
            {aVenir.slice(0, 10).map((s) => {
              const st = SESSION_STATUTS[s.statut as keyof typeof SESSION_STATUTS];
              return (
                <Link
                  key={s.id}
                  href={`/espace-formateur/sessions/${s.id}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-gray-700"
                >
                  <div className="flex-shrink-0 text-center w-12">
                    <div className="text-lg font-bold text-red-600">
                      {new Date(s.dateDebut).getDate()}
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(s.dateDebut).toLocaleDateString("fr-FR", {
                        month: "short",
                      })}
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-100">
                      {s.formation.titre}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatDate(s.dateDebut)} - {formatDate(s.dateFin)}
                      {s.lieu ? ` | ${s.lieu}` : ""}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {s._count.inscriptions}/{s.capaciteMax}
                  </span>
                  {st && <StatutBadge label={st.label} color={st.color} />}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
