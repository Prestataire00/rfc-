"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Plus, Receipt } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatutBadge } from "@/components/shared/StatutBadge";
import { DEVIS_STATUTS, FACTURE_STATUTS } from "@/lib/constants";
import { formatDate, formatCurrency, cn } from "@/lib/utils";

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
  { key: "accepte", label: "Accepté", color: "bg-green-900/20 border-green-700" },
  { key: "refuse", label: "Refusé", color: "bg-red-900/20 border-red-300" },
  { key: "expire", label: "Expiré", color: "bg-orange-900/20 border-orange-700" },
] as const;

export default function CommercialPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"devis" | "factures">("devis");
  const [devis, setDevis] = useState<Devis[]>([]);
  const [factures, setFactures] = useState<Facture[]>([]);
  const [loadingDevis, setLoadingDevis] = useState(true);
  const [loadingFactures, setLoadingFactures] = useState(true);
  const [filtreStatutFacture, setFiltreStatutFacture] = useState("");

  const fetchDevis = useCallback(async () => {
    setLoadingDevis(true);
    const res = await fetch("/api/devis");
    if (res.ok) setDevis(await res.json());
    setLoadingDevis(false);
  }, []);

  const fetchFactures = useCallback(async () => {
    setLoadingFactures(true);
    const params = new URLSearchParams();
    if (filtreStatutFacture) params.set("statut", filtreStatutFacture);
    const res = await fetch(`/api/factures?${params}`);
    if (res.ok) setFactures(await res.json());
    setLoadingFactures(false);
  }, [filtreStatutFacture]);

  useEffect(() => {
    fetchDevis();
  }, [fetchDevis]);

  useEffect(() => {
    fetchFactures();
  }, [fetchFactures]);

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

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-700 p-1 rounded-lg w-fit">
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
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
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
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
            </div>
          ) : factures.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="Aucune facture"
              description="Vos factures apparaîtront ici"
            />
          ) : (
            <div className="rounded-lg border bg-gray-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-900 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-400">Numéro</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-400">Client</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-400">Montant TTC</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-400">Échéance</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-400">Statut</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-400">Date paiement</th>
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
                        <td className="px-4 py-3 font-semibold text-gray-200">
                          {formatCurrency(f.montantTTC)}
                        </td>
                        <td className="px-4 py-3 text-gray-400">
                          {formatDate(f.dateEcheance)}
                        </td>
                        <td className="px-4 py-3">
                          {st && <StatutBadge label={st.label} color={st.color} />}
                        </td>
                        <td className="px-4 py-3 text-gray-400">
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
        </>
      )}
    </div>
  );
}
