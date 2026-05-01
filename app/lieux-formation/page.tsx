"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { MapPin, Search, Pencil, Trash2, Users, Phone, Mail, Accessibility } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/fetcher";

interface LieuFormation {
  id: string;
  nom: string;
  ville: string | null;
  adresse: string | null;
  codePostal: string | null;
  capacite: number | null;
  tarifJournee: number | null;
  contactNom: string | null;
  contactTelephone: string | null;
  contactEmail: string | null;
  accessibilitePMR: boolean;
  actif: boolean;
  _count: {
    sessions: number;
  };
}

export default function LieuxFormationPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const url = useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    return `/api/lieux-formation?${params.toString()}`;
  }, [debouncedSearch]);

  const { data, isLoading, mutate } = useApi<{ lieux: LieuFormation[] }>(url);
  const lieux: LieuFormation[] = data?.lieux ?? [];
  const loading = isLoading;

  const handleDelete = async (id: string) => {
    if (!window.confirm("Supprimer ce lieu de formation ?")) return;
    try {
      await api.delete(`/api/lieux-formation/${id}`);
      await mutate();
    } catch { /* silent */ }
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Lieux de formation"
        description="Gérez vos sites et salles de formation"
        actionLabel="Nouveau lieu"
        actionHref="/lieux-formation/nouveau"
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Rechercher un lieu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
        </div>
      ) : lieux.length === 0 ? (
        <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-sm">
          <EmptyState
            icon={MapPin}
            title="Aucun lieu de formation"
            description={search ? "Aucun lieu ne correspond à votre recherche." : "Ajoutez votre premier lieu de formation."}
            actionLabel={search ? undefined : "Nouveau lieu"}
            actionHref={search ? undefined : "/lieux-formation/nouveau"}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {lieux.map((lieu) => (
            <div
              key={lieu.id}
              className="bg-gray-800 rounded-lg border border-gray-700 shadow-sm p-5 flex flex-col gap-3 hover:border-gray-600 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-full bg-blue-900/30 flex items-center justify-center shrink-0">
                    <MapPin className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <Link
                      href={`/lieux-formation/${lieu.id}`}
                      className="text-sm font-medium text-red-600 hover:underline"
                    >
                      {lieu.nom}
                    </Link>
                    {lieu.ville && (
                      <p className="text-xs text-gray-400">{lieu.codePostal} {lieu.ville}</p>
                    )}
                  </div>
                </div>
                {lieu.accessibilitePMR && (
                  <span title="Accessible PMR"><Accessibility className="h-4 w-4 text-blue-400 shrink-0" /></span>
                )}
              </div>

              <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                {lieu.capacite && (
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3 w-3" /> {lieu.capacite} places
                  </span>
                )}
                {lieu.tarifJournee && (
                  <span>{formatCurrency(lieu.tarifJournee)}/jour</span>
                )}
                <span className="inline-flex items-center gap-1">
                  {lieu._count.sessions} session{lieu._count.sessions !== 1 ? "s" : ""}
                </span>
              </div>

              {(lieu.contactNom || lieu.contactTelephone || lieu.contactEmail) && (
                <div className="text-xs text-gray-400 space-y-1">
                  {lieu.contactNom && <p>{lieu.contactNom}</p>}
                  <div className="flex gap-3">
                    {lieu.contactTelephone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {lieu.contactTelephone}
                      </span>
                    )}
                    {lieu.contactEmail && (
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {lieu.contactEmail}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-1 mt-auto pt-2 border-t border-gray-700">
                <Link
                  href={`/lieux-formation/${lieu.id}/modifier`}
                  className="inline-flex items-center justify-center h-8 w-8 rounded-md text-gray-400 hover:text-gray-100 hover:bg-gray-600 transition-colors"
                  title="Modifier"
                >
                  <Pencil className="h-4 w-4" />
                </Link>
                <button
                  onClick={() => handleDelete(lieu.id)}
                  className="inline-flex items-center justify-center h-8 w-8 rounded-md text-gray-400 hover:text-red-400 hover:bg-gray-600 transition-colors"
                  title="Supprimer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
