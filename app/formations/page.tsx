"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BookOpen, Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Download, Pencil, Trash2, LayoutGrid, List, ToggleLeft, ToggleRight, Star, Monitor, Video, Shuffle } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatutBadge } from "@/components/shared/StatutBadge";
import { Input } from "@/components/ui/input";
import { NIVEAUX_FORMATION, MODALITES_FORMATION, STATUTS_FORMATION } from "@/lib/constants";
import { formatCurrency, formatDuree } from "@/lib/utils";

interface Formation {
  id: string;
  titre: string;
  categorie: string | null;
  duree: number;
  tarif: number;
  niveau: string;
  actif: boolean;
  modalite: string;
  statut: string;
  certifiante: boolean;
  misEnAvant: boolean;
  _count: {
    sessions: number;
  };
}

const niveauColors: Record<string, string> = {
  tous: "bg-gray-700 text-gray-300 border-gray-700",
  debutant: "bg-green-900/30 text-green-400 border-green-700",
  intermediaire: "bg-red-900/30 text-red-400 border-red-700",
  avance: "bg-purple-900/30 text-purple-400 border-purple-200",
};

const modaliteIcons: Record<string, React.ReactNode> = {
  presentiel: <Monitor className="h-3.5 w-3.5" />,
  distanciel: <Video className="h-3.5 w-3.5" />,
  mixte: <Shuffle className="h-3.5 w-3.5" />,
};

type SortField = "titre" | "duree" | "tarif" | "createdAt";

