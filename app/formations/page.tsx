"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BookOpen, Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  Download, Pencil, Trash2, LayoutGrid, List, ToggleLeft, ToggleRight,
  Star, Monitor, Video, Shuffle, Clock, Award, Euro, Users, FileText,
  CheckCircle2, AlertCircle, Archive,
} from "lucide-react";
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
  image: string | null;
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

// Images par defaut basees sur les mots-cles du titre/categorie
const IMAGE_KEYWORDS: { keywords: string[]; url: string }[] = [
  {
    keywords: ["sst", "secouriste", "secourisme", "premiers secours", "sante"],
    url: "https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?w=600&h=400&fit=crop",
  },
  {
    keywords: ["incendie", "feu", "extincteur", "evacuation", "epi"],
    url: "https://images.unsplash.com/photo-1486551937199-baf066858de7?w=600&h=400&fit=crop",
  },
  {
    keywords: ["habilitation", "electrique", "electricite", "electr"],
    url: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=600&h=400&fit=crop",
  },
  {
    keywords: ["hauteur", "travail en hauteur", "echafaudage", "nacelle", "caces"],
    url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&h=400&fit=crop",
  },
  {
    keywords: ["securite", "prevention", "risque", "danger", "epi", "protection"],
    url: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=600&h=400&fit=crop",
  },
  {
    keywords: ["geste", "posture", "ergonomie", "prap", "tms"],
    url: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&h=400&fit=crop",
  },
  {
    keywords: ["chimique", "amiante", "biologique", "atex"],
    url: "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=600&h=400&fit=crop",
  },
  {
    keywords: ["management", "encadrement", "equipe", "leadership"],
    url: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=400&fit=crop",
  },
  {
    keywords: ["psc1", "pse", "defibrillateur", "dae", "arret cardiaque", "massage", "rcp"],
    url: "https://images.unsplash.com/photo-1631815589968-fdb09a223b1e?w=600&h=400&fit=crop",
  },
  {
    keywords: ["ssiap", "agent", "surveillance"],
    url: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&h=400&fit=crop",
  },
  {
    keywords: ["hygiene", "alimentaire", "haccp", "proprete"],
    url: "https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=600&h=400&fit=crop",
  },
  {
    keywords: ["formation", "pedagogie", "formateur"],
    url: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=600&h=400&fit=crop",
  },
];

const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&h=400&fit=crop";

