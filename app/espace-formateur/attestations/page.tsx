"use client";

import { useState, useEffect } from "react";
import { Award, CheckCircle, Clock } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatDate } from "@/lib/utils";

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
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/formateur/mes-sessions")
      .then((r) => r.ok ? r.json() : [])
      .then((d) => {
        setSessions(d.filter((s: any) => s.statut === "terminee"));
        setLoading(false);
      });
  }, []);

  async function generateAttestation(sessionId: string, contactId: string) {
    const res = await fetch("/api/attestations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, contactId, type: "fin_formation" }),
    });
    if (res.ok) {
      // Refresh
      const updated = await fetch("/api/formateur/mes-sessions").then((r) => r.ok ? r.json() : []);
      setSessions(updated.filter((s: any) => s.statut === "terminee"));
    }
  }

  async function validateAttestation(attestationId: string) {
    await fetch(`/api/attestations/${attestationId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut: "validee" }),
    });
    const updated = await fetch("/api/formateur/mes-sessions").then((r) => r.ok ? r.json() : []);
    setSessions(updated.filter((s: any) => s.statut === "terminee"));
  }

  if (loading) {
    return <div className="flex justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>;
  }

  return (
    <div>
      <PageHeader title="Attestations" description="Générez et validez les attestations de fin de formation" />

      {sessions.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Aucune session terminee</div>
      ) : (
        <div className="space-y-6">
          {sessions.map((s) => (
            <div key={s.id} className="rounded-lg border bg-white overflow-hidden">
              <div className="px-6 py-4 border-b bg-gray-50">
                <h3 className="font-semibold text-gray-900">{s.formation.titre}</h3>
                <p className="text-xs text-gray-500">{formatDate(s.dateDebut)} - {formatDate(s.dateFin)}</p>
              </div>
              <div className="divide-y">
                {s.inscriptions.map((insc) => {
                  const att = (s as any).attestations?.find(
                    (a: any) => a.contactId === insc.contact.id && a.type === "fin_formation"
                  );
                  return (
                    <div key={insc.contact.id} className="flex items-center justify-between px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-medium text-xs">
                          {insc.contact.prenom[0]}{insc.contact.nom[0]}
                        </div>
                        <span className="text-sm text-gray-900">{insc.contact.prenom} {insc.contact.nom}</span>
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
                            className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700"
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
