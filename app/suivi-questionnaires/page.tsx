"use client";

// Page de suivi unifiée de tous les questionnaires envoyés par la plateforme :
// fiches pré-formation entreprise + stagiaire + évaluations. Permet à l'admin
// de voir d'un coup d'œil qui a répondu et qui ne l'a pas (encore) fait,
// avec filtres par type/statut et stats globales (taux de réponse).

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ClipboardList, Search, ExternalLink, Building2, User, Star,
  Clock, CheckCircle2, AlertCircle, Copy,
} from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { formatDate } from "@/lib/utils";

type SuiviStatut = "en_attente" | "envoye" | "repondu" | "incomplet";
type QuestionnaireType = "fiche_entreprise" | "fiche_stagiaire" | "evaluation";

type Item = {
  id: string;
  type: QuestionnaireType;
  typeLabel: string;
  destinataire: string;
  destinataireEmail: string | null;
  contexte: string | null;
  statut: SuiviStatut;
  dateEnvoi: string | null;
  dateReponse: string | null;
  lienAdmin: string | null;
  lienPublic: string | null;
};

type Response = {
  items: Item[];
  stats: { total: number; repondus: number; enAttente: number; tauxReponse: number };
};

const TYPE_BADGE: Record<QuestionnaireType, { icon: typeof Building2; bg: string }> = {
  fiche_entreprise: { icon: Building2, bg: "bg-sky-500/20 text-sky-300 border-sky-500/30" },
  fiche_stagiaire: { icon: User, bg: "bg-violet-500/20 text-violet-300 border-violet-500/30" },
  evaluation: { icon: Star, bg: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
};

const STATUT_BADGE: Record<SuiviStatut, { label: string; bg: string; icon: typeof CheckCircle2 }> = {
  en_attente: { label: "En attente", bg: "bg-gray-700 text-gray-300 border-gray-600", icon: Clock },
  envoye: { label: "Envoyé", bg: "bg-blue-500/20 text-blue-300 border-blue-500/30", icon: ClipboardList },
  repondu: { label: "Répondu", bg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", icon: CheckCircle2 },
  incomplet: { label: "Incomplet", bg: "bg-amber-500/20 text-amber-300 border-amber-500/30", icon: AlertCircle },
};

export default function SuiviQuestionnairesPage() {
  const [typeFilter, setTypeFilter] = useState<"" | QuestionnaireType>("");
  const [statutFilter, setStatutFilter] = useState<"" | SuiviStatut>("");
  const [search, setSearch] = useState("");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // URL avec filtres pour fetch côté serveur (perf : pas de full scan en RAM côté UI)
  const queryUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (typeFilter) params.set("type", typeFilter);
    if (statutFilter) params.set("statut", statutFilter);
    const qs = params.toString();
    return qs ? `/api/questionnaires/suivi?${qs}` : "/api/questionnaires/suivi";
  }, [typeFilter, statutFilter]);

  const { data, isLoading } = useApi<Response>(queryUrl);
  const items = data?.items ?? [];
  const stats = data?.stats ?? { total: 0, repondus: 0, enAttente: 0, tauxReponse: 0 };

  // Recherche côté client (sur les items déjà filtrés serveur)
  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter((it) =>
      it.destinataire.toLowerCase().includes(q)
      || it.destinataireEmail?.toLowerCase().includes(q)
      || it.contexte?.toLowerCase().includes(q)
      || it.typeLabel.toLowerCase().includes(q),
    );
  }, [items, search]);

  const handleCopyLink = (lien: string, id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}${lien}`);
    setCopiedToken(id);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-red-500" /> Suivi des questionnaires
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Tous les questionnaires envoyés (fiches pré-formation, évaluations) et leur statut de réponse
        </p>
      </div>

      {/* Stats globales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total envoyés" value={stats.total} icon={ClipboardList} color="bg-blue-500" />
        <StatCard label="Répondus" value={stats.repondus} icon={CheckCircle2} color="bg-emerald-500" />
        <StatCard label="En attente" value={stats.enAttente} icon={Clock} color="bg-amber-500" />
        <StatCard label="Taux de réponse" value={`${stats.tauxReponse}%`} icon={Star} color="bg-violet-500" />
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher destinataire, contexte…"
            className="w-full h-10 rounded-md border border-gray-600 bg-gray-800 pl-9 pr-3 text-sm text-gray-100 focus:outline-none focus:border-red-500"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as "" | QuestionnaireType)}
          className="h-10 rounded-md border border-gray-600 bg-gray-800 px-3 text-sm text-gray-100"
        >
          <option value="">Tous types</option>
          <option value="fiche_entreprise">Fiches entreprise</option>
          <option value="fiche_stagiaire">Fiches stagiaire</option>
          <option value="evaluation">Évaluations</option>
        </select>
        <select
          value={statutFilter}
          onChange={(e) => setStatutFilter(e.target.value as "" | SuiviStatut)}
          className="h-10 rounded-md border border-gray-600 bg-gray-800 px-3 text-sm text-gray-100"
        >
          <option value="">Tous statuts</option>
          <option value="en_attente">En attente</option>
          <option value="envoye">Envoyé</option>
          <option value="repondu">Répondu</option>
          <option value="incomplet">Incomplet</option>
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-gray-700 bg-gray-800 py-16 text-center">
          <ClipboardList className="h-10 w-10 text-gray-500 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Aucun questionnaire ne correspond aux filtres</p>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-700 bg-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 border-b border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Type</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Destinataire</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Contexte</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Envoyé</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Répondu</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Délai</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Statut</th>
                <th className="px-4 py-3 text-right font-medium text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((it) => {
                const TypeIcon = TYPE_BADGE[it.type].icon;
                const StatutIcon = STATUT_BADGE[it.statut].icon;
                const delai = it.dateEnvoi && it.dateReponse
                  ? Math.round(
                      (new Date(it.dateReponse).getTime() - new Date(it.dateEnvoi).getTime())
                      / (1000 * 60 * 60 * 24),
                    )
                  : null;
                return (
                  <tr key={`${it.type}-${it.id}`} className="border-b border-gray-700 hover:bg-gray-700/40">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${TYPE_BADGE[it.type].bg}`}>
                        <TypeIcon className="h-3 w-3" />
                        {it.typeLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-200">
                      <div className="font-medium">{it.destinataire}</div>
                      {it.destinataireEmail && (
                        <div className="text-xs text-gray-500 truncate max-w-xs">{it.destinataireEmail}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {it.contexte || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {it.dateEnvoi ? formatDate(it.dateEnvoi) : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {it.dateReponse ? formatDate(it.dateReponse) : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {delai != null ? `${delai} j` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUT_BADGE[it.statut].bg}`}>
                        <StatutIcon className="h-3 w-3" />
                        {STATUT_BADGE[it.statut].label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {it.lienPublic && (
                          <button
                            onClick={() => handleCopyLink(it.lienPublic!, it.id)}
                            className="inline-flex items-center gap-1 rounded-md border border-gray-600 bg-gray-700 hover:bg-gray-600 px-2 py-1 text-xs text-gray-300"
                            title="Copier le lien public"
                          >
                            <Copy className="h-3 w-3" />
                            {copiedToken === it.id ? "Copié !" : "Lien"}
                          </button>
                        )}
                        {it.lienAdmin && (
                          <Link
                            href={it.lienAdmin}
                            className="inline-flex items-center gap-1 rounded-md bg-red-600 hover:bg-red-700 px-2 py-1 text-xs text-white"
                            title="Ouvrir le détail admin"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-lg ${color}/20 flex items-center justify-center`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-100">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}
