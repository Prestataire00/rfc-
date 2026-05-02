"use client";

import { Award, CheckCircle, Clock } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatDate } from "@/lib/utils";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/fetcher";

type Session = {
  id: string;
  dateDebut: string;
  dateFin: string;
  statut: string;
  formation: { titre: string };
  inscriptions: { contact: { id: string; nom: string; prenom: string } }[];
  attestations: { id: string; contactId: string; statut: string; type: string }[];
};

export default function AttestationsPage() {
  const { data, isLoading, mutate } = useApi<Session[]>("/api/formateur/mes-sessions");
  const sessions: Session[] = (data ?? []).filter((s) => s.statut === "terminee");
  const loading = isLoading;

  async function generateAttestation(sessionId: string, contactId: string) {
    try {
      await api.post("/api/attestations", { sessionId, contactId, type: "fin_formation" });
      await mutate();
    } catch {
      // ignore
    }
  }

  async function validateAttestation(attestationId: string) {
    await api.put(`/api/attestations/${attestationId}`, { statut: "validee" });
    await mutate();
  }

  if (loading) {
    return <div className="flex justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" /></div>;
  }

  return (
    <div>
      <PageHeader title="Attestations" description="Générez et validez les attestations de fin de formation" />

      {sessions.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Aucune session terminee</div>
      ) : (
        <div className="space-y-6">
          {sessions.map((s) => (
            <div key={s.id} className="rounded-lg border bg-gray-800 overflow-hidden">
              <div className="px-6 py-4 border-b bg-gray-900">
                <h3 className="font-semibold text-gray-100">{s.formation.titre}</h3>
                <p className="text-xs text-gray-400">{formatDate(s.dateDebut)} - {formatDate(s.dateFin)}</p>
              </div>
              <div className="divide-y">
                {s.inscriptions.map((insc) => {
                  const att = (s as any).attestations?.find(
                    (a: any) => a.contactId === insc.contact.id && a.type === "fin_formation"
                  );
                  return (
                    <div key={insc.contact.id} className="flex items-center justify-between px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center text-gray-400 font-medium text-xs">
                          {insc.contact.prenom[0]}{insc.contact.nom[0]}
                        </div>
                        <span className="text-sm text-gray-100">{insc.contact.prenom} {insc.contact.nom}</span>
                      </div>
                      <div>
                        {att ? (
                          att.statut === "validee" ? (
                            <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                              <CheckCircle className="h-3.5 w-3.5" /> Validee
                            </span>
                          ) : (
                            <button
                              onClick={() => validateAttestation(att.id)}
                              className="inline-flex items-center gap-1 rounded-md bg-green-600 px-3 py-1.5 text-xs text-white hover:bg-green-700"
                            >
                              <CheckCircle className="h-3.5 w-3.5" /> Valider
                            </button>
                          )
                        ) : (
                          <button
                            onClick={() => generateAttestation(s.id, insc.contact.id)}
                            className="inline-flex items-center gap-1 rounded-md bg-red-600 px-3 py-1.5 text-xs text-white hover:bg-red-700"
                          >
                            <Award className="h-3.5 w-3.5" /> Generer
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
