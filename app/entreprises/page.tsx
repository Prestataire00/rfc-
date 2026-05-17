"use client";

// Page liste des entreprises — précédemment accessibles uniquement via les
// fiches contact/devis (pas d'entrée dédiée dans la sidebar). Adresse le
// gap d'IA identifié lors de la restructuration nav.

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Building2, Search, MapPin, FileText, Receipt } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Pagination } from "@/components/shared/Pagination";
import { SkeletonTable } from "@/components/shared/Skeleton";
import { Input } from "@/components/ui/input";
import { useApi } from "@/hooks/useApi";

type EntrepriseType = "" | "client" | "organisme";

const TYPE_LABELS: Record<EntrepriseType, { title: string; description: (n: number) => string; empty: string }> = {
  "": {
    title: "Entreprises",
    description: (n) => `${n} entreprise${n > 1 ? "s" : ""}`,
    empty: "Créez votre première entreprise",
  },
  client: {
    title: "Entreprises clientes",
    description: (n) => `${n} entreprise${n > 1 ? "s" : ""} cliente${n > 1 ? "s" : ""} (≥ 1 contact qualifié client)`,
    empty: "Aucune entreprise cliente — un prospect devient client quand sa demande passe au statut « Accepté »",
  },
  organisme: {
    title: "Organismes tiers",
    description: (n) => `${n} organisme${n > 1 ? "s" : ""} tier${n > 1 ? "s" : ""} (OPCO, sous-traitants, partenaires)`,
    empty: "Aucun organisme — créez-en un via Nouvelle demande > Type Organisme/société tierce",
  },
};

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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const typeParam = (searchParams.get("type") ?? "") as EntrepriseType;
  const activeType: EntrepriseType = typeParam === "client" || typeParam === "organisme" ? typeParam : "";

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset pagination quand le filtre type change
  useEffect(() => {
    setPage(1);
  }, [activeType]);

  const params = new URLSearchParams();
  if (debouncedSearch) params.set("search", debouncedSearch);
  if (activeType) params.set("type", activeType);
  params.set("page", String(page));
  params.set("limit", "25");

  const { data, isLoading } = useApi<ApiResponse>(`/api/entreprises?${params.toString()}`);

  const entreprises: Entreprise[] = Array.isArray(data) ? data : data?.data ?? [];
  const total = Array.isArray(data) ? entreprises.length : data?.total ?? entreprises.length;
  const totalPages = Array.isArray(data) ? 1 : data?.totalPages ?? 1;

  const meta = TYPE_LABELS[activeType];

  function switchType(t: EntrepriseType) {
    const next = new URLSearchParams(searchParams.toString());
    if (t) next.set("type", t);
    else next.delete("type");
    router.replace(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="p-6">
      <PageHeader
        title={meta.title}
        description={meta.description(total)}
        actionLabel="Nouvelle entreprise"
        actionHref="/entreprises/nouveau"
      />

      {/* Onglets de filtre type entreprise */}
      <div className="flex items-center gap-1 mb-4 border-b border-gray-700">
        {([
          { v: "client" as const, label: "Clientes" },
          { v: "organisme" as const, label: "Organismes tiers" },
          { v: "" as const, label: "Toutes" },
        ]).map((tab) => (
          <button
            key={tab.v || "all"}
            onClick={() => switchType(tab.v)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeType === tab.v
                ? "border-red-500 text-red-500"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

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
          description={debouncedSearch ? "Essayez avec d'autres mots-clés" : meta.empty}
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
