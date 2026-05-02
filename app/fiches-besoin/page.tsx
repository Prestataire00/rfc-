"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ClipboardList, Building2, User, Send, CheckCircle2, Clock, Accessibility,
  Search, ExternalLink, Copy, Calendar,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/fetcher";

type FicheClient = {
  id: string;
  statut: string;
  optionnel: boolean;
  destinataireNom: string | null;
  destinataireEmail: string | null;
  dateEnvoi: string | null;
  dateReponse: string | null;
  tokenAcces: string;
  secteurActivite: string | null;
  aStagiairesHandicap: boolean;
  session: { id: string; dateDebut: string; formation: { titre: string } };
  entreprise: { id: string; nom: string } | null;
};

type FicheStagiaire = {
  id: string;
  statut: string;
  optionnel: boolean;
  dateEnvoi: string | null;
  dateReponse: string | null;
  tokenAcces: string;
  estRQTH: boolean;
  contact: { id: string; nom: string; prenom: string; email: string };
};

const STATUT_COLORS: Record<string, string> = {
  en_attente: "bg-gray-700 text-gray-300",
  envoye: "bg-blue-900/30 text-blue-400 border border-blue-700",
  repondu: "bg-emerald-900/30 text-emerald-400 border border-emerald-700",
  incomplet: "bg-amber-900/30 text-amber-400 border border-amber-700",
};

const STATUT_LABELS: Record<string, string> = {
  en_attente: "En attente",
  envoye: "Envoye",
  repondu: "Repondu",
  incomplet: "Incomplet",
};

