"use client";

import { useState } from "react";
import { UserPlus, Clock, CheckCircle2, XCircle, AlertCircle, CalendarDays } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { useApi } from "@/hooks/useApi";
import { api, ApiError } from "@/lib/fetcher";

type Contact = {
  id: string;
  nom: string;
  prenom: string;
  inscriptions: {
    id: string;
    statut: string;
    session: {
      id: string;
      dateDebut: string;
      dateFin: string;
      formation: { titre: string };
    };
  }[];
};

type SessionDisponible = {
  id: string;
  dateDebut: string;
  dateFin: string;
  lieu: string | null;
  capaciteMax: number;
  formation: { titre: string; duree: number };
  _count: { inscriptions: number };
};

const STATUT_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  en_attente:  { label: "En attente",  icon: Clock,         className: "text-amber-400 bg-amber-900/30" },
  confirmee:   { label: "Confirmée",   icon: CheckCircle2,  className: "text-green-400 bg-green-900/30" },
  annulee:     { label: "Annulée",     icon: XCircle,       className: "text-red-400 bg-red-900/30" },
  presente:    { label: "Présente",    icon: CheckCircle2,  className: "text-green-400 bg-green-900/30" },
  absente:     { label: "Absente",     icon: XCircle,       className: "text-gray-400 bg-gray-700" },
};

