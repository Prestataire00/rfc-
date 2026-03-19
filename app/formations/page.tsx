"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BookOpen, Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Download } from "lucide-react";
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

type SortField = "titre" | "duree" | "tarif" | "createdAt";

export default function FormationsPage() {
  const [formations, setFormations] = useState<Formation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actifFilter, setActifFilter] = useState("");
  const [categorieFilter, setCategorieFilter] = useState("");
  const [niveauFilter, setNiveauFilter] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, actifFilter, categorieFilter, niveauFilter]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (actifFilter !== "") params.set("actif", actifFilter);
    if (categorieFilter) params.set("categorie", categorieFilter);
    if (niveauFilter) params.set("niveau", niveauFilter);
    params.set("sortBy", sortBy);
    params.set("sortOrder", sortOrder);
    params.set("page", String(page));
    params.set("limit", "20");

    setLoading(true);
    fetch(`/api/formations?${params.toString()}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data: any) => {
        if (!data) return;
        setFormations(Array.isArray(data.formations) ? data.formations : []);
        setTotalPages(data.totalPages || 1);
        setTotal(data.total || 0);
        if (data.categories) setCategories(data.categories);
      })
      .catch(() => setFormations([]))
      .finally(() => setLoading(false));
  }, [debouncedSearch, actifFilter, categorieFilter, niveauFilter, sortBy, sortOrder, page]);

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder(field === "titre" ? "asc" : "desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortBy !== field) return <ChevronDown className="h-3 w-3 text-gray-300" />;
    return sortOrder === "asc"
      ? <ChevronUp className="h-3 w-3 text-blue-600" />
      : <ChevronDown className="h-3 w-3 text-blue-600" />;
  };

  const getNiveauLabel = (value: string) => {
    return NIVEAUX_FORMATION.find((n) => n.value === value)?.label ?? value;
  };

  const hasFilters = search || actifFilter || categorieFilter || niveauFilter;

  return (
    <div className="p-6">
      <PageHeader
        title="Formations"
        description="Gérez votre catalogue de formations"
        actionLabel="Nouvelle formation"
        actionHref="/formations/nouveau"
      />

      {/* Export button */}
      <div className="flex justify-end mb-4 -mt-4">
        <button
          onClick={() => window.open("/api/export/formations", "_blank")}
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Download className="h-4 w-4" />
          Exporter CSV
        </button>
      </div>

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
          value={categorieFilter}
          onChange={(e) => setCategorieFilter(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Toutes les catégories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <select
          value={niveauFilter}
          onChange={(e) => setNiveauFilter(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Tous les niveaux</option>
          {NIVEAUX_FORMATION.map((n) => (
            <option key={n.value} value={n.value}>{n.label}</option>
          ))}
        </select>
        <select
          value={actifFilter}
          onChange={(e) => setActifFilter(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Actives & inactives</option>
          <option value="true">Actives uniquement</option>
          <option value="false">Inactives uniquement</option>
        </select>
        {hasFilters && (
          <button
            onClick={() => { setSearch(""); setActifFilter(""); setCategorieFilter(""); setNiveauFilter(""); }}
            className="h-10 px-3 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            Effacer filtres
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
        ) : formations.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Aucune formation trouvée"
            description={
              hasFilters
                ? "Aucune formation ne correspond à votre recherche."
                : "Commencez par créer votre première formation."
            }
            actionLabel={hasFilters ? undefined : "Nouvelle formation"}
            actionHref={hasFilters ? undefined : "/formations/nouveau"}
          />
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort("titre")}
                >
                  <span className="inline-flex items-center gap-1">
                    Titre <SortIcon field="titre" />
                  </span>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Catégorie
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort("duree")}
                >
                  <span className="inline-flex items-center gap-1">
                    Durée <SortIcon field="duree" />
                  </span>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort("tarif")}
                >
                  <span className="inline-flex items-center gap-1">
                    Tarif <SortIcon field="tarif" />
                  </span>
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

      {/* Pagination */}
      {!loading && formations.length > 0 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">
            {total} formation{total > 1 ? "s" : ""} au total
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" /> Précédent
              </button>
              <span className="text-sm text-gray-600">
                Page {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                Suivant <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
