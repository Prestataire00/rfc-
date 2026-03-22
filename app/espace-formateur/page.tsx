"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CalendarDays, BookOpen, Clock, CheckCircle } from "lucide-react";
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
};

export default function EspaceFormateurPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/formateur/mes-sessions")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { setSessions(Array.isArray(d) ? d : []); setLoading(false); });
  }, []);

  const now = new Date();
  const aVenir = sessions.filter((s) => new Date(s.dateDebut) > now && s.statut !== "annulee");
  const enCours = sessions.filter((s) => s.statut === "en_cours");
  const terminees = sessions.filter((s) => s.statut === "terminee");

  if (loading) {
    return <div className="flex justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" /></div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-100">Mon Espace Formateur</h1>
        <p className="text-gray-400 mt-1">Bienvenue dans votre espace personnel</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="rounded-lg border bg-gray-800 p-5 flex items-center gap-4">
          <div className="rounded-full p-3 bg-red-900/30"><CalendarDays className="h-6 w-6 text-red-600" /></div>
          <div>
            <p className="text-sm text-gray-400">Sessions a venir</p>
            <p className="text-2xl font-bold text-gray-100">{aVenir.length}</p>
          </div>
        </div>
        <div className="rounded-lg border bg-gray-800 p-5 flex items-center gap-4">
          <div className="rounded-full p-3 bg-yellow-900/30"><Clock className="h-6 w-6 text-yellow-600" /></div>
          <div>
            <p className="text-sm text-gray-400">En cours</p>
            <p className="text-2xl font-bold text-gray-100">{enCours.length}</p>
          </div>
        </div>
        <div className="rounded-lg border bg-gray-800 p-5 flex items-center gap-4">
          <div className="rounded-full p-3 bg-green-900/30"><CheckCircle className="h-6 w-6 text-green-600" /></div>
          <div>
            <p className="text-sm text-gray-400">Terminees</p>
            <p className="text-2xl font-bold text-gray-100">{terminees.length}</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-gray-800 overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="font-semibold text-gray-100">Prochaines sessions</h2>
        </div>
        {aVenir.length === 0 ? (
          <div className="p-6 text-center text-gray-400 text-sm">Aucune session a venir</div>
        ) : (
          <div className="divide-y">
            {aVenir.slice(0, 10).map((s) => {
              const st = SESSION_STATUTS[s.statut as keyof typeof SESSION_STATUTS];
              return (
                <Link key={s.id} href={`/espace-formateur/sessions/${s.id}`} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-700">
                  <div className="flex-shrink-0 text-center w-12">
                    <div className="text-lg font-bold text-red-600">{new Date(s.dateDebut).getDate()}</div>
                    <div className="text-xs text-gray-400">{new Date(s.dateDebut).toLocaleDateString("fr-FR", { month: "short" })}</div>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-100">{s.formation.titre}</p>
                    <p className="text-xs text-gray-400">
                      {formatDate(s.dateDebut)} - {formatDate(s.dateFin)}
                      {s.lieu ? ` | ${s.lieu}` : ""}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">{s._count.inscriptions}/{s.capaciteMax}</span>
                  {st && <StatutBadge label={st.label} color={st.color} />}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
