"use client";

import { useMemo, useState } from "react";
import { Search, Building2, User, CheckSquare, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import type { Contact } from "./types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableContacts: Contact[];
  selectedContactIds: string[];
  setSelectedContactIds: (ids: string[]) => void;
  contactSearch: string;
  setContactSearch: (q: string) => void;
  adding: boolean;
  addError: string;
  onSubmit: () => void;
  contactsCount: number;
  capaciteRestante: number;
};

const PARTICULIERS = "__particuliers__";
const TOUS = "__tous__";

export function AddInscriptionDialog({
  open,
  onOpenChange,
  availableContacts,
  selectedContactIds,
  setSelectedContactIds,
  contactSearch,
  setContactSearch,
  adding,
  addError,
  onSubmit,
  contactsCount,
  capaciteRestante,
}: Props) {
  const [entrepriseFilter, setEntrepriseFilter] = useState<string>(TOUS);

  // Liste des entreprises distinctes parmi les contacts disponibles
  const entreprisesAvailables = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of availableContacts) {
      if (c.entreprise) map.set(c.entreprise.id, c.entreprise.nom);
    }
    return Array.from(map.entries()).map(([id, nom]) => ({ id, nom })).sort((a, b) => a.nom.localeCompare(b.nom));
  }, [availableContacts]);

  // Contacts filtrés par entreprise + recherche textuelle
  const filteredContacts = useMemo(() => {
    let list = availableContacts;
    if (entrepriseFilter === PARTICULIERS) {
      list = list.filter((c) => !c.entreprise);
    } else if (entrepriseFilter !== TOUS) {
      list = list.filter((c) => c.entreprise?.id === entrepriseFilter);
    }
    if (contactSearch) {
      const q = contactSearch.toLowerCase();
      list = list.filter(
        (c) =>
          c.nom.toLowerCase().includes(q) ||
          c.prenom.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q)
      );
    }
    return list;
  }, [availableContacts, entrepriseFilter, contactSearch]);

  const allFilteredSelected = filteredContacts.length > 0 && filteredContacts.every((c) => selectedContactIds.includes(c.id));

  const toggleContact = (id: string) => {
    if (selectedContactIds.includes(id)) {
      setSelectedContactIds(selectedContactIds.filter((x) => x !== id));
    } else {
      setSelectedContactIds([...selectedContactIds, id]);
    }
  };

  const toggleAllFiltered = () => {
    if (allFilteredSelected) {
      const filteredIds = new Set(filteredContacts.map((c) => c.id));
      setSelectedContactIds(selectedContactIds.filter((id) => !filteredIds.has(id)));
    } else {
      const merged = new Set([...selectedContactIds, ...filteredContacts.map((c) => c.id)]);
      setSelectedContactIds(Array.from(merged));
    }
  };

  const overCapacity = selectedContactIds.length > capaciteRestante;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle>Ajouter des participants</DialogTitle>
        </DialogHeader>

        {addError && (
          <p className="text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-md px-3 py-2">{addError}</p>
        )}
        {overCapacity && (
          <p className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-md px-3 py-2">
            {selectedContactIds.length} sélectionné(s) mais seulement {capaciteRestante} place(s) restante(s).
          </p>
        )}

        <div className="py-2 space-y-3">
          {/* Filtre entreprise */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Filtrer par entreprise</label>
            <select
              value={entrepriseFilter}
              onChange={(e) => setEntrepriseFilter(e.target.value)}
              className="w-full h-9 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 text-sm"
            >
              <option value={TOUS}>Tous les contacts ({availableContacts.length})</option>
              <option value={PARTICULIERS}>
                Particuliers (sans entreprise) ({availableContacts.filter((c) => !c.entreprise).length})
              </option>
              {entreprisesAvailables.map((e) => {
                const count = availableContacts.filter((c) => c.entreprise?.id === e.id).length;
                return (
                  <option key={e.id} value={e.id}>{e.nom} ({count} membre{count > 1 ? "s" : ""})</option>
                );
              })}
            </select>
          </div>

          {/* Recherche textuelle */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher par nom, prénom ou email..."
              value={contactSearch}
              onChange={(e) => setContactSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Header sélection + tout cocher */}
          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={toggleAllFiltered}
              disabled={filteredContacts.length === 0}
              className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {allFilteredSelected ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
              {allFilteredSelected ? "Tout désélectionner" : `Tout sélectionner (${filteredContacts.length})`}
            </button>
            <span className="text-gray-600 dark:text-gray-400">
              <strong className="text-gray-900 dark:text-gray-100">{selectedContactIds.length}</strong> sélectionné{selectedContactIds.length > 1 ? "s" : ""}
            </span>
          </div>

          {/* Liste des contacts filtrés avec checkbox */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-md max-h-72 overflow-y-auto">
            {filteredContacts.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 p-4 text-center">
                {contactsCount === 0
                  ? "Aucun contact disponible. Créez d'abord des contacts."
                  : contactSearch
                    ? `Aucun contact ne correspond à "${contactSearch}".`
                    : "Aucun contact dans ce filtre (ou tous déjà inscrits)."}
              </p>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredContacts.map((c) => {
                  const checked = selectedContactIds.includes(c.id);
                  return (
                    <li key={c.id}>
                      <label className={`flex items-center gap-3 p-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${checked ? "bg-red-50 dark:bg-red-900/10" : ""}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleContact(c.id)}
                          className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-red-600 focus:ring-red-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{c.prenom} {c.nom}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2 truncate">
                            <span className="truncate">{c.email}</span>
                            {c.entreprise ? (
                              <span className="inline-flex items-center gap-1 text-gray-600 dark:text-gray-400">
                                <Building2 className="h-3 w-3" /> {c.entreprise.nom}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-500">
                                <User className="h-3 w-3" /> Particulier
                              </span>
                            )}
                          </div>
                        </div>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Capacité restante : <strong className={overCapacity ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-gray-100"}>{capaciteRestante}</strong> place{capaciteRestante > 1 ? "s" : ""}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button
            onClick={onSubmit}
            disabled={selectedContactIds.length === 0 || adding || overCapacity}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {adding
              ? "Inscription..."
              : selectedContactIds.length === 0
                ? "Sélectionner des contacts"
                : `Inscrire ${selectedContactIds.length} contact${selectedContactIds.length > 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
