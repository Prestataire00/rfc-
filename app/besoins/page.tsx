"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ClipboardList, Plus, Search, LayoutGrid, List, Building2, User,
  GraduationCap, Euro, Users as UsersIcon, TrendingUp, Clock, AlertCircle,
  CheckCircle2, XCircle, Archive,
} from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { BESOIN_STATUTS, BESOIN_PRIORITES, BESOIN_ORIGINES } from "@/lib/constants";
import { formatDate, formatCurrency } from "@/lib/utils";

type Besoin = {
  id: string;
  titre: string;
  description: string | null;
  origine: string;
  statut: string;
  priorite: string;
  nbStagiaires: number | null;
  budget: number | null;
  createdAt: string;
  entreprise: { id: string; nom: string } | null;
  contact: { id: string; nom: string; prenom: string } | null;
  formation: { id: string; titre: string } | null;
  devis: { id: string; numero: string; statut: string } | null;
};

const PIPELINE_COLS = [
  { key: "nouveau", label: "Nouveau", color: "border-blue-500/40", dot: "bg-blue-500", icon: AlertCircle },
  { key: "qualifie", label: "Qualifie", color: "border-indigo-500/40", dot: "bg-indigo-500", icon: TrendingUp },
  { key: "devis_envoye", label: "Devis envoye", color: "border-amber-500/40", dot: "bg-amber-500", icon: Clock },
  { key: "accepte", label: "Accepte", color: "border-emerald-500/40", dot: "bg-emerald-500", icon: CheckCircle2 },
  { key: "refuse", label: "Refuse", color: "border-red-500/40", dot: "bg-red-500", icon: XCircle },
  { key: "archive", label: "Archive", color: "border-gray-500/40", dot: "bg-gray-500", icon: Archive },
];

