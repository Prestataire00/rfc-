"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageSquare, Star, BarChart3, CheckCircle, Clock } from "lucide-react";
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
  const router = useRouter();
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("");
  const [filterStatut, setFilterStatut] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (filterType) params.set("type", filterType);
    fetch(`/api/evaluations?${params}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => {
        setEvaluations(Array.isArray(d) ? d : []);
        setLoading(false);
      })
      .catch(() => {
        setEvaluations([]);
        setLoading(false);
      });
  }, [filterType]);

  const completedCount = evaluations.filter((e) => e.estComplete).length;
  const pendingCount = evaluations.filter((e) => !e.estComplete).length;
  const avgNote =
    evaluations.filter((e) => e.noteGlobale).reduce((sum, e) => sum + (e.noteGlobale || 0), 0) /
    (evaluations.filter((e) => e.noteGlobale).length || 1);

  const filtered = evaluations.filter((e) => {
    if (filterStatut === "complete" && !e.estComplete) return false;
    if (filterStatut === "attente" && e.estComplete) return false;
    return true;
  });

  return (
    <div>
      <PageHeader
        title="Évaluations"
        description="Suivi des questionnaires de satisfaction"
      />

      {/* Stats compactes */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="rounded-lg border bg-gray-800 p-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-900/20">
            <BarChart3 className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Total</p>
            <p className="text-lg font-bold text-gray-100">{evaluations.length}</p>
          </div>
        </div>
        <div className="rounded-lg border bg-gray-800 p-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-900/20">
            <CheckCircle className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Complétées</p>
            <p className="text-lg font-bold text-green-500">{completedCount}</p>
          </div>
        </div>
        <div className="rounded-lg border bg-gray-800 p-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-900/20">
            <Clock className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <p className="text-xs text-gray-400">En attente</p>
            <p className="text-lg font-bold text-amber-500">{pendingCount}</p>
          </div>
        </div>
        <div className="rounded-lg border bg-gray-800 p-3 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-900/20">
            <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Note moyenne</p>
            <p className="text-lg font-bold text-amber-500">{avgNote.toFixed(1)}/5</p>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="h-9 rounded-md border border-gray-600 bg-gray-800 px-3 text-sm"
        >
          <option value="">Tous les types</option>
          {Object.entries(EVALUATION_TYPES).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select
          value={filterStatut}
          onChange={(e) => setFilterStatut(e.target.value)}
          className="h-9 rounded-md border border-gray-600 bg-gray-800 px-3 text-sm"
        >
          <option value="">Tous les statuts</option>
          <option value="complete">Complétées</option>
          <option value="attente">En attente</option>
        </select>
        <span className="text-sm text-gray-400 ml-auto">
          {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
        </span>
      </div>

      {/* Contenu */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="Aucune évaluation"
          description="Les évaluations apparaîtront ici après l'envoi de questionnaires"
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((ev) => (
            <div
              key={ev.id}
              onClick={() => router.push(`/evaluations/${ev.id}`)}
              className="rounded-lg border bg-gray-800 p-4 hover:bg-gray-700 cursor-pointer transition-colors"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Link
                      href={`/evaluations/${ev.id}`}
                      className="font-medium text-red-500 hover:underline truncate"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {ev.session.formation.titre}
                    </Link>
                    <span className={`shrink-0 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      ev.estComplete
                        ? "bg-green-900/30 text-green-400"
                        : "bg-gray-700 text-gray-400"
                    }`}>
                      {ev.estComplete ? "Complétée" : "En attente"}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-400">
                    <span>{EVALUATION_TYPES[ev.type as keyof typeof EVALUATION_TYPES]?.label || ev.type}</span>
                    <span className="capitalize">{ev.cible}</span>
                    {ev.contact && <span>{ev.contact.prenom} {ev.contact.nom}</span>}
                    <span>{formatDate(ev.createdAt)}</span>
                  </div>
                </div>
                <div className="shrink-0">
                  {ev.noteGlobale ? (
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < ev.noteGlobale! ? "fill-amber-400 text-amber-400" : "text-gray-600"
                          }`}
                        />
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500">—</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
