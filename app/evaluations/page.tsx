"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { MessageSquare, Send, Star } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { EVALUATION_TYPES } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

type Evaluation = {
  id: string;
  type: string;
  cible: string;
  noteGlobale: number | null;
  estComplete: boolean;
  commentaire: string | null;
  tokenAcces: string | null;
  createdAt: string;
  session: { id: string; formation: { titre: string } };
  contact: { id: string; nom: string; prenom: string; email: string } | null;
};

export default function EvaluationsPage() {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (filterType) params.set("type", filterType);
    fetch(`/api/evaluations?${params}`).then((r) => r.ok ? r.json() : []).then((d) => {
      setEvaluations(d);
      setLoading(false);
    });
  }, [filterType]);

  const completedCount = evaluations.filter((e) => e.estComplete).length;
  const avgNote = evaluations.filter((e) => e.noteGlobale).reduce((sum, e) => sum + (e.noteGlobale || 0), 0) / (evaluations.filter((e) => e.noteGlobale).length || 1);

  return (
    <div className="max-w-4xl">
      <PageHeader title="Évaluations & Satisfaction" description="Suivi des questionnaires de satisfaction et évaluations" />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-lg border bg-gray-800 p-4">
          <p className="text-sm text-gray-400">Total évaluations</p>
          <p className="text-2xl font-bold text-gray-100">{evaluations.length}</p>
        </div>
        <div className="rounded-lg border bg-gray-800 p-4">
          <p className="text-sm text-gray-400">Complétées</p>
          <p className="text-2xl font-bold text-green-600">{completedCount}</p>
        </div>
        <div className="rounded-lg border bg-gray-800 p-4">
          <p className="text-sm text-gray-400">Note moyenne</p>
          <p className="text-2xl font-bold text-amber-600 flex items-center gap-1">
            {avgNote.toFixed(1)} <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="h-10 rounded-md border border-gray-700 bg-gray-800 px-3 text-sm"
        >
          <option value="">Tous les types</option>
          {Object.entries(EVALUATION_TYPES).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" /></div>
      ) : evaluations.length === 0 ? (
        <EmptyState icon={MessageSquare} title="Aucune évaluation" description="Les évaluations apparaîtront ici" />
      ) : (
        <div className="rounded-lg border bg-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-400">Formation</th>
                <th className="text-left px-4 py-3 font-medium text-gray-400">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-400">Cible</th>
                <th className="text-left px-4 py-3 font-medium text-gray-400">Répondant</th>
                <th className="text-left px-4 py-3 font-medium text-gray-400">Note</th>
                <th className="text-left px-4 py-3 font-medium text-gray-400">Statut</th>
                <th className="text-left px-4 py-3 font-medium text-gray-400">Date</th>
              </tr>
            </thead>
            <tbody>
              {evaluations.map((ev) => (
                <tr key={ev.id} className="border-b last:border-0 hover:bg-gray-700 cursor-pointer" onClick={() => window.location.href = `/evaluations/${ev.id}`}>
                  <td className="px-4 py-3">
                    <Link href={`/evaluations/${ev.id}`} className="text-red-600 hover:underline" onClick={(e) => e.stopPropagation()}>
                      {ev.session.formation.titre}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{EVALUATION_TYPES[ev.type as keyof typeof EVALUATION_TYPES]?.label || ev.type}</td>
                  <td className="px-4 py-3 text-gray-400 capitalize">{ev.cible}</td>
                  <td className="px-4 py-3 text-gray-300">{ev.contact ? `${ev.contact.prenom} ${ev.contact.nom}` : "—"}</td>
                  <td className="px-4 py-3">
                    {ev.noteGlobale ? (
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`h-3.5 w-3.5 ${i < ev.noteGlobale! ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
                        ))}
                      </div>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${ev.estComplete ? "bg-green-900/30 text-green-400" : "bg-gray-700 text-gray-400"}`}>
                      {ev.estComplete ? "Complétée" : "En attente"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{formatDate(ev.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
