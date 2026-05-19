"use client";

import Link from "next/link";
import useSWR from "swr";
import { useState } from "react";
import { FileSignature } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { SignatureStatusBadge } from "@/components/signatures/SignatureStatusBadge";

interface ListItem {
  id: string;
  titre: string;
  statut: string;
  createdAt: string;
  signataire: { nom: string; email: string; statut: string } | null;
}

interface ListResponse {
  items: ListItem[];
  total: number;
  limit: number;
  offset: number;
}

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`${r.status}`);
    return r.json() as Promise<ListResponse>;
  });

const ALL_STATUTS = [
  "draft",
  "ready",
  "sent",
  "viewed",
  "signed",
  "completed",
  "expired",
  "rejected",
];

export default function SignaturesPage() {
  const [statut, setStatut] = useState("");
  const [search, setSearch] = useState("");

  const qs = new URLSearchParams();
  if (statut) qs.set("statut", statut);
  if (search.trim()) qs.set("search", search.trim());
  const { data, error, isLoading } = useSWR(`/api/signature-requests?${qs}`, fetcher);

  return (
    <div className="container mx-auto p-6">
      <PageHeader
        title="Signatures électroniques"
        actionLabel="Nouvelle demande"
        actionHref="/signatures/nouveau"
      />

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Rechercher par titre…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="p-2 border rounded flex-1"
        />
        <select
          value={statut}
          onChange={(e) => setStatut(e.target.value)}
          className="p-2 border rounded"
        >
          <option value="">Tous les statuts</option>
          {ALL_STATUTS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-300 text-red-800 rounded mb-4">
          Erreur de chargement
        </div>
      )}

      {isLoading && <p className="text-gray-500">Chargement…</p>}

      {data && data.items.length === 0 && (
        <EmptyState
          icon={FileSignature}
          title="Aucune demande"
          description="Creez votre premiere demande de signature electronique."
          actionLabel="Nouvelle demande"
          actionHref="/signatures/nouveau"
        />
      )}

      {data && data.items.length > 0 && (
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm text-gray-500 border-b">
              <th className="py-2">Titre</th>
              <th>Signataire</th>
              <th>Statut</th>
              <th>Créé le</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((r) => (
              <tr key={r.id} className="border-b hover:bg-gray-50">
                <td className="py-2 font-medium">{r.titre}</td>
                <td className="text-sm">
                  {r.signataire?.nom ? (
                    <>
                      {r.signataire.nom}
                      <span className="text-gray-400 ml-1">{r.signataire.email}</span>
                    </>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td>
                  <SignatureStatusBadge statut={r.statut} />
                </td>
                <td className="text-sm text-gray-500">
                  {new Date(r.createdAt).toLocaleDateString("fr-FR")}
                </td>
                <td>
                  <Link href={`/signatures/${r.id}`} className="text-blue-600 text-sm">
                    Détail
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {data && data.total > data.items.length && (
        <p className="text-sm text-gray-500 mt-4">
          {data.items.length} sur {data.total} affichés
        </p>
      )}
    </div>
  );
}
