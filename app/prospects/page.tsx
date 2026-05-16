"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus, Plus, Search, LayoutGrid, Table } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { BESOIN_STATUTS, BESOIN_PRIORITES, BESOIN_ORIGINES } from "@/lib/constants";
import { useApi } from "@/hooks/useApi";
import { StatsBar } from "./_components/StatsBar";
import { TableView } from "./_components/TableView";
import { KanbanView, PIPELINE_COLS, type Besoin } from "./_components/KanbanView";
import { CardsView } from "./_components/CardsView";

const LS_KEY = "prospects_view_mode";

export default function ProspectsPage() {
  const router = useRouter();

  // View mode with localStorage persistence (default: cards)
  const [viewMode, setViewMode] = useState<"table" | "kanban" | "cards">("cards");
  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY);
    if (saved === "kanban" || saved === "table" || saved === "cards") setViewMode(saved);
  }, []);
  function switchView(mode: "table" | "kanban" | "cards") {
    setViewMode(mode);
    localStorage.setItem(LS_KEY, mode);
  }

  // Filters
  const [search, setSearch] = useState("");
  const [statutFilter, setStatutFilter] = useState("");
  const [origineFilter, setOrigineFilter] = useState("");
  const [prioriteFilter, setPrioriteFilter] = useState("");

  const { data: besoinsData, isLoading: loading, mutate } = useApi<Besoin[]>("/api/demandes");
  const besoins: Besoin[] = Array.isArray(besoinsData) ? besoinsData : [];

  const filtered = useMemo(() => {
    return besoins.filter((b) => {
      if (statutFilter && b.statut !== statutFilter) return false;
      if (origineFilter && b.origine !== origineFilter) return false;
      if (prioriteFilter && b.priorite !== prioriteFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        const match =
          b.titre.toLowerCase().includes(s) ||
          b.entreprise?.nom.toLowerCase().includes(s) ||
          b.contact?.nom.toLowerCase().includes(s) ||
          b.contact?.prenom.toLowerCase().includes(s) ||
          b.formation?.titre.toLowerCase().includes(s);
        if (!match) return false;
      }
      return true;
    });
  }, [besoins, search, statutFilter, origineFilter, prioriteFilter]);

  const byStatut = useMemo(() => {
    return PIPELINE_COLS.reduce((acc, col) => {
      acc[col.key] = filtered.filter((b) => b.statut === col.key);
      return acc;
    }, {} as Record<string, Besoin[]>);
  }, [filtered]);

  // Stats
  const nbNouveau = besoins.filter((b) => b.statut === "nouveau").length;
  const nbEnCours = besoins.filter((b) => ["qualifie", "devis_envoye"].includes(b.statut)).length;
  const nbAcceptes = besoins.filter((b) => b.statut === "accepte").length;
  const tauxConversion =
    besoins.length > 0 ? Math.round((nbAcceptes / besoins.length) * 100) : 0;

  const hasFilters = !!(search || origineFilter || statutFilter || prioriteFilter);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <UserPlus className="h-6 w-6 text-red-500" /> Demandes
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {besoins.length} prospect{besoins.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/prospects/nouveau"
          className="inline-flex items-center gap-2 rounded-md bg-red-600 hover:bg-red-700 px-4 py-2 text-sm font-medium text-white transition-colors"
        >
          <Plus className="h-4 w-4" /> Nouvelle demande
        </Link>
      </div>

      {/* Stats compactes (1 ligne) */}
      <StatsBar
        total={besoins.length}
        aQualifier={nbNouveau}
        enCours={nbEnCours}
        acceptes={nbAcceptes}
        tauxConversion={tauxConversion}
      />

      {/* Filtres + toggle vue */}
      <div className="flex flex-wrap items-center gap-2 mt-3 mb-4">
        <div className="relative flex-1 max-w-xs min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher..."
            className="w-full h-9 rounded-md border border-gray-600 bg-gray-800 pl-9 pr-3 text-sm text-gray-200 focus:outline-none focus:border-red-500"
          />
        </div>
        <select
          value={statutFilter}
          onChange={(e) => setStatutFilter(e.target.value)}
          className="h-9 rounded-md border border-gray-600 bg-gray-800 px-3 text-sm text-gray-200"
        >
          <option value="">Statut</option>
          {Object.entries(BESOIN_STATUTS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select
          value={origineFilter}
          onChange={(e) => setOrigineFilter(e.target.value)}
          className="h-9 rounded-md border border-gray-600 bg-gray-800 px-3 text-sm text-gray-200"
        >
          <option value="">Origine</option>
          {Object.entries(BESOIN_ORIGINES).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select
          value={prioriteFilter}
          onChange={(e) => setPrioriteFilter(e.target.value)}
          className="h-9 rounded-md border border-gray-600 bg-gray-800 px-3 text-sm text-gray-200"
        >
          <option value="">Priorité</option>
          {Object.entries(BESOIN_PRIORITES).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        {hasFilters && (
          <button
            onClick={() => { setSearch(""); setOrigineFilter(""); setStatutFilter(""); setPrioriteFilter(""); }}
            className="text-xs text-gray-400 hover:text-gray-200 px-2"
          >
            Effacer
          </button>
        )}

        {/* Toggle Cards / Table / Kanban */}
        <div className="ml-auto flex items-center gap-1 border border-gray-600 rounded-md p-0.5">
          <button
            onClick={() => switchView("cards")}
            title="Vue cards"
            className={`h-8 w-8 inline-flex items-center justify-center rounded transition-colors ${viewMode === "cards" ? "bg-gray-600 text-gray-100" : "text-gray-400 hover:bg-gray-700"}`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => switchView("table")}
            title="Vue table"
            className={`h-8 w-8 inline-flex items-center justify-center rounded transition-colors ${viewMode === "table" ? "bg-gray-600 text-gray-100" : "text-gray-400 hover:bg-gray-700"}`}
          >
            <Table className="h-4 w-4" />
          </button>
          <button
            onClick={() => switchView("kanban")}
            title="Vue kanban"
            className={`h-8 w-8 inline-flex items-center justify-center rounded transition-colors ${viewMode === "kanban" ? "bg-gray-600 text-gray-100" : "text-gray-400 hover:bg-gray-700"}`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Contenu */}
      {loading ? (
        <div className="flex justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
        </div>
      ) : besoins.length === 0 ? (
        <div className="bg-gray-800 rounded-xl border border-gray-700">
          <EmptyState
            icon={UserPlus}
            title="Aucun prospect"
            description="Saisissez un prospect entrant pour démarrer le pipeline commercial"
            actionLabel="Nouvelle demande"
            actionHref="/prospects/nouveau"
          />
        </div>
      ) : viewMode === "cards" ? (
        <CardsView besoins={filtered} onRefresh={() => mutate()} />
      ) : viewMode === "table" ? (
        <TableView besoins={filtered} onRefresh={() => mutate()} />
      ) : (
        <KanbanView
          cols={PIPELINE_COLS}
          byStatut={byStatut}
          onOpen={(id) => router.push(`/prospects/${id}`)}
        />
      )}
    </div>
  );
}
