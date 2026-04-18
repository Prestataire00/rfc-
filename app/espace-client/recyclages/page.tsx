"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Clock, CheckCircle2, ShieldAlert, RefreshCw } from "lucide-react";

type Recyclage = {
  id: string;
  contact: { id: string; nom: string; prenom: string; email: string };
  formation: { id: string; titre: string; dureeRecyclage: number | null; categorie: string | null };
  dateObtention: string;
  dateExpiration: string | null;
  statut: string;
  joursRestants: number | null;
};

const STATUT_STYLES: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  expire: { icon: AlertTriangle, color: "text-red-400", bg: "bg-red-900/30 border-red-700", label: "Expire" },
  a_recycler: { icon: Clock, color: "text-amber-400", bg: "bg-amber-900/30 border-amber-700", label: "A recycler" },
  valide: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-900/30 border-emerald-700", label: "Valide" },
  en_cours_recyclage: { icon: RefreshCw, color: "text-blue-400", bg: "bg-blue-900/30 border-blue-700", label: "En cours" },
};

export default function RecyclagesPage() {
  const [recyclages, setRecyclages] = useState<Recyclage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "expire" | "a_recycler" | "valide">("all");

  useEffect(() => {
    fetch("/api/client/recyclages").then((r) => r.ok ? r.json() : []).then((d) => {
      setRecyclages(Array.isArray(d) ? d : []);
      setLoading(false);
    });
  }, []);

  const filtered = filter === "all" ? recyclages : recyclages.filter((r) => r.statut === filter);
  const expireCount = recyclages.filter((r) => r.statut === "expire").length;
  const aRecyclerCount = recyclages.filter((r) => r.statut === "a_recycler").length;

  if (loading) {
    return <div className="flex justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" /></div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-red-500" /> Suivi des recyclages
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Certifications de vos salaries et dates de recyclage obligatoires.
        </p>
      </div>

      {/* Alertes */}
      {(expireCount > 0 || aRecyclerCount > 0) && (
        <div className="rounded-lg bg-red-900/20 border border-red-700 p-4 mb-6">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
            <div>
              {expireCount > 0 && (
                <p className="text-sm text-red-300 font-medium">
                  {expireCount} certification{expireCount > 1 ? "s" : ""} expiree{expireCount > 1 ? "s" : ""}
                </p>
              )}
              {aRecyclerCount > 0 && (
                <p className="text-sm text-amber-300">
                  {aRecyclerCount} certification{aRecyclerCount > 1 ? "s" : ""} a recycler dans les 60 prochains jours
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="flex gap-2 mb-4">
        {[
          { value: "all" as const, label: "Tous", count: recyclages.length },
          { value: "expire" as const, label: "Expires", count: expireCount },
          { value: "a_recycler" as const, label: "A recycler", count: aRecyclerCount },
          { value: "valide" as const, label: "Valides", count: recyclages.filter((r) => r.statut === "valide").length },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
              filter === f.value
                ? "bg-red-900/30 border-red-700 text-red-300"
                : "bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700"
            }`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-600 bg-gray-800/50 p-12 text-center">
          <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto mb-3" />
          <p className="text-gray-400">Aucune certification {filter !== "all" ? `avec le statut "${filter}"` : "trouvee"}.</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-gray-800 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 border-b border-gray-700">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-400">Salarie</th>
                <th className="text-left px-4 py-3 font-medium text-gray-400">Formation</th>
                <th className="text-left px-4 py-3 font-medium text-gray-400">Obtenue le</th>
                <th className="text-left px-4 py-3 font-medium text-gray-400">Expire le</th>
                <th className="text-left px-4 py-3 font-medium text-gray-400">Statut</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const style = STATUT_STYLES[r.statut] || STATUT_STYLES.valide;
                const Icon = style.icon;
                return (
                  <tr key={r.id} className="border-b border-gray-700 last:border-0 hover:bg-gray-700/30">
                    <td className="px-4 py-3 font-medium text-gray-200">{r.contact.prenom} {r.contact.nom}</td>
                    <td className="px-4 py-3 text-gray-300">{r.formation.titre}</td>
                    <td className="px-4 py-3 text-gray-400">
                      {new Date(r.dateObtention).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {r.dateExpiration ? new Date(r.dateExpiration).toLocaleDateString("fr-FR") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${style.bg} ${style.color}`}>
                        <Icon className="h-3 w-3" />
                        {style.label}
                        {r.joursRestants !== null && r.joursRestants > 0 && r.statut !== "valide" && (
                          <span className="ml-0.5">({r.joursRestants}j)</span>
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
