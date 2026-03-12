"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BookOpen, Search } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatutBadge } from "@/components/shared/StatutBadge";
import { Input } from "@/components/ui/input";
import { NIVEAUX_FORMATION } from "@/lib/constants";
import { formatCurrency, formatDuree } from "@/lib/utils";

interface Formation {
  id: string;
  titre: string;
  categorie: string | null;
  duree: number;
  tarif: number;
  niveau: string;
  actif: boolean;
  _count: {
    sessions: number;
  };
}

const niveauColors: Record<string, string> = {
  tous: "bg-gray-100 text-gray-700 border-gray-200",
  debutant: "bg-green-100 text-green-700 border-green-200",
  intermediaire: "bg-blue-100 text-blue-700 border-blue-200",
  avance: "bg-purple-100 text-purple-700 border-purple-200",
};

export default function FormationsPage() {
  const [formations, setFormations] = useState<Formation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actifFilter, setActifFilter] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (actifFilter !== "") params.set("actif", actifFilter);

    setLoading(true);
    fetch(`/api/formations?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => setFormations(Array.isArray(data) ? data : []))
      .catch(() => setFormations([]))
      .finally(() => setLoading(false));
  }, [debouncedSearch, actifFilter]);

  const getNiveauLabel = (value: string) => {
    return NIVEAUX_FORMATION.find((n) => n.value === value)?.label ?? value;
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Formations"
        description="Gérez votre catalogue de formations"
        actionLabel="Nouvelle formation"
        actionHref="/formations/nouveau"
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Rechercher une formation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={actifFilter}
          onChange={(e) => setActifFilter(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Toutes les formations</option>
          <option value="true">Actives uniquement</option>
          <option value="false">Inactives uniquement</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
        ) : formations.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Aucune formation trouvée"
            description={
              search || actifFilter
                ? "Aucune formation ne correspond à votre recherche."
                : "Commencez par créer votre première formation."
            }
            actionLabel={search || actifFilter ? undefined : "Nouvelle formation"}
            actionHref={search || actifFilter ? undefined : "/formations/nouveau"}
          />
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Titre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Catégorie
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Durée
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tarif
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Niveau
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sessions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {formations.map((formation) => {
                const niveauLabel = getNiveauLabel(formation.niveau);
                const niveauColor = niveauColors[formation.niveau] ?? "bg-gray-100 text-gray-700 border-gray-200";
                return (
                  <tr key={formation.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <Link
                        href={`/formations/${formation.id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {formation.titre}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formation.categorie || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDuree(formation.duree)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(formation.tarif)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatutBadge label={niveauLabel} color={niveauColor} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                        {formation._count.sessions} session{formation._count.sessions !== 1 ? "s" : ""}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {formation.actif ? (
                        <span className="inline-flex items-center rounded-full border bg-green-100 text-green-700 border-green-200 px-2.5 py-0.5 text-xs font-medium">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border bg-gray-100 text-gray-500 border-gray-200 px-2.5 py-0.5 text-xs font-medium">
                          Inactive
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {!loading && formations.length > 0 && (
        <p className="text-sm text-gray-500 mt-3">
          {formations.length} formation{formations.length > 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
