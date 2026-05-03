"use client";

import { useState } from "react";
import {
  Users, Search, GitMerge, AlertTriangle, Mail, Phone, Building2,
  Calendar, FileText, Tag,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApi } from "@/hooks/useApi";
import { notify } from "@/lib/toast";
import { formatDate } from "@/lib/utils";

interface Contact {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
  type: string;
  poste: string | null;
  notes: string | null;
  dateNaissance: string | null;
  numeroSecuriteSociale: string | null;
  numeroPasseportPrevention: string | null;
  niveauFormation: string | null;
  optOutMarketing: boolean;
  createdAt: string;
  entrepriseId: string | null;
  entreprise?: { id: string; nom: string } | null;
}

interface ContactsResp {
  data: Contact[];
  total: number;
  page: number;
  totalPages: number;
}

function ContactCard({
  c,
  isPrimary,
  onSelect,
}: {
  c: Contact;
  isPrimary: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      className={`rounded-xl border p-4 transition-all ${
        isPrimary
          ? "border-red-600 bg-red-500/10 ring-2 ring-red-600/40"
          : "border-gray-700 bg-gray-800 hover:border-gray-600"
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-base font-semibold text-gray-100">
            {c.prenom} {c.nom}
          </h3>
          <p className="text-xs text-gray-400 font-mono mt-0.5">{c.id}</p>
        </div>
        <button
          onClick={onSelect}
          className={`shrink-0 px-3 py-1 rounded-md text-xs font-medium ${
            isPrimary
              ? "bg-red-600 text-white"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          }`}
        >
          {isPrimary ? "Principal" : "Definir principal"}
        </button>
      </div>
      <div className="space-y-1.5 text-sm">
        <div className="flex items-center gap-2 text-gray-300">
          <Mail className="h-3.5 w-3.5 text-gray-500" />
          {c.email}
        </div>
        {c.telephone && (
          <div className="flex items-center gap-2 text-gray-300">
            <Phone className="h-3.5 w-3.5 text-gray-500" />
            {c.telephone}
          </div>
        )}
        {c.entreprise && (
          <div className="flex items-center gap-2 text-gray-300">
            <Building2 className="h-3.5 w-3.5 text-gray-500" />
            {c.entreprise.nom}
          </div>
        )}
        {c.dateNaissance && (
          <div className="flex items-center gap-2 text-gray-300">
            <Calendar className="h-3.5 w-3.5 text-gray-500" />
            {formatDate(c.dateNaissance)}
          </div>
        )}
        <div className="flex items-center gap-2 text-gray-400 text-xs pt-1">
          <Tag className="h-3 w-3" />
          {c.type}
          {c.optOutMarketing && (
            <span className="ml-1 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px]">
              opt-out
            </span>
          )}
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-gray-700/60 grid grid-cols-2 gap-2 text-[11px] text-gray-400">
        <div>
          <span className="text-gray-500">Cree le :</span>{" "}
          {formatDate(c.createdAt)}
        </div>
        {c.poste && (
          <div className="truncate">
            <span className="text-gray-500">Poste :</span> {c.poste}
          </div>
        )}
        {c.numeroPasseportPrevention && (
          <div className="col-span-2 truncate">
            <span className="text-gray-500">Passeport prev. :</span>{" "}
            <span className="font-mono">{c.numeroPasseportPrevention}</span>
          </div>
        )}
        {c.niveauFormation && (
          <div>
            <span className="text-gray-500">Niveau :</span> {c.niveauFormation}
          </div>
        )}
      </div>
      {c.notes && (
        <div className="mt-2 rounded bg-gray-900/60 border border-gray-700 p-2 text-[11px] text-gray-400 line-clamp-3 flex gap-1.5">
          <FileText className="h-3 w-3 shrink-0 mt-0.5" />
          {c.notes}
        </div>
      )}
    </div>
  );
}

export default function TraineeMergePage() {
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [primaryId, setPrimaryId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const url = submittedSearch
    ? `/api/contacts?search=${encodeURIComponent(submittedSearch)}&limit=20`
    : null;

  const { data, isLoading } = useApi<ContactsResp>(url);
  const matches = data?.data ?? [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) {
      notify.error("Saisissez au moins 2 caracteres");
      return;
    }
    setSubmittedSearch(search.trim());
    setPrimaryId(null);
    setSelectedIds([]);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleMerge = () => {
    notify.info(
      "Fusion non disponible",
      "Fusion a confirmer manuellement par un admin DB pour cette version (Phase 4)."
    );
  };

  const selected = matches.filter((m) => selectedIds.includes(m.id));

  return (
    <div>
      <PageHeader
        title="Fusionner des contacts"
        description="Detectez et regroupez les doublons (meme stagiaire importe plusieurs fois)"
      />

      <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 flex items-start gap-2 mb-5">
        <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-200">
          <strong>Phase 3b :</strong> cet outil affiche les contacts cote a cote pour
          inspection. La fusion automatique des relations (inscriptions, devis,
          attestations, evaluations, badges...) sera disponible en Phase 4 via un
          endpoint dedie. En attendant, la fusion doit etre realisee manuellement par
          un admin base de donnees.
        </div>
      </div>

      <form onSubmit={handleSearch} className="flex items-center gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom, email ou prenom..."
            className="pl-9 bg-gray-800 border-gray-700"
          />
        </div>
        <Button type="submit" className="bg-red-600 hover:bg-red-700">
          <Search className="h-4 w-4" /> Rechercher
        </Button>
      </form>

      {!submittedSearch ? (
        <EmptyState
          icon={Users}
          title="Recherchez un contact"
          description="Utilisez la barre de recherche ci-dessus pour trouver les doublons potentiels."
        />
      ) : isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
        </div>
      ) : matches.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Aucun contact trouve"
          description="Affinez votre recherche."
        />
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-400">
              {matches.length} contact{matches.length > 1 ? "s" : ""} trouve
              {matches.length > 1 ? "s" : ""}.{" "}
              {selectedIds.length > 0 && (
                <span className="text-gray-300">
                  {selectedIds.length} selectionne{selectedIds.length > 1 ? "s" : ""}.
                </span>
              )}
            </p>
            <Button
              onClick={handleMerge}
              disabled={selectedIds.length < 2 || !primaryId}
              className="bg-red-600 hover:bg-red-700"
            >
              <GitMerge className="h-4 w-4" /> Fusionner ({selectedIds.length})
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {matches.map((c) => (
              <div key={c.id} className="space-y-2">
                <label className="flex items-center gap-2 px-2 text-xs text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(c.id)}
                    onChange={() => toggleSelect(c.id)}
                    className="accent-red-600"
                  />
                  Inclure dans la fusion
                </label>
                <ContactCard
                  c={c}
                  isPrimary={primaryId === c.id}
                  onSelect={() => setPrimaryId(c.id)}
                />
              </div>
            ))}
          </div>

          {selected.length > 1 && primaryId && (
            <div className="mt-8 rounded-xl border border-gray-700 bg-gray-800 p-5">
              <h3 className="text-sm font-semibold text-gray-100 mb-3 flex items-center gap-2">
                <GitMerge className="h-4 w-4 text-red-400" /> Apercu de fusion
              </h3>
              <div className="text-sm text-gray-300 space-y-2">
                <p>
                  Contact <strong>principal</strong> conserve :{" "}
                  <span className="text-red-400">
                    {selected.find((s) => s.id === primaryId)?.prenom}{" "}
                    {selected.find((s) => s.id === primaryId)?.nom}
                  </span>
                </p>
                <p>
                  Contacts <strong>fusionnes</strong> (a supprimer apres reaffectation
                  des relations) :
                </p>
                <ul className="list-disc list-inside text-xs text-gray-400 ml-2">
                  {selected
                    .filter((s) => s.id !== primaryId)
                    .map((s) => (
                      <li key={s.id}>
                        {s.prenom} {s.nom} — {s.email}
                      </li>
                    ))}
                </ul>
                <p className="text-xs text-amber-300 mt-3">
                  Les inscriptions, devis, attestations, evaluations, badges et
                  certifications seront reaffectees au contact principal lors de
                  l&apos;activation Phase 4.
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