export default function FichesBesoinPage() {
  const [tab, setTab] = useState<"client" | "stagiaire">("client");
  const [statutFilter, setStatutFilter] = useState("");
  const [search, setSearch] = useState("");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const { data: clientData, isLoading: clientLoading, mutate: mutateClient } = useApi<FicheClient[]>(
    "/api/besoin-client"
  );
  const { data: stagiaireData, isLoading: stagiaireLoading, mutate: mutateStagiaire } = useApi<FicheStagiaire[]>(
    "/api/besoin-stagiaire"
  );

  const fichesClient: FicheClient[] = Array.isArray(clientData) ? clientData : [];
  const fichesStagiaire: FicheStagiaire[] = Array.isArray(stagiaireData) ? stagiaireData : [];
  const loading = clientLoading || stagiaireLoading;

  const handleResend = async (type: "client" | "stagiaire", id: string) => {
    try {
      await api.patch(`/api/besoin-${type}/${id}`, { action: "envoyer" });
      if (type === "client") await mutateClient();
      else await mutateStagiaire();
    } catch {
      // ignore
    }
  };

  const handleCopyLink = (type: "client" | "stagiaire", token: string) => {
    const url = `${window.location.origin}/fiche-besoin-${type}/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const filterFiche = <T extends { statut: string }>(f: T, nom: string): boolean => {
    if (statutFilter && f.statut !== statutFilter) return false;
    if (search && !nom.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  };

  const clientsFiltered = fichesClient.filter((f) =>
    filterFiche(f, `${f.entreprise?.nom ?? ""} ${f.destinataireNom ?? ""} ${f.session.formation.titre}`)
  );
  const stagiairesFiltered = fichesStagiaire.filter((f) =>
    filterFiche(f, `${f.contact.prenom} ${f.contact.nom} ${f.contact.email}`)
  );

  // Stats
  const totalClient = fichesClient.length;
  const repondusClient = fichesClient.filter((f) => f.statut === "repondu").length;
  const totalStagiaire = fichesStagiaire.length;
  const repondusStagiaire = fichesStagiaire.filter((f) => f.statut === "repondu").length;
  const rqthCount = fichesStagiaire.filter((f) => f.estRQTH).length;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-red-500" /> Fiches besoin
        </h1>
        <p className="text-sm text-gray-400 mt-1">Questionnaires d&apos;adaptation pedagogique envoyes aux clients et stagiaires avant formation</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-900/30 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-100">{repondusClient}/{totalClient}</p>
              <p className="text-xs text-gray-400">Fiches client repondues</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-900/30 flex items-center justify-center">
              <User className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-100">{repondusStagiaire}/{totalStagiaire}</p>
              <p className="text-xs text-gray-400">Fiches stagiaire repondues</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-orange-900/30 flex items-center justify-center">
              <Accessibility className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-100">{rqthCount}</p>
              <p className="text-xs text-gray-400">Stagiaires RQTH identifies</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-900/30 flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-100">{totalClient + totalStagiaire - repondusClient - repondusStagiaire}</p>
              <p className="text-xs text-gray-400">En attente de reponse</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-700 mb-4">
        <nav className="flex gap-1">
          <button
            onClick={() => setTab("client")}
            className={`flex items-center gap-2 px-4 pb-3 pt-1 text-sm font-medium border-b-2 transition-colors ${tab === "client" ? "border-red-600 text-red-500" : "border-transparent text-gray-400 hover:text-gray-300"}`}
          >
            <Building2 className="h-4 w-4" /> Fiches Client
            <span className="ml-1 inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-gray-700 px-1.5 text-[11px] font-medium text-gray-300">{totalClient}</span>
          </button>
          <button
            onClick={() => setTab("stagiaire")}
            className={`flex items-center gap-2 px-4 pb-3 pt-1 text-sm font-medium border-b-2 transition-colors ${tab === "stagiaire" ? "border-red-600 text-red-500" : "border-transparent text-gray-400 hover:text-gray-300"}`}
          >
            <User className="h-4 w-4" /> Fiches Stagiaire
            <span className="ml-1 inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-gray-700 px-1.5 text-[11px] font-medium text-gray-300">{totalStagiaire}</span>
          </button>
        </nav>
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher..."
            className="w-full h-10 rounded-md border border-gray-600 bg-gray-800 pl-9 pr-3 text-sm text-gray-200 focus:outline-none focus:border-red-500"
          />
        </div>
        <select
          value={statutFilter}
          onChange={(e) => setStatutFilter(e.target.value)}
          className="h-10 rounded-md border border-gray-600 bg-gray-800 px-3 text-sm text-gray-200"
        >
          <option value="">Tous les statuts</option>
          <option value="en_attente">En attente</option>
          <option value="envoye">Envoye</option>
          <option value="repondu">Repondu</option>
          <option value="incomplet">Incomplet</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
        </div>
      ) : tab === "client" ? (
        <ClientTable
          fiches={clientsFiltered}
          onResend={(id) => handleResend("client", id)}
          onCopy={(t) => handleCopyLink("client", t)}
          copiedToken={copiedToken}
        />
      ) : (
        <StagiaireTable
          fiches={stagiairesFiltered}
          onResend={(id) => handleResend("stagiaire", id)}
          onCopy={(t) => handleCopyLink("stagiaire", t)}
          copiedToken={copiedToken}
        />
      )}
    </div>
  );
}

function ClientTable({ fiches, onResend, onCopy, copiedToken }: {
  fiches: FicheClient[];
  onResend: (id: string) => void;
  onCopy: (token: string) => void;
  copiedToken: string | null;
}) {
  if (fiches.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl py-16 text-center">
        <Building2 className="h-10 w-10 text-gray-600 mx-auto mb-3" />
        <p className="text-sm text-gray-400">Aucune fiche client</p>
        <p className="text-xs text-gray-500 mt-1">Envoyez une fiche depuis une page session</p>
      </div>
    );
  }
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-900 border-b border-gray-700">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-400">Entreprise</th>
            <th className="px-4 py-3 text-left font-medium text-gray-400">Destinataire</th>
            <th className="px-4 py-3 text-left font-medium text-gray-400">Formation / Session</th>
            <th className="px-4 py-3 text-left font-medium text-gray-400">Secteur</th>
            <th className="px-4 py-3 text-left font-medium text-gray-400">Envoi</th>
            <th className="px-4 py-3 text-left font-medium text-gray-400">Reponse</th>
            <th className="px-4 py-3 text-left font-medium text-gray-400">Statut</th>
            <th className="px-4 py-3 text-right font-medium text-gray-400">Actions</th>
          </tr>
        </thead>
        <tbody>
          {fiches.map((f) => (
            <tr key={f.id} className="border-b border-gray-700 hover:bg-gray-750">
              <td className="px-4 py-3">
                {f.entreprise ? (
                  <Link href={`/entreprises/${f.entreprise.id}`} className="text-red-500 hover:underline">
                    {f.entreprise.nom}
                  </Link>
                ) : (
                  <span className="text-gray-500 italic">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-gray-300">
                <div>{f.destinataireNom || "—"}</div>
                {f.destinataireEmail && <div className="text-xs text-gray-500">{f.destinataireEmail}</div>}
              </td>
              <td className="px-4 py-3">
                <Link href={`/sessions/${f.session.id}`} className="text-gray-200 hover:text-red-500">
                  {f.session.formation.titre}
                </Link>
                <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                  <Calendar className="h-3 w-3" /> {formatDate(f.session.dateDebut)}
                </div>
              </td>
              <td className="px-4 py-3 text-gray-400 text-xs">{f.secteurActivite?.replace(/_/g, " ") || "—"}</td>
              <td className="px-4 py-3 text-gray-400 text-xs">{f.dateEnvoi ? formatDate(f.dateEnvoi) : "—"}</td>
              <td className="px-4 py-3 text-gray-400 text-xs">{f.dateReponse ? formatDate(f.dateReponse) : "—"}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUT_COLORS[f.statut] ?? "bg-gray-700"}`}>
                  {STATUT_LABELS[f.statut] ?? f.statut}
                </span>
                {f.optionnel && <span className="ml-1 text-[10px] text-amber-400">(optionnel)</span>}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                  <button onClick={() => onCopy(f.tokenAcces)} className="inline-flex items-center gap-1 rounded-md border border-gray-600 bg-gray-800 px-2 py-1 text-xs text-gray-300 hover:bg-gray-700" title="Copier le lien">
                    <Copy className="h-3 w-3" /> {copiedToken === f.tokenAcces ? "Copie!" : "Lien"}
                  </button>
                  <Link href={`/fiche-besoin-client/${f.tokenAcces}`} target="_blank" className="inline-flex items-center gap-1 rounded-md border border-gray-600 bg-gray-800 px-2 py-1 text-xs text-gray-300 hover:bg-gray-700" title="Ouvrir le formulaire">
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                  {f.destinataireEmail && (
                    <button onClick={() => onResend(f.id)} className="inline-flex items-center gap-1 rounded-md bg-red-600 hover:bg-red-700 px-2 py-1 text-xs text-white" title="Renvoyer l'email">
                      <Send className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StagiaireTable({ fiches, onResend, onCopy, copiedToken }: {
  fiches: FicheStagiaire[];
  onResend: (id: string) => void;
  onCopy: (token: string) => void;
  copiedToken: string | null;
}) {
  if (fiches.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl py-16 text-center">
        <User className="h-10 w-10 text-gray-600 mx-auto mb-3" />
        <p className="text-sm text-gray-400">Aucune fiche stagiaire</p>
        <p className="text-xs text-gray-500 mt-1">Envoyez des fiches depuis une page session</p>
      </div>
    );
  }
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-900 border-b border-gray-700">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-400">Stagiaire</th>
            <th className="px-4 py-3 text-left font-medium text-gray-400">Email</th>
            <th className="px-4 py-3 text-left font-medium text-gray-400">Envoi</th>
            <th className="px-4 py-3 text-left font-medium text-gray-400">Reponse</th>
            <th className="px-4 py-3 text-left font-medium text-gray-400">RQTH</th>
            <th className="px-4 py-3 text-left font-medium text-gray-400">Statut</th>
            <th className="px-4 py-3 text-right font-medium text-gray-400">Actions</th>
          </tr>
        </thead>
        <tbody>
          {fiches.map((f) => (
            <tr key={f.id} className="border-b border-gray-700 hover:bg-gray-750">
              <td className="px-4 py-3">
                <Link href={`/contacts/${f.contact.id}`} className="text-red-500 hover:underline">
                  {f.contact.prenom} {f.contact.nom}
                </Link>
              </td>
              <td className="px-4 py-3 text-gray-400 text-xs">{f.contact.email}</td>
              <td className="px-4 py-3 text-gray-400 text-xs">{f.dateEnvoi ? formatDate(f.dateEnvoi) : "—"}</td>
              <td className="px-4 py-3 text-gray-400 text-xs">{f.dateReponse ? formatDate(f.dateReponse) : "—"}</td>
              <td className="px-4 py-3">
                {f.estRQTH ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-900/30 text-orange-400 border border-orange-700 px-2 py-0.5 text-xs font-medium">
                    <Accessibility className="h-3 w-3" /> RQTH
                  </span>
                ) : <span className="text-gray-500 text-xs">—</span>}
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUT_COLORS[f.statut] ?? "bg-gray-700"}`}>
                  {f.statut === "repondu" ? <CheckCircle2 className="h-3 w-3 mr-1" /> : null}
                  {STATUT_LABELS[f.statut] ?? f.statut}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                  <button onClick={() => onCopy(f.tokenAcces)} className="inline-flex items-center gap-1 rounded-md border border-gray-600 bg-gray-800 px-2 py-1 text-xs text-gray-300 hover:bg-gray-700" title="Copier le lien">
                    <Copy className="h-3 w-3" /> {copiedToken === f.tokenAcces ? "Copie!" : "Lien"}
                  </button>
                  <Link href={`/fiche-besoin-stagiaire/${f.tokenAcces}`} target="_blank" className="inline-flex items-center gap-1 rounded-md border border-gray-600 bg-gray-800 px-2 py-1 text-xs text-gray-300 hover:bg-gray-700" title="Ouvrir le formulaire">
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                  {f.contact.email && (
                    <button onClick={() => onResend(f.id)} className="inline-flex items-center gap-1 rounded-md bg-red-600 hover:bg-red-700 px-2 py-1 text-xs text-white" title="Renvoyer l'email">
                      <Send className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
