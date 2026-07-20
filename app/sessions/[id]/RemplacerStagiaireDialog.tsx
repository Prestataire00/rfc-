"use client";

import { useMemo, useState } from "react";
import { Search, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import type { Contact } from "./types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  // Inscription du stagiaire à remplacer (X).
  replaced: { id: string; name: string } | null;
  availableContacts: Contact[];
  onDone: () => void;
};

export function RemplacerStagiaireDialog({ open, onOpenChange, sessionId, replaced, availableContacts, onDone }: Props) {
  const [mode, setMode] = useState<"existant" | "nouveau">("existant");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [nc, setNc] = useState({ prenom: "", nom: "", email: "", dateNaissance: "", sexe: "", lieuNaissance: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const filtered = useMemo(() => {
    if (!search) return availableContacts.slice(0, 50);
    const q = search.toLowerCase();
    return availableContacts
      .filter((c) => c.nom.toLowerCase().includes(q) || c.prenom.toLowerCase().includes(q) || c.email.toLowerCase().includes(q))
      .slice(0, 50);
  }, [availableContacts, search]);

  const reset = () => {
    setMode("existant");
    setSearch("");
    setSelectedId(null);
    setNc({ prenom: "", nom: "", email: "", dateNaissance: "", sexe: "", lieuNaissance: "" });
    setError("");
  };

  const close = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const canSubmit =
    mode === "existant"
      ? !!selectedId
      : !!(nc.prenom.trim() && nc.nom.trim() && nc.email.trim());

  const handleSubmit = async () => {
    if (!replaced || !canSubmit) return;
    setSubmitting(true);
    setError("");
    const body =
      mode === "existant"
        ? { contactId: selectedId }
        : {
            newContact: {
              prenom: nc.prenom.trim(),
              nom: nc.nom.trim(),
              email: nc.email.trim(),
              dateNaissance: nc.dateNaissance || null,
              sexe: nc.sexe || null,
              lieuNaissance: nc.lieuNaissance || null,
            },
          };
    try {
      const res = await fetch(`/api/sessions/${sessionId}/inscriptions/${replaced.id}/remplacer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "Erreur lors du remplacement");
        setSubmitting(false);
        return;
      }
      reset();
      onOpenChange(false);
      onDone();
    } catch {
      setError("Erreur réseau");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent onClose={() => close(false)}>
        <DialogHeader>
          <DialogTitle>Remplacer {replaced?.name}</DialogTitle>
        </DialogHeader>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          Le remplaçant reprend la place sur la session et reçoit automatiquement convention, programme et fiche
          pré-formation. {replaced?.name} est conservé(e) en « remplacé(e) » pour l&apos;historique.
        </p>

        {error && (
          <p className="text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-md px-3 py-2">{error}</p>
        )}

        {/* Sélecteur de mode */}
        <div className="inline-flex rounded-md border border-gray-300 dark:border-gray-700 overflow-hidden text-sm">
          <button
            type="button"
            onClick={() => setMode("existant")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 ${mode === "existant" ? "bg-red-600 text-white" : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"}`}
          >
            <Users className="h-3.5 w-3.5" /> Contact existant
          </button>
          <button
            type="button"
            onClick={() => setMode("nouveau")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 border-l border-gray-300 dark:border-gray-700 ${mode === "nouveau" ? "bg-red-600 text-white" : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"}`}
          >
            <UserPlus className="h-3.5 w-3.5" /> Nouveau stagiaire
          </button>
        </div>

        {mode === "existant" ? (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Rechercher par nom, prénom ou email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="border border-gray-200 dark:border-gray-700 rounded-md max-h-60 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="text-xs text-gray-500 dark:text-gray-400 p-4 text-center">Aucun contact.</p>
              ) : (
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filtered.map((c) => (
                    <li key={c.id}>
                      <label className={`flex items-center gap-3 p-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${selectedId === c.id ? "bg-red-50 dark:bg-red-900/10" : ""}`}>
                        <input type="radio" name="remplacant" checked={selectedId === c.id} onChange={() => setSelectedId(c.id)} className="h-4 w-4 text-red-600 focus:ring-red-500" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{c.prenom} {c.nom}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{c.email}{c.entreprise ? ` · ${c.entreprise.nom}` : ""}</div>
                        </div>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Prénom *" value={nc.prenom} onChange={(e) => setNc({ ...nc, prenom: e.target.value })} />
              <Input placeholder="Nom *" value={nc.nom} onChange={(e) => setNc({ ...nc, nom: e.target.value })} />
            </div>
            <Input type="email" placeholder="Email *" value={nc.email} onChange={(e) => setNc({ ...nc, email: e.target.value })} />
            <div className="grid grid-cols-3 gap-3">
              <Input type="date" placeholder="Date de naissance" value={nc.dateNaissance} onChange={(e) => setNc({ ...nc, dateNaissance: e.target.value })} />
              <select value={nc.sexe} onChange={(e) => setNc({ ...nc, sexe: e.target.value })} className="h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 text-sm">
                <option value="">Sexe</option>
                <option value="M">Homme</option>
                <option value="F">Femme</option>
              </select>
              <Input placeholder="Lieu de naissance" value={nc.lieuNaissance} onChange={(e) => setNc({ ...nc, lieuNaissance: e.target.value })} />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || submitting} className="bg-red-600 hover:bg-red-700 text-white">
            {submitting ? "Remplacement..." : "Confirmer le remplacement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