const ORIGINE_STYLE: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  client: { icon: Building2, label: "Client", color: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
  stagiaire: { icon: User, label: "Stagiaire", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  centre: { icon: GraduationCap, label: "Centre", color: "bg-red-500/10 text-red-400 border-red-500/30" },
};

const PRIORITE_STYLE: Record<string, string> = {
  basse: "text-gray-400 bg-gray-500/10",
  normale: "text-blue-400 bg-blue-500/10",
  haute: "text-orange-400 bg-orange-500/10",
  urgente: "text-red-400 bg-red-500/10 ring-1 ring-red-500/30",
};

export default function BesoinsPage() {
  const router = useRouter();
  const [besoins, setBesoins] = useState<Besoin[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [search, setSearch] = useState("");
  const [statutFilter, setStatutFilter] = useState("");
  const [origineFilter, setOrigineFilter] = useState("");
  const [prioriteFilter, setPrioriteFilter] = useState("");

  const fetchBesoins = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/besoins");
    if (res.ok) setBesoins(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBesoins();
  }, [fetchBesoins]);

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

  // Stats globales
  const nbNouveau = besoins.filter((b) => b.statut === "nouveau").length;
  const nbEnCours = besoins.filter((b) => ["qualifie", "devis_envoye"].includes(b.statut)).length;
  const nbAcceptes = besoins.filter((b) => b.statut === "accepte").length;
  const budgetTotal = besoins
    .filter((b) => b.statut === "accepte")
    .reduce((s, b) => s + (b.budget || 0), 0);
  const tauxConversion = besoins.length > 0 ? Math.round((nbAcceptes / besoins.length) * 100) : 0;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-red-500" /> Demandes de formation
          </h1>
          <p className="text-sm text-gray-400 mt-1">Pipeline commercial : qualifiez et convertissez les demandes entrantes en sessions</p>
        </div>
        <Link
          href="/besoins/nouveau"
          className="inline-flex items-center gap-2 rounded-md bg-red-600 hover:bg-red-700 px-4 py-2 text-sm font-medium text-white transition-colors"
        >
          <Plus className="h-4 w-4" /> Nouvelle demande
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <StatCard label="Total" value={besoins.length} icon={ClipboardList} color="text-gray-400 bg-gray-500/10" />
        <StatCard label="A qualifier" value={nbNouveau} icon={AlertCircle} color="text-blue-400 bg-blue-500/10" />
        <StatCard label="En cours" value={nbEnCours} icon={TrendingUp} color="text-amber-400 bg-amber-500/10" />
        <StatCard label="Acceptes" value={nbAcceptes} icon={CheckCircle2} color="text-emerald-400 bg-emerald-500/10" />
        <StatCard label="Taux conversion" value={`${tauxConversion}%`} icon={TrendingUp} color="text-red-400 bg-red-500/10" subline={budgetTotal > 0 ? formatCurrency(budgetTotal) : undefined} />
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une demande..."
            className="w-full h-10 rounded-md border border-gray-600 bg-gray-800 pl-9 pr-3 text-sm text-gray-200 focus:outline-none focus:border-red-500"
          />
        </div>
        <select value={origineFilter} onChange={(e) => setOrigineFilter(e.target.value)} className="h-10 rounded-md border border-gray-600 bg-gray-800 px-3 text-sm text-gray-200">
          <option value="">Toutes origines</option>
          {Object.entries(BESOIN_ORIGINES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={statutFilter} onChange={(e) => setStatutFilter(e.target.value)} className="h-10 rounded-md border border-gray-600 bg-gray-800 px-3 text-sm text-gray-200">
          <option value="">Tous statuts</option>
          {Object.entries(BESOIN_STATUTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={prioriteFilter} onChange={(e) => setPrioriteFilter(e.target.value)} className="h-10 rounded-md border border-gray-600 bg-gray-800 px-3 text-sm text-gray-200">
          <option value="">Toutes priorites</option>
          {Object.entries(BESOIN_PRIORITES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        {(search || origineFilter || statutFilter || prioriteFilter) && (
          <button onClick={() => { setSearch(""); setOrigineFilter(""); setStatutFilter(""); setPrioriteFilter(""); }} className="text-sm text-gray-400 hover:text-gray-200">
            Effacer
          </button>
        )}
        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => setView("kanban")} className={`h-10 w-10 inline-flex items-center justify-center rounded-md transition-colors ${view === "kanban" ? "bg-gray-700 text-gray-100" : "text-gray-400 hover:bg-gray-700"}`} title="Pipeline">
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button onClick={() => setView("list")} className={`h-10 w-10 inline-flex items-center justify-center rounded-md transition-colors ${view === "list" ? "bg-gray-700 text-gray-100" : "text-gray-400 hover:bg-gray-700"}`} title="Liste">
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" /></div>
      ) : besoins.length === 0 ? (
        <div className="bg-gray-800 rounded-xl border border-gray-700">
          <EmptyState
            icon={ClipboardList}
            title="Aucune demande de formation"
            description="Creez votre premiere demande ou attendez les inscriptions publiques"
            actionLabel="Nouvelle demande"
            actionHref="/besoins/nouveau"
          />
        </div>
      ) : view === "kanban" ? (
        <KanbanView cols={PIPELINE_COLS} byStatut={byStatut} onOpen={(id) => router.push(`/besoins/${id}`)} />
      ) : (
        <ListView besoins={filtered} onOpen={(id) => router.push(`/besoins/${id}`)} />
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, subline }: { label: string; value: number | string; icon: React.ElementType; color: string; subline?: string }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xl font-bold text-gray-100">{value}</p>
          <p className="text-xs text-gray-400 truncate">{label}</p>
          {subline && <p className="text-[10px] text-gray-500 truncate">{subline}</p>}
        </div>
      </div>
    </div>
  );
}

function KanbanView({ cols, byStatut, onOpen }: { cols: typeof PIPELINE_COLS; byStatut: Record<string, Besoin[]>; onOpen: (id: string) => void }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2">
      {cols.map((col) => {
        const list = byStatut[col.key] || [];
        const Icon = col.icon;
        return (
          <div key={col.key} className={`flex-shrink-0 w-72 rounded-xl border bg-gray-800 ${col.color}`}>
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${col.dot}`} />
                <Icon className="h-3.5 w-3.5 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-200">{col.label}</h3>
              </div>
              <span className="text-xs font-medium text-gray-400 bg-gray-900 rounded-full px-2 py-0.5">
                {list.length}
              </span>
            </div>
            <div className="p-2 space-y-2 max-h-[70vh] overflow-y-auto">
              {list.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-6 italic">Vide</p>
              ) : list.map((b) => <BesoinCard key={b.id} b={b} onOpen={onOpen} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BesoinCard({ b, onOpen }: { b: Besoin; onOpen: (id: string) => void }) {
  const OrigIcon = ORIGINE_STYLE[b.origine]?.icon ?? Building2;
  const origStyle = ORIGINE_STYLE[b.origine]?.color ?? "bg-gray-500/10 text-gray-400 border-gray-500/30";
  const prio = PRIORITE_STYLE[b.priorite] ?? "text-gray-400 bg-gray-500/10";
  const prioLabel = BESOIN_PRIORITES[b.priorite as keyof typeof BESOIN_PRIORITES]?.label ?? b.priorite;
  const isUrgent = b.priorite === "urgente";
  return (
    <button
      onClick={() => onOpen(b.id)}
      className={`w-full text-left bg-gray-900 rounded-lg border p-3 hover:bg-gray-700 hover:shadow-md transition-all ${isUrgent ? "border-red-500/50 ring-1 ring-red-500/20" : "border-gray-700"}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-medium text-gray-100 line-clamp-2 flex-1">{b.titre}</p>
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium whitespace-nowrap ${origStyle}`}>
          <OrigIcon className="h-3 w-3 mr-1" />
          {ORIGINE_STYLE[b.origine]?.label ?? b.origine}
        </span>
      </div>
      {(b.entreprise || b.contact) && (
        <p className="text-xs text-gray-400 truncate mb-2">
          {b.entreprise?.nom || (b.contact ? `${b.contact.prenom} ${b.contact.nom}` : "")}
        </p>
      )}
      {b.formation && (
        <div className="flex items-center gap-1 text-xs text-red-400 mb-2 truncate">
          <GraduationCap className="h-3 w-3 shrink-0" />
          <span className="truncate">{b.formation.titre}</span>
        </div>
      )}
      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-700">
        <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${prio}`}>
          {prioLabel}
        </span>
        {b.nbStagiaires && (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-400">
            <UsersIcon className="h-3 w-3" /> {b.nbStagiaires}
          </span>
        )}
        {b.budget && (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-400 ml-auto">
            <Euro className="h-3 w-3" /> {formatCurrency(b.budget)}
          </span>
        )}
      </div>
      {b.devis && (
        <div className="mt-2 text-[10px] text-gray-500 flex items-center justify-between">
          <span>Devis {b.devis.numero}</span>
          <span className="text-gray-400">{formatDate(b.createdAt)}</span>
        </div>
      )}
      {!b.devis && (
        <p className="mt-2 text-[10px] text-gray-500 text-right">{formatDate(b.createdAt)}</p>
      )}
    </button>
  );
}

function ListView({ besoins, onOpen }: { besoins: Besoin[]; onOpen: (id: string) => void }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-900 border-b border-gray-700">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-400">Titre</th>
            <th className="px-4 py-3 text-left font-medium text-gray-400">Client</th>
            <th className="px-4 py-3 text-left font-medium text-gray-400 hidden md:table-cell">Formation</th>
            <th className="px-4 py-3 text-left font-medium text-gray-400 hidden sm:table-cell">Origine</th>
            <th className="px-4 py-3 text-left font-medium text-gray-400">Stagiaires</th>
            <th className="px-4 py-3 text-left font-medium text-gray-400 hidden md:table-cell">Budget</th>
            <th className="px-4 py-3 text-left font-medium text-gray-400">Priorite</th>
            <th className="px-4 py-3 text-left font-medium text-gray-400">Statut</th>
            <th className="px-4 py-3 text-left font-medium text-gray-400 hidden md:table-cell">Date</th>
          </tr>
        </thead>
        <tbody>
          {besoins.map((b) => {
            const OrigIcon = ORIGINE_STYLE[b.origine]?.icon ?? Building2;
            const statInfo = BESOIN_STATUTS[b.statut as keyof typeof BESOIN_STATUTS];
            const prio = BESOIN_PRIORITES[b.priorite as keyof typeof BESOIN_PRIORITES];
            const prioStyle = PRIORITE_STYLE[b.priorite] ?? "";
            return (
              <tr key={b.id} onClick={() => onOpen(b.id)} className="border-b border-gray-700 hover:bg-gray-700/50 cursor-pointer transition-colors">
                <td className="px-4 py-3 font-medium text-gray-100 max-w-[240px] truncate">{b.titre}</td>
                <td className="px-4 py-3 text-sm">
                  {b.entreprise ? <span className="text-red-400">{b.entreprise.nom}</span> : b.contact ? <span className="text-gray-300">{b.contact.prenom} {b.contact.nom}</span> : <span className="text-gray-500">—</span>}
                </td>
                <td className="px-4 py-3 text-gray-400 hidden md:table-cell max-w-[200px] truncate">{b.formation?.titre || "—"}</td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                    <OrigIcon className="h-3 w-3" /> {ORIGINE_STYLE[b.origine]?.label ?? b.origine}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400">
                  {b.nbStagiaires ? (
                    <span className="inline-flex items-center gap-1 text-xs"><UsersIcon className="h-3 w-3" /> {b.nbStagiaires}</span>
                  ) : "—"}
                </td>
                <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{b.budget ? formatCurrency(b.budget) : "—"}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${prioStyle}`}>
                    {prio?.label ?? b.priorite}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {statInfo && (
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statInfo.color}`}>
                      {statInfo.label}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell">{formatDate(b.createdAt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
