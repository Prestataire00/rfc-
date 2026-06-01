"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText, Plus, Receipt, Download, ArrowRight, List, LayoutGrid, Columns3 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatutBadge } from "@/components/shared/StatutBadge";
import { Pagination } from "@/components/shared/Pagination";
import { SkeletonTable } from "@/components/shared/Skeleton";
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

// Sous-onglets de la vue Devis — un par statut Prisma officiel.
// Ordre : pipeline naturel (brouillon → envoyé → signé) + sorties (refusé, expiré).
type DevisStatutKey = keyof typeof DEVIS_STATUTS;
const DEVIS_STATUT_TABS: DevisStatutKey[] = [
  "brouillon",
  "envoye",
  "signe",
  "refuse",
  "expire",
];

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
  const searchParams = useSearchParams();
  // Onglet initial : ?tab=factures ou ?tab=devis (cf. sidebar nav qui distingue
  // Commercial.Devis vs Finance.Factures via deux entrées de menu différentes).
  const initialTab = searchParams.get("tab") === "factures" ? "factures" : "devis";
  const [activeTab, setActiveTab] = useState<"devis" | "factures">(initialTab);
  const [facturePage, setFacturePage] = useState(1);
  const [filtreStatutFacture, setFiltreStatutFacture] = useState("");
  // Sous-onglet statut sur la vue Devis (filtre actif en mode Liste/Cartes,
  // ignoré en mode Kanban qui montre toutes les colonnes).
  const initialDevisStatut = (searchParams.get("statut") as DevisStatutKey) || "brouillon";
  const [activeDevisStatut, setActiveDevisStatut] = useState<DevisStatutKey>(
    DEVIS_STATUT_TABS.includes(initialDevisStatut) ? initialDevisStatut : "brouillon",
  );

  // Mode d'affichage des devis : liste (table), cartes (grille) ou kanban
  // (colonnes par statut). Persisté en localStorage pour conserver le choix
  // utilisateur entre les visites.
  type DevisView = "liste" | "cartes" | "kanban";
  const [devisView, setDevisView] = useState<DevisView>("liste");
  const [factureView, setFactureView] = useState<DevisView>("liste");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedD = window.localStorage.getItem("commercial.devisView");
    if (savedD === "liste" || savedD === "cartes" || savedD === "kanban") setDevisView(savedD);
    const savedF = window.localStorage.getItem("commercial.factureView");
    if (savedF === "liste" || savedF === "cartes" || savedF === "kanban") setFactureView(savedF);
  }, []);
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("commercial.devisView", devisView);
    }
  }, [devisView]);
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("commercial.factureView", factureView);
    }
  }, [factureView]);

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
  // En vue Kanban, on a besoin de TOUTES les factures sans filtre statut
  // pour les ventiler dans les 5 colonnes. Fetch conditionnel pour ne pas
  // gaspiller de bande passante quand on est sur Liste/Cartes.
  const { data: facturesKanbanRaw, isLoading: loadingFacturesKanban } = useApi<FacturesResponse>(
    activeTab === "factures" && factureView === "kanban" ? "/api/factures?limit=200" : null,
  );
  const { data: dashboardStats } = useApi<DashboardStats>("/api/dashboard/stats?period=mois");

  const devis: Devis[] = Array.isArray(devisRaw) ? devisRaw : devisRaw?.data ?? [];
  const factures: Facture[] = Array.isArray(facturesRaw) ? facturesRaw : facturesRaw?.data ?? [];
  const facturesKanban: Facture[] = Array.isArray(facturesKanbanRaw)
    ? facturesKanbanRaw
    : facturesKanbanRaw?.data ?? [];
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

  // Comptage par statut (alimente les badges des sous-onglets)
  const devisCountByStatut = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const key of DEVIS_STATUT_TABS) {
      counts[key] = devis.filter((d) => d.statut === key).length;
    }
    return counts;
  }, [devis]);

  const devisFiltres = useMemo(
    () => devis.filter((d) => d.statut === activeDevisStatut),
    [devis, activeDevisStatut],
  );

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
            {/* Devis en cours */}
            <div className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 border-l-4 border-l-blue-500 bg-white dark:bg-gray-800 p-4 text-center">
              <div className="text-xs font-medium uppercase tracking-wide text-blue-600 dark:text-blue-400 mb-1">
                Devis en cours
              </div>
              <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {formatCurrency(tunnelStats.caPrevisionnel)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {tunnelStats.nbDevisEnCours} devis
              </div>
            </div>

            <ArrowRight className="h-5 w-5 text-gray-400 dark:text-gray-600 flex-shrink-0" />

            {/* Facturé à encaisser */}
            <div className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 border-l-4 border-l-orange-500 bg-white dark:bg-gray-800 p-4 text-center">
              <div className="text-xs font-medium uppercase tracking-wide text-orange-600 dark:text-orange-400 mb-1">
                Facturé à encaisser
              </div>
              <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {formatCurrency(tunnelStats.caAEncaisser)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {tunnelStats.nbFacturesAEncaisser} factures
              </div>
            </div>

            <ArrowRight className="h-5 w-5 text-gray-400 dark:text-gray-600 flex-shrink-0" />

            {/* Encaissé */}
            <div className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 border-l-4 border-l-emerald-500 bg-white dark:bg-gray-800 p-4 text-center">
              <div className="text-xs font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-1">
                Encaissé
              </div>
              <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {formatCurrency(tunnelStats.caFactureMois)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">ce mois</div>
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

      {/* Pipeline Devis — sous-onglets par statut */}
      {activeTab === "devis" && (
        <>
          {/* Toggle d'affichage : Liste / Cartes / Kanban */}
          <div className="flex items-center justify-end gap-2 mb-3">
            <span className="text-xs text-gray-500 dark:text-gray-400">Affichage :</span>
            <div className="inline-flex rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-0.5">
              {([
                { key: "liste" as const, label: "Liste", icon: List },
                { key: "cartes" as const, label: "Cartes", icon: LayoutGrid },
                { key: "kanban" as const, label: "Kanban", icon: Columns3 },
              ]).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setDevisView(key)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-medium transition-colors",
                    devisView === key
                      ? "bg-red-600 text-white"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100",
                  )}
                  title={label}
                >
                  <Icon className="h-3.5 w-3.5" /> {label}
                </button>
              ))}
            </div>
          </div>

          {/* Sous-onglets de statut — masqués en vue Kanban (déjà ventilé par colonnes) */}
          <div className={cn("items-end justify-between gap-2 mb-4 flex-wrap", devisView === "kanban" ? "hidden" : "flex")}>
            <nav className="flex gap-1 border-b border-gray-200 dark:border-gray-700 -mb-px">
              {DEVIS_STATUT_TABS.map((key) => {
                const meta = DEVIS_STATUTS[key];
                const active = activeDevisStatut === key;
                const count = devisCountByStatut[key] ?? 0;
                return (
                  <button
                    key={key}
                    onClick={() => setActiveDevisStatut(key)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                      active
                        ? "border-red-600 text-red-600 dark:text-red-400"
                        : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200",
                    )}
                  >
                    {meta.label}
                    <span
                      className={cn(
                        "inline-flex items-center justify-center rounded-full text-xs font-semibold min-w-[1.5rem] h-5 px-1.5",
                        active
                          ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </nav>
            <Link
              href="/commercial/devis/nouveau"
              className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
            >
              <Plus className="h-4 w-4" /> Nouveau devis
            </Link>
          </div>

          {loadingDevis ? (
            <SkeletonTable rows={6} cols={6} />
          ) : devisView === "kanban" ? (
            /* ── Vue Kanban : 5 colonnes par statut, ventilation directe ── */
            devis.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="Aucun devis"
                description="Créez votre premier devis pour démarrer le pipeline."
                actionLabel="Nouveau devis"
                actionHref="/commercial/devis/nouveau"
              />
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {DEVIS_STATUT_TABS.map((key) => {
                  const meta = DEVIS_STATUTS[key];
                  const colonne = devis.filter((d) => d.statut === key);
                  return (
                    <div
                      key={key}
                      className="flex-shrink-0 w-72 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex flex-col"
                    >
                      <div className="px-3 py-2.5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={cn("inline-block h-2 w-2 rounded-full", meta.color.replace("bg-", "bg-").split(" ")[0])} />
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{meta.label}</span>
                        </div>
                        <span className="inline-flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300 min-w-[1.5rem] h-5 px-1.5">
                          {colonne.length}
                        </span>
                      </div>
                      <div className="flex-1 p-2 space-y-2 min-h-[120px]">
                        {colonne.length === 0 ? (
                          <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">—</p>
                        ) : (
                          colonne.map((d) => (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => router.push(`/commercial/devis/${d.id}`)}
                              className="w-full text-left rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2.5 hover:border-red-400 dark:hover:border-red-600 hover:shadow-sm transition"
                            >
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="font-mono text-[10px] text-gray-500 dark:text-gray-400">{d.numero}</span>
                                <span className="font-semibold text-xs text-gray-900 dark:text-gray-100">{formatCurrency(d.montantTTC)}</span>
                              </div>
                              <p className="text-xs text-gray-800 dark:text-gray-200 line-clamp-2 mb-1">{d.objet}</p>
                              <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{getClientName(d)}</p>
                              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">Valide {formatDate(d.dateValidite)}</p>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : devisFiltres.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={`Aucun devis ${DEVIS_STATUTS[activeDevisStatut].label.toLowerCase()}`}
              description={
                activeDevisStatut === "brouillon"
                  ? "Créez un nouveau devis pour démarrer le pipeline commercial."
                  : "Aucun devis dans ce statut pour le moment."
              }
              actionLabel={activeDevisStatut === "brouillon" ? "Nouveau devis" : undefined}
              actionHref={activeDevisStatut === "brouillon" ? "/commercial/devis/nouveau" : undefined}
            />
          ) : devisView === "cartes" ? (
            /* ── Vue Cartes : grille responsive ── */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {devisFiltres.map((d) => {
                const s = DEVIS_STATUTS[d.statut as DevisStatutKey];
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => router.push(`/commercial/devis/${d.id}`)}
                    className="text-left rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 hover:border-red-400 dark:hover:border-red-600 hover:shadow-md transition"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{d.numero}</span>
                      {s && <StatutBadge label={s.label} color={s.color} />}
                    </div>
                    <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 line-clamp-2 mb-2">{d.objet}</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate mb-3">{getClientName(d)}</p>
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Valide {formatDate(d.dateValidite)}</span>
                      <span className="font-bold text-sm text-gray-900 dark:text-gray-100">{formatCurrency(d.montantTTC)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            /* ── Vue Liste : table (par défaut) ── */
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-x-auto">
              <table className="min-w-[760px] w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Numéro</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Objet</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Client</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Montant TTC</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Validité</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {devisFiltres.map((d) => {
                    const s = DEVIS_STATUTS[d.statut as DevisStatutKey];
                    return (
                      <tr
                        key={d.id}
                        onClick={() => router.push(`/commercial/devis/${d.id}`)}
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">{d.numero}</td>
                        <td className="px-4 py-3 text-gray-900 dark:text-gray-100 max-w-xs truncate">{d.objet}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{getClientName(d)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(d.montantTTC)}</td>
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{formatDate(d.dateValidite)}</td>
                        <td className="px-4 py-3">
                          {s && <StatutBadge label={s.label} color={s.color} />}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Factures */}
      {activeTab === "factures" && (
        <>
          {/* Toggle d'affichage : Liste / Cartes / Kanban */}
          <div className="flex items-center justify-end gap-2 mb-3">
            <span className="text-xs text-gray-500 dark:text-gray-400">Affichage :</span>
            <div className="inline-flex rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-0.5">
              {([
                { key: "liste" as const, label: "Liste", icon: List },
                { key: "cartes" as const, label: "Cartes", icon: LayoutGrid },
                { key: "kanban" as const, label: "Kanban", icon: Columns3 },
              ]).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setFactureView(key)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-medium transition-colors",
                    factureView === key
                      ? "bg-red-600 text-white"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100",
                  )}
                  title={label}
                >
                  <Icon className="h-3.5 w-3.5" /> {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            {/* Filtre statut masqué en vue Kanban (déjà ventilé en colonnes) */}
            <select
              value={filtreStatutFacture}
              onChange={(e) => setFiltreStatutFacture(e.target.value)}
              className={cn(
                "h-10 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100",
                factureView === "kanban" && "invisible",
              )}
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

          {factureView === "kanban" ? (
            /* ── Vue Kanban : 5 colonnes par statut (en_attente → annulée) ── */
            loadingFacturesKanban ? (
              <SkeletonTable rows={5} cols={5} />
            ) : facturesKanban.length === 0 ? (
              <EmptyState icon={Receipt} title="Aucune facture" description="Vos factures apparaîtront ici" />
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {(Object.keys(FACTURE_STATUTS) as (keyof typeof FACTURE_STATUTS)[]).map((key) => {
                  const meta = FACTURE_STATUTS[key];
                  const colonne = facturesKanban.filter((f) => f.statut === key);
                  return (
                    <div
                      key={key}
                      className="flex-shrink-0 w-72 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex flex-col"
                    >
                      <div className="px-3 py-2.5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{meta.label}</span>
                        <span className="inline-flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300 min-w-[1.5rem] h-5 px-1.5">
                          {colonne.length}
                        </span>
                      </div>
                      <div className="flex-1 p-2 space-y-2 min-h-[120px]">
                        {colonne.length === 0 ? (
                          <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">—</p>
                        ) : (
                          colonne.map((f) => (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => router.push(`/commercial/factures/${f.id}`)}
                              className="w-full text-left rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2.5 hover:border-red-400 dark:hover:border-red-600 hover:shadow-sm transition"
                            >
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="font-mono text-[10px] text-gray-500 dark:text-gray-400">{f.numero}</span>
                                <span className="font-semibold text-xs text-gray-900 dark:text-gray-100">{formatCurrency(f.montantTTC)}</span>
                              </div>
                              <p className="text-xs text-gray-800 dark:text-gray-200 truncate mb-1">
                                {f.entreprise?.nom || <span className="text-gray-400">—</span>}
                              </p>
                              <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                Échéance {formatDate(f.dateEcheance)}
                              </p>
                              {f.devis && (
                                <p className="text-[10px] text-blue-500 dark:text-blue-400 mt-1 font-mono">{f.devis.numero}</p>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : loadingFactures ? (
            <SkeletonTable rows={5} cols={7} />
          ) : factures.length === 0 ? (
            <EmptyState icon={Receipt} title="Aucune facture" description="Vos factures apparaîtront ici" />
          ) : factureView === "cartes" ? (
            /* ── Vue Cartes : grille responsive ── */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {factures.map((f) => {
                const st = FACTURE_STATUTS[f.statut as keyof typeof FACTURE_STATUTS];
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => router.push(`/commercial/factures/${f.id}`)}
                    className="text-left rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 hover:border-red-400 dark:hover:border-red-600 hover:shadow-md transition"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{f.numero}</span>
                      {st && <StatutBadge label={st.label} color={st.color} />}
                    </div>
                    <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate mb-1">
                      {f.entreprise?.nom || <span className="text-gray-400">—</span>}
                    </h3>
                    {f.devis && (
                      <p className="text-xs text-blue-500 dark:text-blue-400 font-mono mb-2">{f.devis.numero}</p>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Échéance {formatDate(f.dateEcheance)}</span>
                      <span className="font-bold text-sm text-gray-900 dark:text-gray-100">{formatCurrency(f.montantTTC)}</span>
                    </div>
                    {f.datePaiement && (
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-2">Payée le {formatDate(f.datePaiement)}</p>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            /* ── Vue Liste : table ── */
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-x-auto">
              <table className="min-w-[640px] w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Numéro</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Client</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 hidden sm:table-cell">Devis</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Montant TTC</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Échéance</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Statut</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 hidden sm:table-cell">Date paiement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {factures.map((f) => {
                    const st = FACTURE_STATUTS[f.statut as keyof typeof FACTURE_STATUTS];
                    return (
                      <tr
                        key={f.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer transition-colors"
                        onClick={() => router.push(`/commercial/factures/${f.id}`)}
                      >
                        <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">{f.numero}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                          {f.entreprise?.nom || <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs hidden sm:table-cell">
                          {f.devis ? (
                            <span className="text-blue-500 dark:text-blue-400">{f.devis.numero}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100">
                          {formatCurrency(f.montantTTC)}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(f.dateEcheance)}
                        </td>
                        <td className="px-4 py-3">
                          {st && <StatutBadge label={st.label} color={st.color} />}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                          {f.datePaiement ? formatDate(f.datePaiement) : <span className="text-gray-400">—</span>}
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
