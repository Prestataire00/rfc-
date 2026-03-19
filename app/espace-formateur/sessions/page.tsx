"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
  capaciteMax: number;
  formation: { titre: string; duree: number };
  _count: { inscriptions: number };
  inscriptions: { contact: { nom: string; prenom: string } }[];
};

export default function FormateurSessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetch("/api/formateur/mes-sessions")
      .then((r) => r.ok ? r.json() : [])
      .then((d) => { setSessions(d); setLoading(false); });
  }, []);

  const filtered = filter === "all" ? sessions : sessions.filter((s) => s.statut === filter);

  return (
    <div>
      <PageHeader title="Mes Sessions" description="Consultez vos sessions de formation" />

      <div className="flex gap-2 mb-6">
        {[{ key: "all", label: "Toutes" }, ...Object.entries(SESSION_STATUTS).map(([k, v]) => ({ key: k, label: v.label }))].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${filter === f.key ? "bg-blue-100 text-blue-700 border-blue-300" : "bg-gray-50 text-gray-600 border-gray-200"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Aucune session</div>
      ) : (
        <div className="space-y-4">
          {filtered.map((s) => {
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
                  </div>
                  {st && <StatutBadge label={st.label} color={st.color} />}
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">{s._count.inscriptions}/{s.capaciteMax} participants</span>
                </div>
                {s.inscriptions.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs font-medium text-gray-500 mb-2">Stagiaires :</p>
                    <div className="flex flex-wrap gap-2">
                      {s.inscriptions.map((insc, idx) => (
                        <span key={idx} className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700">
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
