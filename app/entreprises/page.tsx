"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Building2, Search } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Input } from "@/components/ui/input";

interface Entreprise {
  id: string;
  nom: string;
  secteur: string | null;
  ville: string | null;
  siret: string | null;
  email: string | null;
  telephone: string | null;
  _count: {
    contacts: number;
  };
  createdAt: string;
}

export default function EntreprisesPage() {
  const [entreprises, setEntreprises] = useState<Entreprise[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);

    setLoading(true);
    fetch(`/api/entreprises?${params.toString()}`)
      .then((res) => res.ok ? res.json() : [])
      .then((data) => setEntreprises(Array.isArray(data) ? data : []))
      .catch(() => setEntreprises([]))
      .finally(() => setLoading(false));
  }, [debouncedSearch]);

  return (
    <div className="p-6">
      <PageHeader
        title="Entreprises"
        description="Gérez vos entreprises clientes et prospects"
        actionLabel="Nouvelle entreprise"
        actionHref="/entreprises/nouveau"
      />

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Rechercher une entreprise..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
        ) : entreprises.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="Aucune entreprise trouvée"
            description={
              search
                ? "Aucune entreprise ne correspond à votre recherche."
                : "Commencez par ajouter votre première entreprise."
            }
            actionLabel={search ? undefined : "Nouvelle entreprise"}
            actionHref={search ? undefined : "/entreprises/nouveau"}
          />
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nom
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Secteur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ville
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SIRET
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contacts
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {entreprises.map((entreprise) => (
                <tr key={entreprise.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/entreprises/${entreprise.id}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {entreprise.nom}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {entreprise.secteur || <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {entreprise.ville || <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                    {entreprise.siret || <span className="text-gray-400 font-sans">—</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                      {entreprise._count.contacts} contact{entreprise._count.contacts !== 1 ? "s" : ""}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && entreprises.length > 0 && (
        <p className="text-sm text-gray-500 mt-3">
          {entreprises.length} entreprise{entreprises.length > 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
