"use client";

import { CheckCircle2, XCircle, Clock, ShieldAlert, LogOut } from "lucide-react";

export const STATUTS = [
  { value: "present", label: "Present", icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-900/30 border-emerald-700" },
  { value: "absent", label: "Absent", icon: XCircle, color: "text-red-400", bg: "bg-red-900/30 border-red-700" },
  { value: "en_retard", label: "En retard", icon: Clock, color: "text-amber-400", bg: "bg-amber-900/30 border-amber-700" },
  { value: "excuse", label: "Excuse", icon: ShieldAlert, color: "text-blue-400", bg: "bg-blue-900/30 border-blue-700" },
  { value: "depart_anticipe", label: "Depart anticipe", icon: LogOut, color: "text-orange-400", bg: "bg-orange-900/30 border-orange-700" },
] as const;

export type PresenceStatut = (typeof STATUTS)[number]["value"];

type Props = {
  value: PresenceStatut | null;
  onChange: (statut: PresenceStatut) => void;
  retardMinutes?: number;
  departMinutes?: number;
  onRetardChange?: (minutes: number) => void;
  onDepartChange?: (minutes: number) => void;
  disabled?: boolean;
  compact?: boolean;
};

export function StatutSelector({
  value,
  onChange,
  retardMinutes,
  departMinutes,
  onRetardChange,
  onDepartChange,
  disabled = false,
  compact = false,
}: Props) {
  return (
    <div>
      <div className={`flex ${compact ? "gap-1" : "gap-2"} flex-wrap`}>
        {STATUTS.map((s) => {
          const Icon = s.icon;
          const selected = value === s.value;
          return (
            <button
              key={s.value}
              type="button"
              onClick={() => !disabled && onChange(s.value)}
              disabled={disabled}
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                selected
                  ? `${s.bg} ${s.color}`
                  : "border-gray-600 bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
              title={s.label}
            >
              <Icon className={`${compact ? "h-3 w-3" : "h-3.5 w-3.5"}`} />
              {!compact && s.label}
            </button>
          );
        })}
      </div>

      {/* Champ conditionnel : retard minutes */}
      {value === "en_retard" && onRetardChange && (
        <div className="mt-2 flex items-center gap-2">
          <label className="text-xs text-gray-400">Retard :</label>
          <input
            type="number"
            min={1}
            max={120}
            value={retardMinutes || ""}
            onChange={(e) => onRetardChange(parseInt(e.target.value) || 0)}
            disabled={disabled}
            className="h-7 w-16 rounded-md border border-gray-600 bg-gray-900 px-2 text-xs text-gray-200"
            placeholder="min"
          />
          <span className="text-xs text-gray-500">minutes</span>
        </div>
      )}

      {/* Champ conditionnel : depart anticipe minutes */}
      {value === "depart_anticipe" && onDepartChange && (
        <div className="mt-2 flex items-center gap-2">
          <label className="text-xs text-gray-400">Parti :</label>
          <input
            type="number"
            min={1}
            max={240}
            value={departMinutes || ""}
            onChange={(e) => onDepartChange(parseInt(e.target.value) || 0)}
            disabled={disabled}
            className="h-7 w-16 rounded-md border border-gray-600 bg-gray-900 px-2 text-xs text-gray-200"
            placeholder="min"
          />
          <span className="text-xs text-gray-500">min avant la fin</span>
        </div>
      )}
    </div>
  );
}

// Helper : badge compact pour affichage dans les grilles
export function StatutBadge({ statut, retardMinutes, departMinutes }: { statut: string | null; retardMinutes?: number | null; departMinutes?: number | null }) {
  if (!statut) return <span className="text-xs text-gray-600">—</span>;
  const s = STATUTS.find((st) => st.value === statut);
  if (!s) return <span className="text-xs text-gray-400">{statut}</span>;
  const Icon = s.icon;
  const extra =
    statut === "en_retard" && retardMinutes ? ` (${retardMinutes}min)` : statut === "depart_anticipe" && departMinutes ? ` (-${departMinutes}min)` : "";
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${s.color}`} title={s.label + extra}>
      <Icon className="h-3 w-3" />
      {extra}
    </span>
  );
}
