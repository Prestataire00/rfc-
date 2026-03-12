"use client";

import { useState, useEffect } from "react";
import { BookOpen } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatutBadge } from "@/components/shared/StatutBadge";
import { SESSION_STATUTS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

type Session = {
  id: string;
  dateDebut: string;
  dateFin: string;
  lieu: string | null;
  statut: string;
  formation: { titre: string; duree: number; categorie: string | null };
  formateur: { nom: string; prenom: string } | null;
  inscriptions: { contact: { nom: string; prenom: string } }[];
  _count: { inscriptions: number };
};

export default function ClientFormationsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/client/formations")
      .then((r) => r.json())
      .then((d) => { setSessions(d); setLoading(false); });
  }, []);

  return (
    <div>
      <PageHeader title="Nos Formations" description="Suivi des formations commandees pour vos collaborateurs" />

      {loading ? (
        <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <BookOpen className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>Aucune formation pour le moment</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((s) => {
            const st = SESSION_STATUTS[s.statut as keyof typeof SESSION_STATUTS];
            return (
              <div key={s.id} className="rounded-lg border bg-white p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{s.formation.titre}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {formatDate(s.dateDebut)} - {formatDate(s.dateFin)}
                      {s.lieu ? ` | ${s.lieu}` : ""}
                      {` | ${s.formation.duree}h`}
                    </p>
                    {s.formateur && (
                      <p className="text-xs text-gray-400 mt-0.5">Formateur: {s.formateur.prenom} {s.formateur.nom}</p>
                    )}
                  </div>
                  {st && <StatutBadge label={st.label} color={st.color} />}
                </div>
                {s.inscriptions.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs font-medium text-gray-500 mb-2">Vos collaborateurs inscrits :</p>
                    <div className="flex flex-wrap gap-2">
                      {s.inscriptions.map((insc, idx) => (
                        <span key={idx} className="inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-xs text-blue-700">
                          {insc.contact.prenom} {insc.contact.nom}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
