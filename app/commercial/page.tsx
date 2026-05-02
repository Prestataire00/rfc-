"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Plus, Receipt, Download, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatutBadge } from "@/components/shared/StatutBadge";
import { Pagination } from "@/components/shared/Pagination";
import { SkeletonCard, SkeletonTable } from "@/components/shared/Skeleton";
import { DEVIS_STATUTS, FACTURE_STATUTS } from "@/lib/constants";
import { formatDate, formatCurrency, cn } from "@/lib/utils";
import { useApi } from "@/hooks/useApi";

type TunnelStats = {
  caPrevisionnel: number;
  nbDevisEnCours: number;
  caAEncaisser: number;
  nbFacturesAEncaisser: number;
  caFactureMois: number;
};

type LigneDevis = { id: string; montant: number };
type Devis = {
  id: string;
  numero: string;
  objet: string;
  statut: string;
  montantTTC: number;
  dateValidite: string;
  createdAt: string;
  entreprise: { id: string; nom: string } | null;
  contact: { id: string; nom: string; prenom: string } | null;
  lignes: LigneDevis[];
};

type Facture = {
  id: string;
  numero: string;
  statut: string;
  montantTTC: number;
  dateEcheance: string;
  datePaiement: string | null;
  createdAt: string;
  entreprise: { id: string; nom: string } | null;
  devis: { id: string; numero: string } | null;
};

const PIPELINE_COLUMNS = [
  { key: "brouillon", label: "Brouillon", color: "bg-gray-700 border-gray-600" },
  { key: "envoye", label: "Envoyé", color: "bg-red-900/20 border-red-300" },
  { key: "signe", label: "Signé", color: "bg-green-900/20 border-green-700" },
  { key: "refuse", label: "Refusé", color: "bg-red-900/20 border-red-300" },
  { key: "expire", label: "Expiré", color: "bg-orange-900/20 border-orange-700" },
] as const;

type DevisResponse = { data: Devis[] } | Devis[];
type FacturesResponse = { data: Facture[]; total?: number; totalPages?: number } | Facture[];
type DashboardStats = {
  stats: {
    caPrevisionnel: number;
    nbDevisEnCours: number;
    caAEncaisser: number;
    nbFacturesAEncaisser: number;
    caFactureMois: number;
  };
};