function getFormationImage(formation: Formation): string {
  if (formation.image) return formation.image;
  const searchText = `${formation.titre} ${formation.categorie || ""}`.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const entry of IMAGE_KEYWORDS) {
    if (entry.keywords.some((kw) => searchText.includes(kw))) {
      return entry.url;
    }
  }
  return DEFAULT_IMAGE;
}

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
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");

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
    } catch { /* silent */ }
  };

  const handleToggleActif = async (id: string, currentActif: boolean) => {
    try {
      const res = await fetch(`/api/formations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actif: !currentActif }),
      });
      if (res.ok) {
        setFormations((prev) => prev.map((f) => (f.id === id ? { ...f, actif: !currentActif } : f)));
      }
    } catch { /* silent */ }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortBy !== field) return <ChevronDown className="h-3 w-3 text-gray-300" />;
    return sortOrder === "asc" ? <ChevronUp className="h-3 w-3 text-red-600" /> : <ChevronDown className="h-3 w-3 text-red-600" />;
  };

  const getNiveauLabel = (value: string) => NIVEAUX_FORMATION.find((n) => n.value === value)?.label ?? value;
  const getModaliteInfo = (value: string) => MODALITES_FORMATION[value as keyof typeof MODALITES_FORMATION];
  const getStatutInfo = (value: string) => STATUTS_FORMATION[value as keyof typeof STATUTS_FORMATION];
  const hasFilters = search || actifFilter || categorieFilter || niveauFilter || modaliteFilter || statutFilter;

  // Stats
  const nbPubliees = formations.filter((f) => f.statut === "publiee").length;
  const nbBrouillons = formations.filter((f) => f.statut === "brouillon").length;
  const nbActives = formations.filter((f) => f.actif).length;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Formations</h1>
          <p className="text-sm text-gray-400 mt-1">Catalogue des formations</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/formations/nouveau"
            className="inline-flex items-center gap-2 rounded-md bg-red-600 hover:bg-red-700 px-4 py-2 text-sm font-medium text-white transition-colors"
          >
            <BookOpen className="h-4 w-4" /> Nouvelle formation
          </Link>
          <button
            onClick={() => window.open("/api/export/formations", "_blank")}
            className="inline-flex items-center gap-2 rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors"
          >
            <Download className="h-4 w-4" /> Catalogue PDF
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-red-900/30 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-100">{total}</p>
              <p className="text-xs text-gray-400">Formations totales</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-900/30 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-100">{nbPubliees}</p>
              <p className="text-xs text-gray-400">Publiees</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-900/30 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-100">{nbBrouillons}</p>
              <p className="text-xs text-gray-400">Brouillons</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-900/30 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-100">{nbActives}</p>
              <p className="text-xs text-gray-400">Actives</p>
            </div>
          </div>
        </div>
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
          <select value={categorieFilter} onChange={(e) => setCategorieFilter(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <option value="">Toutes les categories</option>
            {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <select value={niveauFilter} onChange={(e) => setNiveauFilter(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <option value="">Tous les niveaux</option>
            {NIVEAUX_FORMATION.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
          </select>
          <select value={modaliteFilter} onChange={(e) => setModaliteFilter(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <option value="">Toutes les modalites</option>
            {Object.entries(MODALITES_FORMATION).map(([value, { label }]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <select value={statutFilter} onChange={(e) => setStatutFilter(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <option value="">Tous les statuts</option>
            {Object.entries(STATUTS_FORMATION).map(([value, { label }]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select value={actifFilter} onChange={(e) => setActifFilter(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <option value="">Actives & inactives</option>
            <option value="true">Actives uniquement</option>
            <option value="false">Inactives uniquement</option>
          </select>
          {hasFilters && (
            <button onClick={() => { setSearch(""); setActifFilter(""); setCategorieFilter(""); setNiveauFilter(""); setModaliteFilter(""); setStatutFilter(""); }} className="h-10 px-3 text-sm text-gray-400 hover:text-gray-300 hover:bg-gray-700 rounded-md transition-colors">
              Effacer filtres
            </button>
          )}
          <div className="flex items-center gap-1 ml-auto">
            <button onClick={() => setViewMode("list")} className={`h-10 w-10 inline-flex items-center justify-center rounded-md transition-colors ${viewMode === "list" ? "bg-gray-700 text-gray-100" : "text-gray-400 hover:text-gray-300 hover:bg-gray-700"}`} title="Vue liste">
              <List className="h-4 w-4" />
            </button>
            <button onClick={() => setViewMode("grid")} className={`h-10 w-10 inline-flex items-center justify-center rounded-md transition-colors ${viewMode === "grid" ? "bg-gray-700 text-gray-100" : "text-gray-400 hover:text-gray-300 hover:bg-gray-700"}`} title="Vue grille">
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
            title="Aucune formation trouvee"
            description={hasFilters ? "Aucune formation ne correspond a votre recherche." : "Commencez par creer votre premiere formation."}
            actionLabel={hasFilters ? undefined : "Nouvelle formation"}
            actionHref={hasFilters ? undefined : "/formations/nouveau"}
          />
        </div>
      ) : viewMode === "list" ? (
        /* ===== TABLE VIEW ===== */
        <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-sm overflow-x-auto">
          <table className="min-w-[640px] w-full divide-y divide-gray-200">
            <thead className="bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-700 select-none" onClick={() => handleSort("titre")}>
                  <span className="inline-flex items-center gap-1">Titre <SortIcon field="titre" /></span>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider hidden sm:table-cell">Categorie</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Modalite</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-700 select-none" onClick={() => handleSort("duree")}>
                  <span className="inline-flex items-center gap-1">Duree <SortIcon field="duree" /></span>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-700 select-none" onClick={() => handleSort("tarif")}>
                  <span className="inline-flex items-center gap-1">Tarif <SortIcon field="tarif" /></span>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Niveau</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider hidden sm:table-cell">Sessions</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider hidden sm:table-cell">Statut</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
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
                      <div className="flex items-center gap-3">
                        <img src={getFormationImage(formation)} alt="" className="h-10 w-14 rounded object-cover shrink-0" />
                        <div className="flex items-center gap-2 min-w-0">
                          {formation.misEnAvant && <Star className="h-3.5 w-3.5 text-amber-400 shrink-0" />}
                          <Link href={`/formations/${formation.id}`} className="text-sm font-medium text-red-600 hover:text-red-800 hover:underline truncate">
                            {formation.titre}
                          </Link>
                          {formation.certifiante && (
                            <span className="inline-flex items-center rounded-full bg-amber-900/30 text-amber-400 border border-amber-700 px-1.5 py-0.5 text-[10px] font-medium shrink-0">CERT</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 hidden sm:table-cell">{formation.categorie || "—"}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {modaliteInfo && (
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${modaliteInfo.color}`}>
                          {modaliteIcons[formation.modalite]} {modaliteInfo.label}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{formatDuree(formation.duree)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-100">{formatCurrency(formation.tarif)}</td>
                    <td className="px-6 py-4 whitespace-nowrap"><StatutBadge label={niveauLabel} color={niveauColor} /></td>
                    <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                      <span className="inline-flex items-center rounded-full bg-gray-700 px-2.5 py-0.5 text-xs font-medium text-gray-300">
                        {formation._count.sessions} session{formation._count.sessions !== 1 ? "s" : ""}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                      <div className="flex items-center gap-1.5">
                        {statutInfo && <StatutBadge label={statutInfo.label} color={statutInfo.color} />}
                        {!formation.actif && <span className="inline-flex items-center rounded-full border bg-gray-700 text-gray-400 border-gray-700 px-2 py-0.5 text-[10px] font-medium">OFF</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="inline-flex items-center gap-1">
                        <Link href={`/formations/${formation.id}/modifier`} className="inline-flex items-center justify-center h-8 w-8 rounded-md text-gray-400 hover:text-gray-100 hover:bg-gray-600 transition-colors" title="Modifier">
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <button onClick={() => handleToggleActif(formation.id, formation.actif)} className="inline-flex items-center justify-center h-8 w-8 rounded-md text-gray-400 hover:text-gray-100 hover:bg-gray-600 transition-colors" title={formation.actif ? "Desactiver" : "Activer"}>
                          {formation.actif ? <ToggleRight className="h-4 w-4 text-green-400" /> : <ToggleLeft className="h-4 w-4" />}
                        </button>
                        <button onClick={() => handleDelete(formation.id)} className="inline-flex items-center justify-center h-8 w-8 rounded-md text-gray-400 hover:text-red-400 hover:bg-gray-600 transition-colors" title="Supprimer">
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
        /* ===== GRID VIEW - SoSafe style ===== */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {formations.map((formation) => {
            const niveauLabel = getNiveauLabel(formation.niveau);
            const modaliteInfo = getModaliteInfo(formation.modalite);
            const imgUrl = getFormationImage(formation);

            return (
              <Link
                key={formation.id}
                href={`/formations/${formation.id}`}
                className={`bg-gray-800 rounded-xl border shadow-sm overflow-hidden hover:border-gray-500 hover:shadow-xl transition-all group ${
                  formation.misEnAvant ? "border-amber-700/50 ring-1 ring-amber-700/20" : "border-gray-700"
                }`}
              >
                {/* Image */}
                <div className="relative h-40 w-full overflow-hidden">
                  <img
                    src={imgUrl}
                    alt={formation.titre}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                  {/* Top badges */}
                  <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
                    {formation.misEnAvant && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 text-white px-2 py-0.5 text-[10px] font-bold shadow">
                        <Star className="h-2.5 w-2.5 fill-white" /> Vedette
                      </span>
                    )}
                    {formation.certifiante && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/90 text-amber-700 px-2 py-0.5 text-[10px] font-bold shadow">
                        <Award className="h-2.5 w-2.5" /> Certifiante
                      </span>
                    )}
                  </div>

                  {/* Category badge on image */}
                  {formation.categorie && (
                    <div className="absolute bottom-2.5 left-2.5">
                      <span className="inline-flex items-center rounded-full bg-red-600/90 text-white px-2.5 py-0.5 text-[10px] font-semibold shadow backdrop-blur-sm">
                        {formation.categorie}
                      </span>
                    </div>
                  )}

                  {/* Inactive overlay */}
                  {!formation.actif && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-white font-bold text-xs bg-black/80 px-3 py-1 rounded-full">Inactive</span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-3.5">
                  <h3 className="text-sm font-semibold text-gray-100 line-clamp-2 mb-2 group-hover:text-red-400 transition-colors">
                    {formation.titre}
                  </h3>

                  {/* Meta row */}
                  <div className="flex items-center gap-3 text-xs text-gray-400 mb-2.5">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {formation.duree}h
                    </span>
                    {modaliteInfo && (
                      <span className="flex items-center gap-1">
                        {modaliteIcons[formation.modalite]} {modaliteInfo.label}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" /> {formation._count.sessions} session{formation._count.sessions !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Bottom row */}
                  <div className="flex items-center justify-between pt-2.5 border-t border-gray-700">
                    <span className="text-sm font-bold text-gray-100">{formatCurrency(formation.tarif)}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-medium text-gray-400 bg-gray-700 rounded-full px-2 py-0.5">
                        {niveauLabel}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && formations.length > 0 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-gray-400">
            {total} formation{total > 1 ? "s" : ""} au total
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="inline-flex items-center gap-1 rounded-md border border-gray-600 px-3 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors text-gray-300">
                <ChevronLeft className="h-4 w-4" /> Precedent
              </button>
              <span className="text-sm text-gray-400">Page {page} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="inline-flex items-center gap-1 rounded-md border border-gray-600 px-3 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors text-gray-300">
                Suivant <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