export default function FormationsPage() {
  const [formations, setFormations] = useState<Formation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actifFilter, setActifFilter] = useState("");
  const [categorieFilter, setCategorieFilter] = useState("");
  const [niveauFilter, setNiveauFilter] = useState("");
  const [modaliteFilter, setModaliteFilter] = useState("");
  const [statutFilter, setStatutFilter] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, actifFilter, categorieFilter, niveauFilter, modaliteFilter, statutFilter]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (actifFilter !== "") params.set("actif", actifFilter);
    if (categorieFilter) params.set("categorie", categorieFilter);
    if (niveauFilter) params.set("niveau", niveauFilter);
    if (modaliteFilter) params.set("modalite", modaliteFilter);
    if (statutFilter) params.set("statut", statutFilter);
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
  }, [debouncedSearch, actifFilter, categorieFilter, niveauFilter, modaliteFilter, statutFilter, sortBy, sortOrder, page]);

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder(field === "titre" ? "asc" : "desc");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Supprimer cette formation ?")) return;
    try {
      const res = await fetch(`/api/formations/${id}`, { method: "DELETE" });
      if (res.ok) {
        setFormations((prev) => prev.filter((f) => f.id !== id));
        setTotal((prev) => prev - 1);
      }
    } catch {
      // silent fail
    }
  };

  const handleToggleActif = async (id: string, currentActif: boolean) => {
    try {
      const res = await fetch(`/api/formations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actif: !currentActif }),
      });
      if (res.ok) {
        setFormations((prev) =>
          prev.map((f) => (f.id === id ? { ...f, actif: !currentActif } : f))
        );
      }
    } catch {
      // silent fail
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortBy !== field) return <ChevronDown className="h-3 w-3 text-gray-300" />;
    return sortOrder === "asc"
      ? <ChevronUp className="h-3 w-3 text-red-600" />
      : <ChevronDown className="h-3 w-3 text-red-600" />;
  };

  const getNiveauLabel = (value: string) => {
    return NIVEAUX_FORMATION.find((n) => n.value === value)?.label ?? value;
  };

  const getModaliteInfo = (value: string) => {
    return MODALITES_FORMATION[value as keyof typeof MODALITES_FORMATION];
  };

  const getStatutInfo = (value: string) => {
    return STATUTS_FORMATION[value as keyof typeof STATUTS_FORMATION];
  };

  const hasFilters = search || actifFilter || categorieFilter || niveauFilter || modaliteFilter || statutFilter;

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
          className="inline-flex items-center gap-2 rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors"
        >
          <Download className="h-4 w-4" />
          Exporter CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
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
            value={modaliteFilter}
            onChange={(e) => setModaliteFilter(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Toutes les modalités</option>
            {Object.entries(MODALITES_FORMATION).map(([value, { label }]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={statutFilter}
            onChange={(e) => setStatutFilter(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Tous les statuts</option>
            {Object.entries(STATUTS_FORMATION).map(([value, { label }]) => (
              <option key={value} value={value}>{label}</option>
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
              onClick={() => { setSearch(""); setActifFilter(""); setCategorieFilter(""); setNiveauFilter(""); setModaliteFilter(""); setStatutFilter(""); }}
              className="h-10 px-3 text-sm text-gray-400 hover:text-gray-300 hover:bg-gray-700 rounded-md transition-colors"
            >
              Effacer filtres
            </button>
          )}

          {/* Grid/List toggle */}
          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={() => setViewMode("list")}
              className={`h-10 w-10 inline-flex items-center justify-center rounded-md transition-colors ${
                viewMode === "list"
                  ? "bg-gray-700 text-gray-100"
                  : "text-gray-400 hover:text-gray-300 hover:bg-gray-700"
              }`}
              title="Vue liste"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`h-10 w-10 inline-flex items-center justify-center rounded-md transition-colors ${
                viewMode === "grid"
                  ? "bg-gray-700 text-gray-100"
                  : "text-gray-400 hover:text-gray-300 hover:bg-gray-700"
              }`}
              title="Vue grille"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
        </div>
      ) : formations.length === 0 ? (
        <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-sm">
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
        </div>
      ) : viewMode === "list" ? (
        /* Table view */
        <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-sm overflow-x-auto">
          <table className="min-w-[640px] w-full divide-y divide-gray-200">
            <thead className="bg-gray-900">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-700 select-none"
                  onClick={() => handleSort("titre")}
                >
                  <span className="inline-flex items-center gap-1">
                    Titre <SortIcon field="titre" />
                  </span>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider hidden sm:table-cell">
                  Catégorie
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Modalité
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-700 select-none"
                  onClick={() => handleSort("duree")}
                >
                  <span className="inline-flex items-center gap-1">
                    Durée <SortIcon field="duree" />
                  </span>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-700 select-none"
                  onClick={() => handleSort("tarif")}
                >
                  <span className="inline-flex items-center gap-1">
                    Tarif <SortIcon field="tarif" />
                  </span>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Niveau
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider hidden sm:table-cell">
                  Sessions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider hidden sm:table-cell">
                  Statut
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-200">
              {formations.map((formation) => {
                const niveauLabel = getNiveauLabel(formation.niveau);
                const niveauColor = niveauColors[formation.niveau] ?? "bg-gray-700 text-gray-300 border-gray-700";
                const modaliteInfo = getModaliteInfo(formation.modalite);
                const statutInfo = getStatutInfo(formation.statut);
                return (
                  <tr key={formation.id} className="hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {formation.misEnAvant && <Star className="h-3.5 w-3.5 text-amber-400 shrink-0" />}
                        <Link
                          href={`/formations/${formation.id}`}
                          className="text-sm font-medium text-red-600 hover:text-red-800 hover:underline"
                        >
                          {formation.titre}
                        </Link>
                        {formation.certifiante && (
                          <span className="inline-flex items-center rounded-full bg-amber-900/30 text-amber-400 border border-amber-700 px-1.5 py-0.5 text-[10px] font-medium">
                            CERT
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 hidden sm:table-cell">
                      {formation.categorie || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {modaliteInfo && (
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${modaliteInfo.color}`}>
                          {modaliteIcons[formation.modalite]}
                          {modaliteInfo.label}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {formatDuree(formation.duree)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-100">
                      {formatCurrency(formation.tarif)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatutBadge label={niveauLabel} color={niveauColor} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                      <span className="inline-flex items-center rounded-full bg-gray-700 px-2.5 py-0.5 text-xs font-medium text-gray-300">
                        {formation._count.sessions} session{formation._count.sessions !== 1 ? "s" : ""}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                      <div className="flex items-center gap-1.5">
                        {statutInfo && (
                          <StatutBadge label={statutInfo.label} color={statutInfo.color} />
                        )}
                        {!formation.actif && (
                          <span className="inline-flex items-center rounded-full border bg-gray-700 text-gray-400 border-gray-700 px-2 py-0.5 text-[10px] font-medium">
                            OFF
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="inline-flex items-center gap-1">
                        <Link
                          href={`/formations/${formation.id}/modifier`}
                          className="inline-flex items-center justify-center h-8 w-8 rounded-md text-gray-400 hover:text-gray-100 hover:bg-gray-600 transition-colors"
                          title="Modifier"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleToggleActif(formation.id, formation.actif)}
                          className="inline-flex items-center justify-center h-8 w-8 rounded-md text-gray-400 hover:text-gray-100 hover:bg-gray-600 transition-colors"
                          title={formation.actif ? "Désactiver" : "Activer"}
                        >
                          {formation.actif ? (
                            <ToggleRight className="h-4 w-4 text-green-400" />
                          ) : (
                            <ToggleLeft className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(formation.id)}
                          className="inline-flex items-center justify-center h-8 w-8 rounded-md text-gray-400 hover:text-red-400 hover:bg-gray-600 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Grid view */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {formations.map((formation) => {
            const niveauLabel = getNiveauLabel(formation.niveau);
            const niveauColor = niveauColors[formation.niveau] ?? "bg-gray-700 text-gray-300 border-gray-700";
            const modaliteInfo = getModaliteInfo(formation.modalite);
            const statutInfo = getStatutInfo(formation.statut);
            return (
              <div
                key={formation.id}
                className={`bg-gray-800 rounded-lg border shadow-sm p-5 flex flex-col gap-3 hover:border-gray-600 transition-colors ${
                  formation.misEnAvant ? "border-amber-700/50" : "border-gray-700"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {formation.misEnAvant && <Star className="h-3.5 w-3.5 text-amber-400 shrink-0" />}
                    <Link
                      href={`/formations/${formation.id}`}
                      className="text-sm font-medium text-red-600 hover:text-red-800 hover:underline line-clamp-2"
                    >
                      {formation.titre}
                    </Link>
                  </div>
                  {statutInfo && (
                    <StatutBadge label={statutInfo.label} color={statutInfo.color} />
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {formation.categorie && (
                    <span className="inline-flex items-center rounded-full bg-gray-700 text-gray-300 border border-gray-600 px-2.5 py-0.5 text-xs font-medium">
                      {formation.categorie}
                    </span>
                  )}
                  <StatutBadge label={niveauLabel} color={niveauColor} />
                  {modaliteInfo && (
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${modaliteInfo.color}`}>
                      {modaliteIcons[formation.modalite]}
                      {modaliteInfo.label}
                    </span>
                  )}
                  {formation.certifiante && (
                    <span className="inline-flex items-center rounded-full bg-amber-900/30 text-amber-400 border border-amber-700 px-2 py-0.5 text-xs font-medium">
                      Certifiante
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <span>{formatDuree(formation.duree)}</span>
                  <span className="font-medium text-gray-100">{formatCurrency(formation.tarif)}</span>
                </div>

                <div>
                  <span className="inline-flex items-center rounded-full bg-gray-700 px-2.5 py-0.5 text-xs font-medium text-gray-300">
                    {formation._count.sessions} session{formation._count.sessions !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className="flex items-center gap-1 mt-auto pt-2 border-t border-gray-700">
                  <Link
                    href={`/formations/${formation.id}/modifier`}
                    className="inline-flex items-center justify-center h-8 w-8 rounded-md text-gray-400 hover:text-gray-100 hover:bg-gray-600 transition-colors"
                    title="Modifier"
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => handleToggleActif(formation.id, formation.actif)}
                    className="inline-flex items-center justify-center h-8 w-8 rounded-md text-gray-400 hover:text-gray-100 hover:bg-gray-600 transition-colors"
                    title={formation.actif ? "Désactiver" : "Activer"}
                  >
                    {formation.actif ? (
                      <ToggleRight className="h-4 w-4 text-green-400" />
                    ) : (
                      <ToggleLeft className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(formation.id)}
                    className="inline-flex items-center justify-center h-8 w-8 rounded-md text-gray-400 hover:text-red-400 hover:bg-gray-600 transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && formations.length > 0 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-400">
            {total} formation{total > 1 ? "s" : ""} au total
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" /> Précédent
              </button>
              <span className="text-sm text-gray-400">
                Page {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
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
