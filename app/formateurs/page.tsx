"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  GraduationCap, Search, Mail, Phone, Euro, BookOpen, Star,
  LayoutGrid, List, Plus, Users,
} from "lucide-react";
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
  photo: string | null;
  actif: boolean;
  _count: {
    sessions: number;
  };
}

// Couleurs d'avatar basees sur les initiales
const AVATAR_COLORS = [
  "from-red-500 to-red-700",
  "from-blue-500 to-blue-700",
  "from-emerald-500 to-emerald-700",
  "from-purple-500 to-purple-700",
  "from-amber-500 to-amber-700",
  "from-cyan-500 to-cyan-700",
  "from-pink-500 to-pink-700",
  "from-indigo-500 to-indigo-700",
];

function getAvatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function getInitials(prenom: string, nom: string): string {
  return `${prenom[0] || ""}${nom[0] || ""}`.toUpperCase();
}

export default function FormateursPage() {
  const [formateurs, setFormateurs] = useState<Formateur[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

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

  const actifs = formateurs.filter((f) => f.actif);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Formateurs</h1>
          <p className="text-sm text-gray-400 mt-1">Gerez votre equipe de formateurs</p>
        </div>
        <Link
          href="/formateurs/nouveau"
          className="inline-flex items-center gap-2 rounded-md bg-red-600 hover:bg-red-700 px-4 py-2 text-sm font-medium text-white transition-colors"
        >
          <Plus className="h-4 w-4" /> Nouveau formateur
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-red-900/30 flex items-center justify-center">
              <Users className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-100">{formateurs.length}</p>
              <p className="text-xs text-gray-400">Formateurs</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-900/30 flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-100">{actifs.length}</p>
              <p className="text-xs text-gray-400">Actifs</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-900/30 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-100">{formateurs.reduce((s, f) => s + f._count.sessions, 0)}</p>
              <p className="text-xs text-gray-400">Sessions totales</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search + view toggle */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Rechercher un formateur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <button onClick={() => setViewMode("grid")} className={`h-10 w-10 inline-flex items-center justify-center rounded-md transition-colors ${viewMode === "grid" ? "bg-gray-700 text-gray-100" : "text-gray-400 hover:text-gray-300 hover:bg-gray-700"}`}>
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button onClick={() => setViewMode("list")} className={`h-10 w-10 inline-flex items-center justify-center rounded-md transition-colors ${viewMode === "list" ? "bg-gray-700 text-gray-100" : "text-gray-400 hover:text-gray-300 hover:bg-gray-700"}`}>
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
        </div>
      ) : formateurs.length === 0 ? (
        <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-sm">
          <EmptyState
            icon={GraduationCap}
            title="Aucun formateur trouve"
            description={search ? "Aucun formateur ne correspond a votre recherche." : "Commencez par ajouter votre premier formateur."}
            actionLabel={search ? undefined : "Nouveau formateur"}
            actionHref={search ? undefined : "/formateurs/nouveau"}
          />
        </div>
      ) : viewMode === "grid" ? (
        /* ===== GRID VIEW - Profile cards ===== */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {formateurs.map((formateur) => {
            const specialites = parseSpecialites(formateur.specialites);
            const initials = getInitials(formateur.prenom, formateur.nom);
            const avatarColor = getAvatarColor(`${formateur.prenom}${formateur.nom}`);

            return (
              <Link
                key={formateur.id}
                href={`/formateurs/${formateur.id}`}
                className={`bg-gray-800 rounded-xl border shadow-sm overflow-hidden hover:border-gray-500 hover:shadow-lg transition-all group ${
                  !formateur.actif ? "opacity-60 border-gray-700" : "border-gray-700"
                }`}
              >
                {/* Header with photo/avatar */}
                <div className="relative h-28 bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                  <div className="absolute inset-0 bg-gradient-to-br from-red-900/20 to-transparent" />
                  {formateur.photo ? (
                    <img
                      src={formateur.photo}
                      alt={`${formateur.prenom} ${formateur.nom}`}
                      className="h-20 w-20 rounded-full object-cover border-4 border-gray-800 shadow-xl relative z-10"
                    />
                  ) : (
                    <div className={`h-20 w-20 rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center border-4 border-gray-800 shadow-xl relative z-10`}>
                      <span className="text-2xl font-bold text-white">{initials}</span>
                    </div>
                  )}
                  {!formateur.actif && (
                    <span className="absolute top-2 right-2 text-[10px] font-bold bg-gray-900/80 text-gray-400 px-2 py-0.5 rounded-full">Inactif</span>
                  )}
                </div>

                {/* Content */}
                <div className="p-4 text-center">
                  <h3 className="text-base font-semibold text-gray-100 group-hover:text-red-400 transition-colors">
                    {formateur.prenom} {formateur.nom}
                  </h3>

                  {formateur.email && (
                    <p className="text-xs text-gray-400 mt-1 truncate">{formateur.email}</p>
                  )}

                  {/* Specialites */}
                  {specialites.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-1 mt-3">
                      {specialites.slice(0, 3).map((s, i) => (
                        <span key={i} className="inline-flex items-center rounded-full bg-red-900/20 px-2 py-0.5 text-[11px] font-medium text-red-400">
                          {s}
                        </span>
                      ))}
                      {specialites.length > 3 && (
                        <span className="inline-flex items-center rounded-full bg-gray-700 px-2 py-0.5 text-[11px] font-medium text-gray-400">
                          +{specialites.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Stats row */}
                  <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-gray-700 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3" /> {formateur._count.sessions} session{formateur._count.sessions !== 1 ? "s" : ""}
                    </span>
                    {formateur.tarifJournalier != null && (
                      <span className="flex items-center gap-1 font-medium text-gray-200">
                        <Euro className="h-3 w-3 text-gray-400" /> {formatCurrency(formateur.tarifJournalier)}/j
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        /* ===== LIST VIEW ===== */
        <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-sm overflow-x-auto">
          <table className="min-w-[640px] w-full divide-y divide-gray-700">
            <thead className="bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Formateur</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider hidden sm:table-cell">Specialites</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Tarif/j</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Sessions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {formateurs.map((formateur) => {
                const specialites = parseSpecialites(formateur.specialites);
                const initials = getInitials(formateur.prenom, formateur.nom);
                const avatarColor = getAvatarColor(`${formateur.prenom}${formateur.nom}`);

                return (
                  <tr key={formateur.id} className={`hover:bg-gray-750 transition-colors ${!formateur.actif ? "opacity-60" : ""}`}>
                    <td className="px-6 py-4">
                      <Link href={`/formateurs/${formateur.id}`} className="flex items-center gap-3">
                        {formateur.photo ? (
                          <img src={formateur.photo} alt="" className="h-10 w-10 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center shrink-0`}>
                            <span className="text-sm font-bold text-white">{initials}</span>
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-red-500 hover:underline">{formateur.prenom} {formateur.nom}</p>
                          {!formateur.actif && <span className="text-[10px] text-gray-500">Inactif</span>}
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-0.5">
                        {formateur.email && (
                          <p className="text-sm text-gray-400 flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {formateur.email}
                          </p>
                        )}
                        {formateur.telephone && (
                          <p className="text-sm text-gray-400 flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {formateur.telephone}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {specialites.length > 0 ? specialites.slice(0, 3).map((s, i) => (
                          <span key={i} className="inline-flex items-center rounded-full bg-red-900/20 px-2 py-0.5 text-xs font-medium text-red-400">{s}</span>
                        )) : <span className="text-gray-500 text-sm">—</span>}
                        {specialites.length > 3 && <span className="inline-flex items-center rounded-full bg-gray-700 px-2 py-0.5 text-xs text-gray-400">+{specialites.length - 3}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-200">
                      {formateur.tarifJournalier != null ? formatCurrency(formateur.tarifJournalier) : <span className="text-gray-500 font-normal">—</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center rounded-full bg-gray-700 px-2.5 py-0.5 text-xs font-medium text-gray-300">
                        {formateur._count.sessions}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && formateurs.length > 0 && (
        <p className="text-sm text-gray-400 mt-4">{formateurs.length} formateur{formateurs.length > 1 ? "s" : ""}</p>
      )}
    </div>
  );
}
