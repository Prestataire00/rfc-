"use client";

import { MessageSquare, Star } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatDate } from "@/lib/utils";
import { useApi } from "@/hooks/useApi";

type Evaluation = {
  id: string;
  type: string;
  noteGlobale: number | null;
  commentaire: string | null;
  estComplete: boolean;
  createdAt: string;
  session: { formation: { titre: string } };
  contact: { nom: string; prenom: string } | null;
};

export default function ClientEvaluationsPage() {
  const { data, isLoading } = useApi<Evaluation[]>("/api/client/evaluations");
  const evaluations: Evaluation[] = data ?? [];
  const loading = isLoading;

  return (
    <div>
      <PageHeader title="Évaluations" description="Résultats des évaluations de satisfaction" />

      {loading ? (
        <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" /></div>
      ) : evaluations.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>Aucune évaluation disponible</p>
        </div>
      ) : (
        <div className="space-y-4">
          {evaluations.map((ev) => (
            <div key={ev.id} className="rounded-lg border bg-gray-800 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-100">{ev.session.formation.titre}</h3>
                  {ev.contact && <p className="text-sm text-gray-400">{ev.contact.prenom} {ev.contact.nom}</p>}
                  <p className="text-xs text-gray-400 mt-1">{formatDate(ev.createdAt)}</p>
                  {ev.commentaire && <p className="text-sm text-gray-400 mt-2">{ev.commentaire}</p>}
                </div>
                {ev.noteGlobale && (
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-4 w-4 ${i < ev.noteGlobale! ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
