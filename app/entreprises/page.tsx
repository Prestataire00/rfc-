"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Building2, Search, Download, Plus, MapPin, Users, Hash, Mail, Phone } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { Input } from "@/components/ui/input";
import { useApi } from "@/hooks/useApi";

interface Entreprise {
  id: string;
  nom: string;
  secteur: string | null;
  ville: string | null;
  codePostal: string | null;
  siret: string | null;
  email: string | null;
  telephone: string | null;
  _count: { contacts: number };
  createdAt: string;
}

export default function EntreprisesPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const url = useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    return `/api/entreprises?${params.toString()}`;
  }, [debouncedSearch]);

  const { data, isLoading } = useApi<Entreprise[]>(url);
  const entreprises = Array.isArray(data) ? data : [];
  const loading = isLoading;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Entreprises</h1>
          <p className="text-sm text-gray-400 mt-0.5">{entreprises.length} entreprise{entreprises.length > 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/api/export/entreprises" download className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-xs text-gray-300 hover:bg-gray-700 transition-colors">
            <Download className="h-3.5 w-3.5" /> Export
          </a>
          <Link href="/entreprises/nouveau" className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 px-4 py-2 text-sm font-medium text-white transition-colors">
            <Plus className="h-4 w-4" /> Nouvelle entreprise
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="relative w-full sm:w-80 mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
        <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-gray-800 border-gray-700 h-9 text-sm" />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="h-6 w-6 animate-spin rounded-full border-2 border-red-600 border-t-transparent" /></div>
      ) : entreprises.length === 0 ? (
        <EmptyState icon={Building2} title="Aucune entreprise" description={search ? "Aucun resultat." : "Ajoutez votre premiere entreprise."} actionLabel={search ? undefined : "Nouvelle entreprise"} actionHref={search ? undefined : "/entreprises/nouveau"} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {entreprises.map((e) => (
            <Link
              key={e.id}
              href={`/entreprises/${e.id}`}
              className="group rounded-xl border border-gray-700 bg-gray-800 hover:border-red-700/40 p-4 transition-all"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="h-10 w-10 rounded-lg bg-red-500/10 ring-1 ring-red-500/20 flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5 text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-100 text-sm group-hover:text-red-400 transition-colors truncate">{e.nom}</h3>
                  {e.secteur && <p className="text-xs text-gray-500 mt-0.5">{e.secteur}</p>}
                </div>
                <div className="shrink-0">
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-900 px-2 py-0.5 text-[10px] font-medium text-gray-300 ring-1 ring-gray-700">
                    <Users className="h-3 w-3" /> {e._count.contacts}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                {e.ville && (
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-gray-500" /> {e.ville}</span>
                )}
                {e.siret && (
                  <span className="flex items-center gap-1 font-mono text-[11px]"><Hash className="h-3 w-3 text-gray-500" /> {e.siret}</span>
                )}
                {e.email && (
                  <span className="flex items-center gap-1 truncate max-w-[180px]"><Mail className="h-3 w-3 text-gray-500" /> {e.email}</span>
                )}
                {e.telephone && (
                  <span className="flex items-center gap-1"><Phone className="h-3 w-3 text-gray-500" /> {e.telephone}</span>
                )}
                {!e.ville && !e.siret && !e.email && !e.telephone && (
                  <span className="text-gray-600 italic">Aucune info complementaire</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
