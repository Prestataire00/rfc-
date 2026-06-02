"use client";

// Dialog "Inscrire à une session" — déclenché depuis la fiche contact
// (/contacts/[id]). Liste les sessions à venir avec recherche, sélection,
// puis POST /api/sessions/[sessionId]/inscriptions { contactId }.
// L'inscription déclenche automatiquement l'envoi de la convention par
// email (cf. lib/automations/auto-convention.ts).

import { useEffect, useMemo, useState } from "react";
import { Search, Loader2, CalendarDays, MapPin, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/useApi";
import { api, ApiError } from "@/lib/fetcher";
import { notify } from "@/lib/toast";
import { formatDate } from "@/lib/utils";

type Session = {
  id: string;
  dateDebut: string;
  dateFin: string;
  lieu: string | null;
  statut: string;
  capaciteMax: number;
  formation: { titre: string };
  _count?: { inscriptions: number };
};

export function InscrireSessionDialog({
  open,
  onOpenChange,
  contactId,
  contactNom,
  onInscribed,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  contactNom: string;
  onInscribed?: () => void | Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Charge les sessions à venir (planifiees, confirmées) seulement quand
  // le dialog s'ouvre — pas de fetch tant que pas demandé.
  const { data: sessionsData, isLoading } = useApi<Session[] | { data: Session[] }>(
    open ? "/api/sessions?limit=100" : null,
  );
  const sessions: Session[] = Array.isArray(sessionsData)
    ? sessionsData
    : sessionsData?.data ?? [];

  // Reset l'état quand on ferme
  useEffect(() => {
    if (!open) {
      setSearch("");
      setSelectedSessionId(null);
    }
  }, [open]);

  const filteredSessions = useMemo(() => {
    const now = new Date();
    return sessions
      .filter((s) => {
        // Sessions futures ou en cours, non annulées
        if (s.statut === "annulee" || s.statut === "terminee") return false;
        if (new Date(s.dateFin) < now) return false;
        // Sessions non pleines
        const inscrits = s._count?.inscriptions ?? 0;
        if (inscrits >= s.capaciteMax) return false;
        // Filtre texte
        if (search) {
          const q = search.toLowerCase();
          const match =
            s.formation.titre.toLowerCase().includes(q) ||
            (s.lieu?.toLowerCase().includes(q) ?? false);
          if (!match) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(a.dateDebut).getTime() - new Date(b.dateDebut).getTime());
  }, [sessions, search]);

  const handleInscribe = async () => {
    if (!selectedSessionId || submitting) return;
    setSubmitting(true);
    try {
      await api.post(`/api/sessions/${selectedSessionId}/inscriptions`, {
        contactId,
        statut: "confirmee",
      });
      notify.success("Inscription créée", "La convention va être envoyée par email");
      onOpenChange(false);
      if (onInscribed) await onInscribed();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Échec de l'inscription";
      notify.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Inscrire {contactNom} à une session</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Recherche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Rechercher une formation ou un lieu…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Liste sessions */}
          <div className="max-h-96 overflow-y-auto space-y-2 -mx-1 px-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-red-600" />
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {search
                    ? "Aucune session ne correspond à votre recherche."
                    : "Aucune session disponible avec des places restantes."}
                </p>
                {!search && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    Créez une session depuis /sessions/nouveau pour ouvrir des inscriptions.
                  </p>
                )}
              </div>
            ) : (
              filteredSessions.map((s) => {
                const inscrits = s._count?.inscriptions ?? 0;
                const restant = s.capaciteMax - inscrits;
                const isSelected = selectedSessionId === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedSessionId(s.id)}
                    className={`w-full text-left rounded-lg border p-3 transition-all ${
                      isSelected
                        ? "border-red-500 bg-red-50 dark:bg-red-900/20 ring-2 ring-red-500/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                          {s.formation.titre}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            {formatDate(s.dateDebut)}
                          </span>
                          {s.lieu && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {s.lieu}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {inscrits}/{s.capaciteMax}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          restant <= 2
                            ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                            : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                        }`}
                      >
                        {restant} place{restant > 1 ? "s" : ""}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Info auto-convention */}
          <div className="rounded-md border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-3 text-xs text-blue-700 dark:text-blue-300">
            La convention de formation sera envoyée automatiquement par email
            à {contactNom} dès l&apos;inscription validée.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Annuler
          </Button>
          <Button
            onClick={handleInscribe}
            disabled={!selectedSessionId || submitting}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {submitting ? "Inscription…" : "Inscrire"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