export default function ClientInscriptionsPage() {
  const [selectedContact, setSelectedContact] = useState("");
  const [selectedSession, setSelectedSession] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const { data: contactsData, isLoading: contactsLoading, mutate: mutateContacts } = useApi<Contact[]>("/api/client/stagiaires");
  const { data: sessionsData, isLoading: sessionsLoading } = useApi<SessionDisponible[]>("/api/client/inscriptions");
  const contacts: Contact[] = Array.isArray(contactsData) ? contactsData : [];
  const sessions: SessionDisponible[] = Array.isArray(sessionsData) ? sessionsData : [];
  const loading = contactsLoading || sessionsLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!selectedContact || !selectedSession) {
      setErrorMsg("Veuillez sélectionner un stagiaire et une session.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/api/client/inscriptions", { sessionId: selectedSession, contactId: selectedContact });
      setSuccessMsg("Demande d'inscription envoyée. L'administrateur va la traiter.");
      setSelectedContact("");
      setSelectedSession("");
      await mutateContacts(); // refresh inscriptions list (nested under each contact)
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Erreur lors de la demande.";
      setErrorMsg(message);
    }
    setSubmitting(false);
  };

  // Collect all inscriptions across contacts (most recent first)
  const allInscriptions = contacts
    .flatMap((c) =>
      (c.inscriptions || []).map((i) => ({ ...i, contact: c }))
    )
    .sort((a, b) => new Date(b.session.dateDebut).getTime() - new Date(a.session.dateDebut).getTime());

  return (
    <div>
      <PageHeader
        title="Inscriptions"
        description="Inscrivez vos collaborateurs aux sessions de formation disponibles"
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* ── Section 1 : Formulaire d'inscription ── */}
          <div className="rounded-lg border bg-gray-800 p-6">
            <div className="flex items-center gap-2 mb-5">
              <UserPlus className="h-5 w-5 text-red-500" />
              <h2 className="text-lg font-semibold text-gray-100">Inscrire un collaborateur</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {successMsg && (
                <div className="flex items-start gap-2 rounded-md bg-green-900/20 border border-green-700 px-4 py-3 text-sm text-green-400">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  {successMsg}
                </div>
              )}
              {errorMsg && (
                <div className="flex items-start gap-2 rounded-md bg-red-900/20 border border-red-700 px-4 py-3 text-sm text-red-400">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Stagiaire */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-300">
                    Stagiaire *
                  </label>
                  {contacts.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">Aucun stagiaire enregistré</p>
                  ) : (
                    <select
                      value={selectedContact}
                      onChange={(e) => setSelectedContact(e.target.value)}
                      className="w-full h-10 rounded-md border border-gray-600 bg-gray-900 px-3 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="">-- Sélectionner un collaborateur --</option>
                      {contacts.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.prenom} {c.nom}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Session */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-300">
                    Session disponible *
                  </label>
                  {sessions.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">Aucune session disponible pour le moment</p>
                  ) : (
                    <select
                      value={selectedSession}
                      onChange={(e) => setSelectedSession(e.target.value)}
                      className="w-full h-10 rounded-md border border-gray-600 bg-gray-900 px-3 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="">-- Sélectionner une session --</option>
                      {sessions.map((s) => {
                        const places = s.capaciteMax - s._count.inscriptions;
                        return (
                          <option key={s.id} value={s.id}>
                            {s.formation.titre} — {formatDate(s.dateDebut)} ({places} place{places > 1 ? "s" : ""})
                          </option>
                        );
                      })}
                    </select>
                  )}
                </div>
              </div>

              {/* Session detail preview */}
              {selectedSession && (() => {
                const s = sessions.find((s) => s.id === selectedSession);
                if (!s) return null;
                const places = s.capaciteMax - s._count.inscriptions;
                return (
                  <div className="rounded-md border border-gray-700 bg-gray-900/50 p-3 text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <CalendarDays className="h-4 w-4 text-red-500" />
                      <span className="font-medium text-gray-100">{s.formation.titre}</span>
                      <span className="text-xs text-gray-400">— {s.formation.duree}h</span>
                    </div>
                    <div className="text-gray-400 text-xs space-y-0.5 ml-6">
                      <p>Du {formatDate(s.dateDebut)} au {formatDate(s.dateFin)}</p>
                      {s.lieu && <p>Lieu : {s.lieu}</p>}
                      <p className={places <= 3 ? "text-amber-400 font-medium" : "text-green-400"}>
                        {places} place{places > 1 ? "s" : ""} disponible{places > 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                );
              })()}

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={submitting || !selectedContact || !selectedSession}
                  className="gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  {submitting ? "Envoi en cours..." : "Demander l'inscription"}
                </Button>
              </div>
            </form>
          </div>

          {/* ── Section 2 : Inscriptions en cours ── */}
          <div className="rounded-lg border bg-gray-800 overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-4 border-b">
              <CalendarDays className="h-5 w-5 text-red-500" />
              <h2 className="text-lg font-semibold text-gray-100">
                Inscriptions en cours
                {allInscriptions.length > 0 && (
                  <span className="ml-2 text-sm font-normal text-gray-400">
                    ({allInscriptions.length})
                  </span>
                )}
              </h2>
            </div>

            {allInscriptions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CalendarDays className="h-10 w-10 text-gray-600 mb-3" />
                <p className="text-gray-400 text-sm">Aucune inscription enregistrée</p>
                <p className="text-gray-500 text-xs mt-1">Utilisez le formulaire ci-dessus pour inscrire un collaborateur</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-900 border-b">
                  <tr>
                    <th className="text-left px-6 py-3 font-medium text-gray-400">Collaborateur</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-400">Formation</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-400">Date</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-400">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {allInscriptions.map((insc) => {
                    const cfg = STATUT_CONFIG[insc.statut] || STATUT_CONFIG.en_attente;
                    const Icon = cfg.icon;
                    return (
                      <tr key={insc.id} className="border-b last:border-0 hover:bg-gray-700/50">
                        <td className="px-6 py-3 font-medium text-gray-100">
                          {insc.contact.prenom} {insc.contact.nom}
                        </td>
                        <td className="px-6 py-3 text-gray-300">
                          {insc.session.formation.titre}
                        </td>
                        <td className="px-6 py-3 text-gray-400">
                          {formatDate(insc.session.dateDebut)}
                        </td>
                        <td className="px-6 py-3">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.className}`}>
                            <Icon className="h-3 w-3" />
                            {cfg.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
