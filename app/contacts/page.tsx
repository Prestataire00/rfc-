"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Users, Search, Download, Plus, Mail, Phone, Building2, UserPlus, UserCheck, User } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Pagination } from "@/components/shared/Pagination";
import { SkeletonTable } from "@/components/shared/Skeleton";
import { Input } from "@/components/ui/input";
import { CONTACT_TYPES } from "@/lib/constants";

interface Contact {
  id: string;
  nom: string;
  prenom: string;
  email: string | null;
  telephone: string | null;
  type: keyof typeof CONTACT_TYPES;
  poste: string | null;
  entreprise: { id: string; nom: string } | null;
  createdAt: string;
}

const TYPE_TABS = [
  { value: "", label: "Tous", icon: Users },
  { value: "prospect", label: "Prospects", icon: UserPlus },
  { value: "client", label: "Clients", icon: UserCheck },
  { value: "stagiaire", label: "Stagiaires", icon: User },
];

export default function ContactsPage() {
  const searchParams = useSearchParams();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState(searchParams.get("type") ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const urlType = searchParams.get("type") ?? "";
    if (urlType !== typeFilter) setTypeFilter(urlType);
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => { setPage(1); }, [debouncedSearch, typeFilter]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (typeFilter) params.set("type", typeFilter);
    params.set("page", String(page));
    params.set("limit", "25");

    setLoading(true);
    fetch(`/api/contacts?${params.toString()}`)
      .then((res) => res.ok ? res.json() : { data: [], total: 0, page: 1, totalPages: 1 })
      .then((res) => {
        setContacts(res.data ?? []);
        setTotal(res.total ?? 0);
        setTotalPages(res.totalPages ?? 1);
      })
      .catch(() => setContacts([]))
      .finally(() => setLoading(false));
  }, [debouncedSearch, typeFilter, page]);

  const typeInfo = (type: string) => CONTACT_TYPES[type as keyof typeof CONTACT_TYPES];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Contacts</h1>
          <p className="text-sm text-gray-400 mt-0.5">{total} contact{total > 1 ? "s" : ""} au total</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.open("/api/export/contacts", "_blank")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-xs font-medium text-gray-300 hover:bg-gray-700 transition-colors"
          >
            <Download className="h-3.5 w-3.5" /> Export
          </button>
          <Link
            href="/contacts/nouveau"
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 px-4 py-2 text-sm font-medium text-white transition-colors"
          >
            <Plus className="h-4 w-4" /> Nouveau contact
          </Link>
        </div>
      </div>

      {/* Type tabs + Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        <div className="flex gap-1 bg-gray-900 rounded-lg p-1 border border-gray-700">
          {TYPE_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = typeFilter === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setTypeFilter(tab.value)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  active
                    ? "bg-red-600 text-white shadow-sm"
                    : "text-gray-400 hover:text-gray-200 hover:bg-gray-700/50"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-gray-800 border-gray-700 h-9 text-sm"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <SkeletonTable rows={8} cols={5} />
      ) : contacts.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Aucun contact trouve"
          description={search || typeFilter ? "Essayez d'autres filtres." : "Ajoutez votre premier contact."}
          actionLabel={search || typeFilter ? undefined : "Nouveau contact"}
          actionHref={search || typeFilter ? undefined : "/contacts/nouveau"}
        />
      ) : (
        <div className="space-y-2">
          {contacts.map((contact) => {
            const ti = typeInfo(contact.type);
            return (
              <Link
                key={contact.id}
                href={`/contacts/${contact.id}`}
                className="group flex items-center gap-4 rounded-xl border border-gray-700 bg-gray-800 hover:bg-gray-750 hover:border-red-700/40 px-4 py-3.5 transition-all shadow-sm"
              >
                {/* Avatar */}
                <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                  contact.type === "prospect" ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30" :
                  contact.type === "client" ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30" :
                  "bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/30"
                }`}>
                  {contact.prenom[0]}{contact.nom[0]}
                </div>

                {/* Info principale */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-100 group-hover:text-red-400 transition-colors truncate">
                      {contact.prenom} {contact.nom}
                    </span>
                    {ti && (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        contact.type === "prospect" ? "bg-amber-500/15 text-amber-300" :
                        contact.type === "client" ? "bg-emerald-500/15 text-emerald-300" :
                        "bg-blue-500/15 text-blue-300"
                      }`}>
                        {ti.label}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    {contact.poste && <span className="text-xs text-gray-500">{contact.poste}</span>}
                    {contact.entreprise && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Building2 className="h-3 w-3" /> {contact.entreprise.nom}
                      </span>
                    )}
                  </div>
                </div>

                {/* Contact info */}
                <div className="hidden md:flex items-center gap-4 text-xs text-gray-400 shrink-0">
                  {contact.email && (
                    <span className="flex items-center gap-1 max-w-[200px] truncate">
                      <Mail className="h-3 w-3 shrink-0" /> {contact.email}
                    </span>
                  )}
                  {contact.telephone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3 shrink-0" /> {contact.telephone}
                    </span>
                  )}
                </div>

                {/* Fleche */}
                <div className="text-gray-600 group-hover:text-gray-400 transition-colors shrink-0">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {!loading && contacts.length > 0 && (
        <div className="mt-4">
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
