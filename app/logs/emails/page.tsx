"use client";

// Historique des emails envoyés — pilotable par destinataire / statut / dates.
// Source : LogEmail (toutes les routes /api/email/*  écrivent ici, et le
// webhook Resend met à jour les statuts livre / ouvert / clique / bounce).

import { useState } from "react";
import { Mail, Search, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Pagination } from "@/components/shared/Pagination";
import { SkeletonTable } from "@/components/shared/Skeleton";
import { StatutBadge } from "@/components/shared/StatutBadge";
import { Input } from "@/components/ui/input";
import { useApi } from "@/hooks/useApi";
import { formatDate } from "@/lib/utils";

type Statut = "envoye" | "livre" | "ouvert" | "clique" | "bounce" | "plainte";

const STATUT_BADGES: Record<Statut, { label: string; color: string }> = {
  envoye: { label: "Envoyé", color: "bg-sky-500/20 text-sky-600 dark:text-sky-400 border-sky-500/30" },
  livre: { label: "Livré", color: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
  ouvert: { label: "Ouvert", color: "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30" },
  clique: { label: "Cliqué", color: "bg-violet-500/20 text-violet-700 dark:text-violet-400 border-violet-500/30" },
  bounce: { label: "Bounce", color: "bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30" },
  plainte: { label: "Plainte", color: "bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30" },
};

interface LogEmail {
  id: string;
  createdAt: string;
  destinataire: string;
  sujet: string;
  statut: string;
  messageId: string | null;
  erreur: string | null;
  template: { id: string; nom: string } | null;
  sessionId: string | null;
  contactId: string | null;
}

interface ApiResponse {
  data: LogEmail[];
  total: number;
  page: number;
  totalPages: number;
}

export default function HistoriqueEmailsPage() {
  const [destinataire, setDestinataire] = useState("");
  const [statut, setStatut] = useState<"" | Statut>("");
  const [page, setPage] = useState(1);

  const qs = new URLSearchParams();
  if (destinataire.trim()) qs.set("destinataire", destinataire.trim());
  if (statut) qs.set("statut", statut);
  qs.set("page", String(page));
  qs.set("limit", "50");

  const { data, isLoading } = useApi<ApiResponse>(`/api/logs/emails?${qs}`);
  const logs = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="p-6">
      <PageHeader
        title="Historique des emails"
        description={`${total} email${total > 1 ? "s" : ""} envoyé${total > 1 ? "s" : ""}`}
      />

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <Input
            type="search"
            placeholder="Rechercher par destinataire…"
            value={destinataire}
            onChange={(e) => {
              setDestinataire(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <select
          value={statut}
          onChange={(e) => {
            setStatut(e.target.value as "" | Statut);
            setPage(1);
          }}
          className="h-10 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm"
        >
          <option value="">Tous les statuts</option>
          {(Object.keys(STATUT_BADGES) as Statut[]).map((s) => (
            <option key={s} value={s}>
              {STATUT_BADGES[s].label}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <SkeletonTable rows={8} cols={5} />
      ) : logs.length === 0 ? (
        <EmptyState
          icon={Mail}
          title={destinataire || statut ? "Aucun email trouvé" : "Aucun email envoyé"}
          description={destinataire || statut
            ? "Essayez d'autres critères de filtre."
            : "Les emails envoyés depuis la plateforme apparaîtront ici."}
        />
      ) : (
        <>
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Envoyé le</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Destinataire</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Sujet</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Statut</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Template</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const badge = STATUT_BADGES[log.statut as Statut] ?? {
                    label: log.statut,
                    color: "bg-gray-500/20 text-gray-600 dark:text-gray-400 border-gray-500/30",
                  };
                  return (
                    <tr
                      key={log.id}
                      className="border-b border-gray-200 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-750"
                    >
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-xs whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={`mailto:${log.destinataire}`}
                          className="text-red-600 dark:text-red-400 hover:underline"
                          title={`Envoyer un email à ${log.destinataire}`}
                        >
                          {log.destinataire}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-200 max-w-md truncate" title={log.sujet}>
                        {log.sujet}
                      </td>
                      <td className="px-4 py-3">
                        <StatutBadge label={badge.label} color={badge.color} />
                        {log.erreur && (
                          <p className="text-[10px] text-red-500 mt-1 max-w-xs truncate" title={log.erreur}>
                            {log.erreur}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                        {log.template ? (
                          <span className="inline-flex items-center gap-1">
                            {log.template.nom}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                        {log.contactId && (
                          <a
                            href={`/contacts/${log.contactId}`}
                            className="ml-2 inline-flex items-center gap-0.5 text-[10px] text-gray-500 hover:text-red-500"
                            title="Voir le contact"
                          >
                            contact <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
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
