"use client";

// Page liste des entreprises — précédemment accessibles uniquement via les
// fiches contact/devis (pas d'entrée dédiée dans la sidebar). Adresse le
// gap d'IA identifié lors de la restructuration nav.

import { useState, useEffect } from "react";
import Link from "next/link";
import { Building2, Search, Plus, MapPin, FileText, Receipt } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Pagination } from "@/components/shared/Pagination";
import { SkeletonTable } from "@/components/shared/Skeleton";
import { Input } from "@/components/ui/input";
import { useApi } from "@/hooks/useApi";
import { formatCurrency } from "@/lib/utils";

interface Entreprise {
  id: string;
  nom: string;
  siret: string | null;
  secteur: string | null;
  ville: string | null;
  codePostal: string | null;
  telephone: string | null;
  email: string | null;
  effectif: number | null;
  typeEntreprise: string | null; // TPE, PME, ETI, GE
  _count?: {
    contacts: number;
    devis: number;
    factures: number;
  };
}

type ApiResponse = { data: Entreprise[]; total: number; totalPages: number } | Entreprise[];

export default function EntreprisesPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const params = new URLSearchParams();
  if (debouncedSearch) params.set("search", debouncedSearch);
  params.set("page", String(page));
  params.set("limit", "25");

  const { data, isLoading } = useApi<ApiResponse>(`/api/entreprises?${params.toString()}`);

  const entreprises: Entreprise[] = Array.isArray(data) ? data : data?.data ?? [];
  const total = Array.isArray(data) ? entreprises.length : data?.total ?? entreprises.length;
  const totalPages = Array.isArray(data) ? 1 : data?.totalPages ?? 1;

  return (
    <div className="p-6">
      <PageHeader
        title="Entreprises"
        description={`${total} entreprise${total > 1 ? "s" : ""} cliente${total > 1 ? "s" : ""}`}
        actionLabel="Nouvelle entreprise"
        actionHref="/entreprises/nouveau"
      />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <Input
            type="search"
            placeholder="Rechercher par nom, SIRET, secteur…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <SkeletonTable rows={5} cols={6} />
      ) : entreprises.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={debouncedSearch ? "Aucune entreprise trouvée" : "Aucune entreprise"}
          description={debouncedSearch ? "Essayez avec d'autres mots-clés" : "Créez votre première entreprise cliente"}
          actionLabel="Nouvelle entreprise"
          actionHref="/entreprises/nouveau"
        />
      ) : (
        <>
          <div className="rounded-lg border border-gray-700 bg-gray-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-900 border-b border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-400">Nom</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-400">SIRET</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-400">Secteur</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-400">Ville</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-400">Effectif</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-400">Activité</th>
                </tr>
              </thead>
              <tbody>
                {entreprises.map((e) => (
                  <tr key={e.id} className="border-b border-gray-700 hover:bg-gray-750 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/entreprises/${e.id}`} className="text-red-500 hover:underline font-medium">
                        {e.nom}
                      </Link>
                      {e.typeEntreprise && (
                        <span className="ml-2 text-xs text-gray-500">({e.typeEntreprise})</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs font-mono">{e.siret ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-400">{e.secteur ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {e.ville ? (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {e.codePostal ?? ""} {e.ville}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{e.effectif ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-right">
                      <div className="inline-flex items-center gap-3 text-gray-400">
                        {e._count?.contacts !== undefined && (
                          <span title={`${e._count.contacts} contact${e._count.contacts > 1 ? "s" : ""}`}>
                            👤 {e._count.contacts}
                          </span>
                        )}
                        {e._count?.devis !== undefined && (
                          <span title={`${e._count.devis} devis`}>
                            <FileText className="inline h-3 w-3" /> {e._count.devis}
                          </span>
                        )}
                        {e._count?.factures !== undefined && (
                          <span title={`${e._count.factures} facture${e._count.factures > 1 ? "s" : ""}`}>
                            <Receipt className="inline h-3 w-3" /> {e._count.factures}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </>
      )}
    </div>
  );
}
