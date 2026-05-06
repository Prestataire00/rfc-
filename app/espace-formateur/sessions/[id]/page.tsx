"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CalendarDays, MapPin, Users, ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatutBadge } from "@/components/shared/StatutBadge";
import { SESSION_STATUTS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { useApi } from "@/hooks/useApi";
import { EmargementGrid } from "@/components/emargement/EmargementGrid";

type Inscription = {
  id: string;
  statut: string;
  contact: { id: string; nom: string; prenom: string; email?: string };
};

type Session = {
  id: string;
  dateDebut: string;
  dateFin: string;
  lieu: string | null;
  statut: string;
  capaciteMax: number;
  formation: { titre: string; duree: number };
  inscriptions: Inscription[];
  _count: { inscriptions: number };
};

export default function FormateurSessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  // On reutilise /api/formateur/mes-sessions et on filtre cote client : pas besoin de creer un endpoint dedie.
  const { data, isLoading, error } = useApi<Session[]>("/api/formateur/mes-sessions");
  const sessions: Session[] = Array.isArray(data) ? data : [];
  const session = sessions.find((s) => s.id === id);

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="py-12">
        <Link href="/espace-formateur/sessions" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200 mb-4">
          <ArrowLeft className="h-4 w-4" /> Retour
        </Link>
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-6 text-center">
          <p className="text-gray-300">Session introuvable ou vous n&apos;y etes pas assigne.</p>
        </div>
      </div>
    );
  }

  const st = SESSION_STATUTS[session.statut as keyof typeof SESSION_STATUTS];
  const canEmarger = ["confirmee", "en_cours", "terminee"].includes(session.statut);
  const stagiairesActifs = session.inscriptions.filter((i) => ["confirmee", "en_attente", "presente"].includes(i.statut));

  return (
    <div>
      <Link
        href="/espace-formateur/sessions"
        className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200 mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Mes sessions
      </Link>

      <PageHeader
        title={session.formation.titre}
        description={`${formatDate(session.dateDebut)} - ${formatDate(session.dateFin)}`}
      />

      <div className="rounded-lg border border-gray-700 bg-gray-800 p-5 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <CalendarDays className="h-4 w-4 text-red-400" />
              {formatDate(session.dateDebut)} &mdash; {formatDate(session.dateFin)} ({session.formation.duree}h)
            </div>
            {session.lieu && (
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <MapPin className="h-4 w-4 text-red-400" />
                {session.lieu}
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Users className="h-4 w-4 text-red-400" />
              {session._count.inscriptions} / {session.capaciteMax} participants
            </div>
          </div>
          {st && <StatutBadge label={st.label} color={st.color} />}
        </div>

        {stagiairesActifs.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <p className="text-xs font-medium text-gray-400 mb-2">Stagiaires inscrits :</p>
            <div className="flex flex-wrap gap-2">
              {stagiairesActifs.map((insc) => (
                <span
                  key={insc.id}
                  className="inline-flex rounded-full bg-gray-700 px-2.5 py-0.5 text-xs text-gray-200"
                >
                  {insc.contact.prenom} {insc.contact.nom}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {canEmarger && stagiairesActifs.length > 0 && (
        <div className="rounded-lg border border-gray-700 bg-gray-800 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <h2 className="font-semibold text-gray-100 flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-green-500" />
              Emargement
            </h2>
          </div>
          <div className="p-4">
            <EmargementGrid
              sessionId={session.id}
              dateDebut={session.dateDebut}
              dateFin={session.dateFin}
              inscriptions={session.inscriptions}
              formationTitre={session.formation.titre}
              apiBasePath="/api/formateur/sessions"
            />
          </div>
        </div>
      )}

      {!canEmarger && (
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-5 text-center text-sm text-gray-400">
          L&apos;emargement sera disponible une fois la session confirmee.
        </div>
      )}
    </div>
  );
}
