"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { GraduationCap, Search } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Input } from "@/components/ui/input";
import { formatCurrency, parseSpecialites } from "@/lib/utils";

interface Formateur {
  id: string;
  nom: string;
  prenom: string;
  email: string | null;
  telephone: string | null;
  specialites: string;
  tarifJournalier: number | null;
  _count: {
    sessions: number;
  };
}

export default function FormateursPage() {
  const [formateurs, setFormateurs] = useState<Formateur[]>([]);
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
    fetch(`/api/formateurs?${params.toString()}`)
      .then((res) => res.ok ? res.json() : [])
      .then((data) => setFormateurs(Array.isArray(data) ? data : []))
      .catch(() => setFormateurs([]))
      .finally(() => setLoading(false));
  }, [debouncedSearch]);

  return (
    <div className="p-6">
      <PageHeader
        title="Formateurs"
        description="Gérez votre équipe de formateurs"
        actionLabel="Nouveau formateur"
        actionHref="/formateurs/nouveau"
      />

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Rechercher un formateur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-sm overflow-x-auto rounded-lg">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
          </div>
        ) : formateurs.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="Aucun formateur trouvé"
            description={
              search
                ? "Aucun formateur ne correspond à votre recherche."
                : "Commencez par ajouter votre premier formateur."
            }
            actionLabel={search ? undefined : "Nouveau formateur"}
            actionHref={search ? undefined : "/formateurs/nouveau"}
          />
        ) : (
          <table className="min-w-[640px] w-full divide-y divide-gray-200">
            <thead className="bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Nom
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider hidden sm:table-cell">
                  Téléphone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider hidden sm:table-cell">
                  Spécialités
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Tarif journalier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Sessions
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-200">
              {formateurs.map((formateur) => {
                const specialites = parseSpecialites(formateur.specialites);
                return (
                  <tr key={formateur.id} className="hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/formateurs/${formateur.id}`}
                        className="text-sm font-medium text-red-600 hover:text-red-800 hover:underline"
                      >
                        {formateur.prenom} {formateur.nom}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {formateur.email ? (
                        <a href={`mailto:${formateur.email}`} className="hover:text-red-600 hover:underline">
                          {formateur.email}
                        </a>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 hidden sm:table-cell">
                      {formateur.telephone || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {specialites.length > 0 ? (
                          specialites.slice(0, 3).map((s, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center rounded-full bg-red-900/20 px-2 py-0.5 text-xs font-medium text-red-400"
                            >
                              {s}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                        {specialites.length > 3 && (
                          <span className="inline-flex items-center rounded-full bg-gray-700 px-2 py-0.5 text-xs font-medium text-gray-400">
                            +{specialites.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-100">
                      {formateur.tarifJournalier != null
                        ? formatCurrency(formateur.tarifJournalier)
                        : <span className="text-gray-400 font-normal">—</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center rounded-full bg-gray-700 px-2.5 py-0.5 text-xs font-medium text-gray-300">
                        {formateur._count.sessions} session{formateur._count.sessions !== 1 ? "s" : ""}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {!loading && formateurs.length > 0 && (
        <p className="text-sm text-gray-400 mt-3">
          {formateurs.length} formateur{formateurs.length > 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
