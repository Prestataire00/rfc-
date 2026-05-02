"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatDate } from "@/lib/utils";
import { useApi } from "@/hooks/useApi";

type Session = {
  id: string;
  dateDebut: string;
  dateFin: string;
  lieu: string | null;
  statut: string;
  formation: { titre: string; duree: number };
  _count: { inscriptions: number };
};

const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: (Date | null)[] = [];

  // Offset for Monday start
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

export default function PlanningPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { data } = useApi<Session[]>("/api/formateur/mes-sessions");
  const sessions: Session[] = data ?? [];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const days = getMonthDays(year, month);
  const today = new Date();

  function prevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
  }
  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
  }

  return (
    <div>
      <PageHeader title="Mon Planning" description="Vue calendrier de vos sessions" />

      <div className="rounded-lg border bg-gray-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <button onClick={prevMonth} className="rounded-md border p-2 hover:bg-gray-700"><ChevronLeft className="h-4 w-4" /></button>
          <h2 className="text-lg font-semibold text-gray-100">{MOIS[month]} {year}</h2>
          <button onClick={nextMonth} className="rounded-md border p-2 hover:bg-gray-700"><ChevronRight className="h-4 w-4" /></button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b">
          {JOURS.map((j) => (
            <div key={j} className="px-2 py-2 text-center text-xs font-medium text-gray-400 bg-gray-900">{j}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {days.map((day, idx) => {
            if (!day) return <div key={idx} className="min-h-[80px] border-b border-r bg-gray-900" />;

            const isToday = day.toDateString() === today.toDateString();
            const daySessions = sessions.filter((s) => isInRange(day, s.dateDebut, s.dateFin));

            return (
              <div key={idx} className={`min-h-[80px] border-b border-r p-1 ${isToday ? "bg-red-900/20" : ""}`}>
                <div className={`text-xs mb-1 ${isToday ? "bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center" : "text-gray-400 px-1"}`}>
                  {day.getDate()}
                </div>
                {daySessions.map((s) => {
                  const colors: Record<string, string> = {
                    confirmee: "bg-red-900/30 text-red-800",
                    planifiee: "bg-gray-700 text-gray-300",
                    en_cours: "bg-yellow-900/30 text-yellow-300",
                    terminee: "bg-green-900/30 text-green-300",
                  };
                  return (
                    <div key={s.id} className={`rounded px-1 py-0.5 text-[10px] leading-tight truncate mb-0.5 ${colors[s.statut] || "bg-gray-700"}`}>
                      {s.formation.titre}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
