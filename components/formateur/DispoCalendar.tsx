"use client";

// Calendrier interactif des disponibilités formateur — adresse le cahier
// des charges §"Vue Formateur" :
// "Un calendrier interactif permettra au formateur de renseigner ses
//  créneaux de disponibilité et d'indisponibilité, facilitant ainsi
//  l'assignation aux sessions de formation."
//
// Implémentation custom avec date-fns (déjà dans le bundle, ~3kb pour les
// fonctions utilisées), pas de dépendance supplémentaire. Affichage mensuel
// avec navigation prev/next + clic-pour-ajouter.

import { useMemo, useState } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  addMonths,
  subMonths,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  isWithinInterval,
  startOfDay,
  endOfDay,
} from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type Dispo = {
  id: string;
  dateDebut: string;
  dateFin: string;
  type: string;
  notes: string | null;
};

interface Props {
  dispos: Dispo[];
  onAddSlot: (date: Date) => void;
  onDelete: (id: string) => void;
}

export function DispoCalendar({ dispos, onAddSlot, onDelete }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    // weekStartsOn 1 = lundi (France)
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [currentMonth]);

  const dispoByDay = useMemo(() => {
    // Map day-iso → Dispo[] qui couvrent ce jour
    const map = new Map<string, Dispo[]>();
    for (const d of dispos) {
      const start = startOfDay(parseISO(d.dateDebut));
      const end = endOfDay(parseISO(d.dateFin));
      for (const day of eachDayOfInterval({ start, end })) {
        if (isWithinInterval(day, { start, end })) {
          const key = format(day, "yyyy-MM-dd");
          const existing = map.get(key) ?? [];
          existing.push(d);
          map.set(key, existing);
        }
      }
    }
    return map;
  }, [dispos]);

  const weekDayLabels = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800 overflow-hidden">
      {/* Header navigation mois */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-900">
        <button
          onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
          className="p-1.5 rounded-md hover:bg-gray-700 text-gray-300"
          title="Mois précédent"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h3 className="text-sm font-semibold text-gray-200 capitalize">
          {format(currentMonth, "MMMM yyyy", { locale: fr })}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="text-xs text-gray-400 hover:text-gray-200 px-2 py-1 rounded hover:bg-gray-700"
          >
            Aujourd&apos;hui
          </button>
          <button
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
            className="p-1.5 rounded-md hover:bg-gray-700 text-gray-300"
            title="Mois suivant"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* En-têtes jours */}
      <div className="grid grid-cols-7 border-b border-gray-700 bg-gray-900">
        {weekDayLabels.map((d) => (
          <div key={d} className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase">
            {d}
          </div>
        ))}
      </div>

      {/* Grille des jours */}
      <div className="grid grid-cols-7 auto-rows-fr">
        {days.map((day) => {
          const dayKey = format(day, "yyyy-MM-dd");
          const dayDispos = dispoByDay.get(dayKey) ?? [];
          const inMonth = isSameMonth(day, currentMonth);
          const today = isToday(day);

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "min-h-[88px] border-b border-r border-gray-700 last:border-r-0 p-1.5 group relative",
                !inMonth && "bg-gray-900/50 text-gray-600",
                today && "bg-red-900/10",
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                    today ? "bg-red-600 text-white font-semibold" : "text-gray-300",
                    !inMonth && "text-gray-600",
                  )}
                >
                  {format(day, "d")}
                </span>
                {inMonth && (
                  <button
                    onClick={() => onAddSlot(day)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-gray-200"
                    title={`Ajouter un créneau le ${format(day, "d MMMM", { locale: fr })}`}
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                )}
              </div>
              <div className="space-y-1">
                {dayDispos.slice(0, 3).map((d) => (
                  <DispoBadge key={d.id} dispo={d} onDelete={onDelete} day={day} />
                ))}
                {dayDispos.length > 3 && (
                  <div className="text-xs text-gray-500 pl-1">+ {dayDispos.length - 3}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Légende */}
      <div className="px-4 py-3 border-t border-gray-700 bg-gray-900 flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded bg-green-900/40 border border-green-700" />
          <span className="text-gray-400">Disponible</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded bg-red-900/40 border border-red-700" />
          <span className="text-gray-400">Indisponible</span>
        </div>
        <div className="ml-auto text-gray-500">
          Survolez un jour puis cliquez sur + pour ajouter un créneau
        </div>
      </div>
    </div>
  );
}

function DispoBadge({ dispo, onDelete, day }: { dispo: Dispo; onDelete: (id: string) => void; day: Date }) {
  const isAvailable = dispo.type === "disponible";
  const start = parseISO(dispo.dateDebut);
  const isFirstDay = isSameDay(day, start);

  return (
    <div
      className={cn(
        "group/badge text-xs px-1.5 py-0.5 rounded truncate flex items-center gap-1",
        isAvailable
          ? "bg-green-900/40 text-green-300 border border-green-700"
          : "bg-red-900/40 text-red-300 border border-red-700",
      )}
      title={`${isAvailable ? "Disponible" : "Indisponible"} du ${format(start, "d/MM HH:mm", { locale: fr })} au ${format(parseISO(dispo.dateFin), "d/MM HH:mm", { locale: fr })}${dispo.notes ? ` — ${dispo.notes}` : ""}`}
    >
      <span className="truncate">{isFirstDay ? (dispo.notes || (isAvailable ? "Disponible" : "Indisponible")) : "…"}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (confirm("Supprimer ce créneau ?")) onDelete(dispo.id);
        }}
        className="opacity-0 group-hover/badge:opacity-100 ml-auto text-current hover:opacity-100"
        title="Supprimer"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}