export default function CommercialPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"devis" | "factures">("devis");
  const [facturePage, setFacturePage] = useState(1);
  const [filtreStatutFacture, setFiltreStatutFacture] = useState("");

  useEffect(() => {
    setFacturePage(1);
  }, [filtreStatutFacture]);

  const facturesUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (filtreStatutFacture) params.set("statut", filtreStatutFacture);
    params.set("page", String(facturePage));
    params.set("limit", "25");
    return `/api/factures?${params.toString()}`;
  }, [filtreStatutFacture, facturePage]);

  const { data: devisRaw, isLoading: loadingDevis } = useApi<DevisResponse>("/api/devis?limit=100");
  const { data: facturesRaw, isLoading: loadingFactures } = useApi<FacturesResponse>(facturesUrl);
  const { data: dashboardStats } = useApi<DashboardStats>("/api/dashboard/stats?period=mois");

  const devis: Devis[] = Array.isArray(devisRaw) ? devisRaw : devisRaw?.data ?? [];
  const factures: Facture[] = Array.isArray(facturesRaw) ? facturesRaw : facturesRaw?.data ?? [];
  const factureTotal = Array.isArray(facturesRaw) ? facturesRaw.length : facturesRaw?.total ?? 0;
  const factureTotalPages = Array.isArray(facturesRaw) ? 1 : facturesRaw?.totalPages ?? 1;
  const tunnelStats: TunnelStats | null = dashboardStats
    ? {
        caPrevisionnel: dashboardStats.stats.caPrevisionnel,
        nbDevisEnCours: dashboardStats.stats.nbDevisEnCours,
        caAEncaisser: dashboardStats.stats.caAEncaisser,
        nbFacturesAEncaisser: dashboardStats.stats.nbFacturesAEncaisser,
        caFactureMois: dashboardStats.stats.caFactureMois,
      }
    : null;

  const devisByStatut = PIPELINE_COLUMNS.reduce((acc, col) => {
    acc[col.key] = devis.filter((d) => d.statut === col.key);
    return acc;
  }, {} as Record<string, Devis[]>);

  const getClientName = (d: Devis) => {
    if (d.entreprise) return d.entreprise.nom;
    if (d.contact) return `${d.contact.prenom} ${d.contact.nom}`;
    return "—";
  };

  const factureStatutOptions = [
    { value: "", label: "Tous les statuts" },
    ...Object.entries(FACTURE_STATUTS).map(([v, s]) => ({ value: v, label: s.label })),
  ];

  return (
    <div>
      <PageHeader
        title="Commercial"
        description="Gérez vos devis et factures"
      />

      {/* Tunnel CA */}
      {tunnelStats && (
        <div className="mb-6">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Tunnel CA</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 rounded-lg bg-blue-900/30 dark:bg-blue-900/30 border border-blue-700 p-4 text-center">
              <div className="text-xs text-blue-400 mb-1">Devis en cours</div>
              <div className="text-lg font-bold text-blue-300">{formatCurrency(tunnelStats.caPrevisionnel)}</div>
              <div className="text-xs text-gray-500 mt-1">{tunnelStats.nbDevisEnCours} devis</div>
            </div>
            <ArrowRight className="h-5 w-5 text-gray-600 flex-shrink-0" />
            <div className="flex-1 rounded-lg bg-orange-900/30 dark:bg-orange-900/30 border border-orange-700 p-4 text-center">
              <div className="text-xs text-orange-400 mb-1">Facturé à encaisser</div>
              <div className="text-lg font-bold text-orange-300">{formatCurrency(tunnelStats.caAEncaisser)}</div>
              <div className="text-xs text-gray-500 mt-1">{tunnelStats.nbFacturesAEncaisser} factures</div>
            </div>
            <ArrowRight className="h-5 w-5 text-gray-600 flex-shrink-0" />
            <div className="flex-1 rounded-lg bg-emerald-900/30 dark:bg-emerald-900/30 border border-emerald-700 p-4 text-center">
              <div className="text-xs text-emerald-400 mb-1">Encaissé</div>
              <div className="text-lg font-bold text-emerald-300">{formatCurrency(tunnelStats.caFactureMois)}</div>
              <div className="text-xs text-gray-500 mt-1">ce mois</div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs + Export */}
      <div className="flex items-center justify-between mb-6">
      <div className="flex gap-1 bg-gray-700 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("devis")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
            activeTab === "devis"
              ? "bg-gray-800 text-gray-100 shadow-sm"
              : "text-gray-400 hover:text-gray-100"
          )}
        >
          <FileText className="h-4 w-4" /> Pipeline Devis
        </button>
        <button
          onClick={() => setActiveTab("factures")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
            activeTab === "factures"
              ? "bg-gray-800 text-gray-100 shadow-sm"
              : "text-gray-400 hover:text-gray-100"
          )}
        >
          <Receipt className="h-4 w-4" /> Factures
        </button>
      </div>
        <a
          href={activeTab === "devis" ? "/api/export/devis" : "/api/export/factures"}
          download
          className="inline-flex items-center gap-2 rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors"
        >
          <Download className="h-4 w-4" />
          Exporter CSV
        </a>
      </div>

      {/* Pipeline Devis */}
      {activeTab === "devis" && (
        <>
          <div className="flex justify-end mb-4">
            <Link
              href="/commercial/devis/nouveau"
              className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
            >
              <Plus className="h-4 w-4" /> Nouveau devis
            </Link>
          </div>

          {loadingDevis ? (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonCard key={i} className="flex-shrink-0 w-64 h-48" />
              ))}
            </div>
          ) : devis.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Aucun devis"
              description="Créez votre premier devis"
              actionLabel="Nouveau devis"
              actionHref="/commercial/devis/nouveau"
            />
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {PIPELINE_COLUMNS.map((col) => {
                const colDevis = devisByStatut[col.key] || [];
                const st = DEVIS_STATUTS[col.key as keyof typeof DEVIS_STATUTS];
                return (
                  <div
                    key={col.key}
                    className={cn(
                      "flex-shrink-0 w-64 rounded-lg border-2 p-3",
                      col.color
                    )}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-gray-300">{col.label}</h3>
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-800 text-xs font-medium text-gray-400 border">
                        {colDevis.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {colDevis.map((d) => (
                        <div
                          key={d.id}
                          onClick={() => router.push(`/commercial/devis/${d.id}`)}
                          className="bg-gray-800 rounded-md border border-gray-700 p-3 cursor-pointer hover:shadow-md hover:border-red-300 transition-all"
                        >
                          <div className="flex items-start justify-between gap-1 mb-1">
                            <span className="text-xs font-mono text-gray-400">{d.numero}</span>
                            {st && <StatutBadge label={st.label} color={st.color} />}
                          </div>
                          <p className="text-sm font-medium text-gray-100 line-clamp-2 mb-2">
                            {d.objet}
                          </p>
                          <p className="text-xs text-gray-400 mb-1">{getClientName(d)}</p>
                          <p className="text-sm font-semibold text-gray-200">
                            {formatCurrency(d.montantTTC)}
                          </p>
                        </div>
                      ))}
                      {colDevis.length === 0 && (
                        <p className="text-xs text-gray-400 text-center py-4">Aucun devis</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Factures */}
      {activeTab === "factures" && (
        <>
          <div className="flex items-center justify-between mb-4">
            <select
              value={filtreStatutFacture}
              onChange={(e) => setFiltreStatutFacture(e.target.value)}
              className="h-10 rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm"
            >
              {factureStatutOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <Link
              href="/commercial/factures/nouveau"
              className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
            >
              <Plus className="h-4 w-4" /> Nouvelle facture
            </Link>
          </div>

          {loadingFactures ? (
            <SkeletonTable rows={5} cols={7} />
          ) : factures.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="Aucune facture"
              description="Vos factures apparaîtront ici"
            />
          ) : (
            <div className="rounded-lg border bg-gray-800 overflow-x-auto">
              <table className="min-w-[640px] w-full text-sm">
                <thead className="bg-gray-900 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-400">Numéro</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-400">Client</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-400 hidden sm:table-cell">Devis</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-400">Montant TTC</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-400">Échéance</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-400">Statut</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-400 hidden sm:table-cell">Date paiement</th>
                  </tr>
                </thead>
                <tbody>
                  {factures.map((f) => {
                    const st = FACTURE_STATUTS[f.statut as keyof typeof FACTURE_STATUTS];
                    return (
                      <tr
                        key={f.id}
                        className="border-b last:border-0 hover:bg-gray-700 cursor-pointer"
                        onClick={() => router.push(`/commercial/factures/${f.id}`)}
                      >
                        <td className="px-4 py-3 font-mono text-gray-300">{f.numero}</td>
                        <td className="px-4 py-3 text-gray-300">
                          {f.entreprise?.nom || <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3 font-mono text-sm hidden sm:table-cell">
                          {f.devis ? (
                            <span className="text-blue-400">{f.devis.numero}</span>
                          ) : (
                            <span className="text-gray-500">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-200">
                          {formatCurrency(f.montantTTC)}
                        </td>
                        <td className="px-4 py-3 text-gray-400">
                          {formatDate(f.dateEcheance)}
                        </td>
                        <td className="px-4 py-3">
                          {st && <StatutBadge label={st.label} color={st.color} />}
                        </td>
                        <td className="px-4 py-3 text-gray-400 hidden sm:table-cell">
                          {f.datePaiement ? (
                            formatDate(f.datePaiement)
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {!loadingFactures && factures.length > 0 && (
            <>
              <Pagination page={facturePage} totalPages={factureTotalPages} onPageChange={setFacturePage} />
              <p className="text-sm text-gray-400 mt-3 text-center">
                {factureTotal} facture{factureTotal > 1 ? "s" : ""}
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}
