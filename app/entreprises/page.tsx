"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Building2, Search, Plus, MapPin, Globe } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { SkeletonTable } from "@/components/shared/Skeleton";
import { Input } from "@/components/ui/input";
import { useApi } from "@/hooks/useApi";

interface Entreprise {
  id: string;
  nom: string;
  siret: string | null;
  email: string | null;
  telephone: string | null;
  site: string | null;
  secteur: string | null;
  ville: string | null;
  codePostal: string | null;
  createdAt: string;
  _count: { contacts: number };
}

export default function EntreprisesPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const url = debouncedSearch
    ? `/api/entreprises?search=${encodeURIComponent(debouncedSearch)}`
    : "/api/entreprises";

  const { data, isLoading } = useApi<Entreprise[]>(url);
  const entreprises = data ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Entreprises</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {entreprises.length} entreprise{entreprises.length > 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/entreprises/nouveau"
          className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 px-4 py-2 text-sm font-medium text-white transition-colors"
        >
          <Plus className="h-4 w-4" /> Nouvelle entreprise
        </Link>
      </div>

      <div className="relative w-full sm:w-72 mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
        <Input
          placeholder="Rechercher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-gray-800 border-gray-700 h-9 text-sm"
        />
      </div>

      {isLoading ? (
        <SkeletonTable rows={6} cols={4} />
      ) : entreprises.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Aucune entreprise"
          description={search ? "Essayez un autre terme de recherche." : "Créez votre première entreprise."}
          actionLabel={search ? undefined : "Nouvelle entreprise"}
          actionHref={search ? undefined : "/entreprises/nouveau"}
        />
      ) : (
        <div className="space-y-2">
          {entreprises.map((e) => (
            <Link
              key={e.id}
              href={`/entreprises/${e.id}`}
              className="group flex items-center gap-4 rounded-xl border border-gray-700 bg-gray-800 hover:bg-gray-750 hover:border-red-700/40 px-4 py-3.5 transition-all shadow-sm"
            >
              <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0 bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/30">
                <Building2 className="h-5 w-5" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-100 group-hover:text-red-400 transition-colors truncate">
                    {e.nom}
                  </span>
                  {e.secteur && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-700 text-gray-300">
                      {e.secteur}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                  {e.ville && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {e.codePostal} {e.ville}
                    </span>
                  )}
                  {e.site && (
                    <span className="flex items-center gap-1">
                      <Globe className="h-3 w-3" /> {e.site.replace(/^https?:\/\//, "")}
                    </span>
                  )}
                  <span className="text-gray-500">
                    {e._count.contacts} contact{e._count.contacts > 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              <div className="text-gray-600 group-hover:text-gray-400 transition-colors shrink-0">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
