"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Users, Search, Download } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatutBadge } from "@/components/shared/StatutBadge";
import { Input } from "@/components/ui/input";
import { CONTACT_TYPES } from "@/lib/constants";

interface Entreprise {
  id: string;
  nom: string;
}

interface Contact {
  id: string;
  nom: string;
  prenom: string;
  email: string | null;
  telephone: string | null;
  type: keyof typeof CONTACT_TYPES;
  poste: string | null;
  entreprise: Entreprise | null;
  createdAt: string;
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (typeFilter) params.set("type", typeFilter);

    setLoading(true);
    fetch(`/api/contacts?${params.toString()}`)
      .then((res) => res.ok ? res.json() : [])
      .then((data) => {
        setContacts(Array.isArray(data) ? data : []);
      })
      .catch(() => setContacts([]))
      .finally(() => setLoading(false));
  }, [debouncedSearch, typeFilter]);

  return (
    <div className="p-6">
      <PageHeader
        title="Contacts"
        description="Gérez vos clients, prospects et stagiaires"
        actionLabel="Nouveau contact"
        actionHref="/contacts/nouveau"
      />

      {/* Export button */}
      <div className="flex justify-end mb-4 -mt-4">
        <button
          onClick={() => window.open("/api/export/contacts", "_blank")}
          className="inline-flex items-center gap-2 rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors"
        >
          <Download className="h-4 w-4" />
          Exporter CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Rechercher un contact..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Tous les types</option>
          {Object.entries(CONTACT_TYPES).map(([key, val]) => (
            <option key={key} value={key}>
              {val.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
          </div>
        ) : contacts.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Aucun contact trouvé"
            description={
              search || typeFilter
                ? "Aucun contact ne correspond à votre recherche."
                : "Commencez par ajouter votre premier contact."
            }
            actionLabel={search || typeFilter ? undefined : "Nouveau contact"}
            actionHref={search || typeFilter ? undefined : "/contacts/nouveau"}
          />
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Nom
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Téléphone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Entreprise
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-200">
              {contacts.map((contact) => {
                const typeInfo = CONTACT_TYPES[contact.type];
                return (
                  <tr key={contact.id} className="hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/contacts/${contact.id}`}
                        className="text-sm font-medium text-red-600 hover:text-red-800 hover:underline"
                      >
                        {contact.prenom} {contact.nom}
                      </Link>
                      {contact.poste && (
                        <p className="text-xs text-gray-400 mt-0.5">{contact.poste}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {contact.email ? (
                        <a
                          href={`mailto:${contact.email}`}
                          className="hover:text-red-600 hover:underline"
                        >
                          {contact.email}
                        </a>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {contact.telephone || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {typeInfo && (
                        <StatutBadge label={typeInfo.label} color={typeInfo.color} />
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {contact.entreprise ? (
                        <Link
                          href={`/entreprises/${contact.entreprise.id}`}
                          className="hover:text-red-600 hover:underline"
                        >
                          {contact.entreprise.nom}
                        </Link>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {!loading && contacts.length > 0 && (
        <p className="text-sm text-gray-400 mt-3">
          {contacts.length} contact{contacts.length > 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
