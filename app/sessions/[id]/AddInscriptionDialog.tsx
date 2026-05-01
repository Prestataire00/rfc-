"use client";

import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import type { Contact } from "./types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableContacts: Contact[];
  selectedContactId: string;
  setSelectedContactId: (id: string) => void;
  contactSearch: string;
  setContactSearch: (q: string) => void;
  adding: boolean;
  addError: string;
  onSubmit: () => void;
  contactsCount: number;
};

export function AddInscriptionDialog({
  open,
  onOpenChange,
  availableContacts,
  selectedContactId,
  setSelectedContactId,
  contactSearch,
  setContactSearch,
  adding,
  addError,
  onSubmit,
  contactsCount,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle>Ajouter un participant</DialogTitle>
        </DialogHeader>
        {addError && (
          <p className="text-sm text-red-600 bg-red-900/20 border border-red-700 rounded-md px-3 py-2">{addError}</p>
        )}
        <div className="py-2 space-y-3">
          {/* Search contacts */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher un contact..."
              value={contactSearch}
              onChange={(e) => setContactSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <label className="text-sm font-medium text-gray-300 block">Sélectionner un contact</label>
          <select
            value={selectedContactId}
            onChange={(e) => setSelectedContactId(e.target.value)}
            className="w-full h-auto rounded-md border border-gray-600 bg-gray-800 px-3 text-sm"
            size={Math.min(8, Math.max(3, availableContacts.length + 1))}
          >
            <option value="">-- Choisir un contact --</option>
            {availableContacts.map((c) => (
              <option key={c.id} value={c.id}>{c.prenom} {c.nom} — {c.email}</option>
            ))}
          </select>
          {availableContacts.length === 0 && contactsCount > 0 && !contactSearch && (
            <p className="text-xs text-gray-400">Tous les contacts sont déjà inscrits.</p>
          )}
          {availableContacts.length === 0 && contactSearch && (
            <p className="text-xs text-gray-400">Aucun contact ne correspond à &quot;{contactSearch}&quot;</p>
          )}
          <p className="text-xs text-gray-400">{availableContacts.length} contact{availableContacts.length !== 1 ? "s" : ""} disponible{availableContacts.length !== 1 ? "s" : ""}</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={onSubmit} disabled={!selectedContactId || adding}>
            {adding ? "Inscription..." : "Inscrire"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
