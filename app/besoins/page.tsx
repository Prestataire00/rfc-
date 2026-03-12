"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardList, Plus, Filter } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatutBadge } from "@/components/shared/StatutBadge";
import { BESOIN_STATUTS, BESOIN_PRIORITES, BESOIN_ORIGINES } from "@/lib/constants";
import { formatDate, formatCurrency } from "@/lib/utils";

type Besoin = {
  id: string;
  titre: string;
  origine: string;
  statut: string;
  priorite: string;
  nbStagiaires: number | null;
  budget: number | null;
  createdAt: string;
  entreprise: { id: string; nom: string } | null;
  formation: { id: string; titre: string } | null;
  devis: { id: string; numero: string; statut: string } | null;
};

const PIPELINE_COLS = [
  { key: "nouveau", label: "Nouveau", color: "bg-blue-50 border-blue-300" },
  { key: "qualifie", label: "Qualifie", color: "bg-indigo-50 border-indigo-300" },
  { key: "devis_envoye", label: "Devis envoye", color: "bg-yellow-50 border-yellow-300" },
  { key: "accepte", label: "Accepte", color: "bg-green-50 border-green-300" },
  { key: "refuse", label: "Refuse", color: "bg-red-50 border-red-300" },
];

export default function BesoinsPage() {
  const router = useRouter();
  const [besoins, setBesoins] = useState<Besoin[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"kanban" | "list">("kanban");

  const fetchBesoins = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/besoins");
    if (res.ok) setBesoins(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBesoins();
  }, [fetchBesoins]);

  const besoinsByStatut = PIPELINE_COLS.reduce((acc, col) => {
    acc[col.key] = besoins.filter((b) => b.statut === col.key);
    return acc;
  }, {} as Record<string, Besoin[]>);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Gestion des Besoins"
        description="Qualifiez et suivez les demandes de formation"
      />

      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setView("kanban")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === "kanban" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600"}`}
          >
            Pipeline
          </button>
          <button
            onClick={() => setView("list")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === "list" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600"}`}
          >
            Liste
          </button>
        </div>
        <Link
          href="/besoins/nouveau"
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> Nouveau besoin
        </Link>
      </div>

      {besoins.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Aucun besoin de formation"
          description="Creez votre premier besoin de formation"
          actionLabel="Nouveau besoin"
          actionHref="/besoins/nouveau"
        />
      ) : view === "kanban" ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {PIPELINE_COLS.map((col) => {
            const colBesoins = besoinsByStatut[col.key] || [];
            return (
              <div key={col.key} className={`flex-shrink-0 w-64 rounded-lg border-2 p-3 ${col.color}`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">{col.label}</h3>
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white text-xs font-medium text-gray-600 border">
                    {colBesoins.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {colBesoins.map((b) => {
                    const prio = BESOIN_PRIORITES[b.priorite as keyof typeof BESOIN_PRIORITES];
                    return (
                      <div
                        key={b.id}
                        onClick={() => router.push(`/besoins/${b.id}`)}
                        className="bg-white rounded-md border border-gray-200 p-3 cursor-pointer hover:shadow-md transition-all"
                      >
                        <p className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">{b.titre}</p>
                        {b.entreprise && <p className="text-xs text-gray-500 mb-1">{b.entreprise.nom}</p>}
                        {b.formation && <p className="text-xs text-indigo-600 mb-1">{b.formation.titre}</p>}
                        <div className="flex items-center justify-between mt-2">
                          <span className={`text-xs font-medium ${prio?.color || ""}`}>{prio?.label}</span>
                          {b.nbStagiaires && <span className="text-xs text-gray-400">{b.nbStagiaires} stag.</span>}
                        </div>
                        {b.budget && <p className="text-xs text-gray-500 mt-1">Budget: {formatCurrency(b.budget)}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Titre</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Entreprise</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Formation</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Origine</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Priorite</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Statut</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
              </tr>
            </thead>
            <tbody>
              {besoins.map((b) => {
                const st = BESOIN_STATUTS[b.statut as keyof typeof BESOIN_STATUTS];
                const prio = BESOIN_PRIORITES[b.priorite as keyof typeof BESOIN_PRIORITES];
                return (
                  <tr
                    key={b.id}
                    className="border-b last:border-0 hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/besoins/${b.id}`)}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{b.titre}</td>
                    <td className="px-4 py-3 text-gray-600">{b.entreprise?.nom || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{b.formation?.titre || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{BESOIN_ORIGINES[b.origine as keyof typeof BESOIN_ORIGINES]?.label || b.origine}</td>
                    <td className="px-4 py-3"><span className={`font-medium ${prio?.color}`}>{prio?.label}</span></td>
                    <td className="px-4 py-3">{st && <StatutBadge label={st.label} color={st.color} />}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(b.createdAt)}</td>
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
