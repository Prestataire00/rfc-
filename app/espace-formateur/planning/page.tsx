"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatDate } from "@/lib/utils";

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
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    fetch("/api/formateur/mes-sessions")
      .then((r) => r.ok ? r.json() : [])
      .then((d) => { setSessions(d); setLoading(false); });
  }, []);

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

      <div className="rounded-lg border bg-white overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <button onClick={prevMonth} className="rounded-md border p-2 hover:bg-gray-50"><ChevronLeft className="h-4 w-4" /></button>
          <h2 className="text-lg font-semibold text-gray-900">{MOIS[month]} {year}</h2>
          <button onClick={nextMonth} className="rounded-md border p-2 hover:bg-gray-50"><ChevronRight className="h-4 w-4" /></button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b">
          {JOURS.map((j) => (
            <div key={j} className="px-2 py-2 text-center text-xs font-medium text-gray-500 bg-gray-50">{j}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {days.map((day, idx) => {
            if (!day) return <div key={idx} className="min-h-[80px] border-b border-r bg-gray-50" />;

            const isToday = day.toDateString() === today.toDateString();
            const daySessions = sessions.filter((s) => isInRange(day, s.dateDebut, s.dateFin));

            return (
              <div key={idx} className={`min-h-[80px] border-b border-r p-1 ${isToday ? "bg-blue-50" : ""}`}>
                <div className={`text-xs mb-1 ${isToday ? "bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center" : "text-gray-500 px-1"}`}>
                  {day.getDate()}
                </div>
                {daySessions.map((s) => {
                  const colors: Record<string, string> = {
                    confirmee: "bg-blue-100 text-blue-800",
                    planifiee: "bg-gray-100 text-gray-700",
                    en_cours: "bg-yellow-100 text-yellow-800",
                    terminee: "bg-green-100 text-green-800",
                  };
                  return (
                    <div key={s.id} className={`rounded px-1 py-0.5 text-[10px] leading-tight truncate mb-0.5 ${colors[s.statut] || "bg-gray-100"}`}>
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
