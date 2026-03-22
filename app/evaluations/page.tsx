"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageSquare, Star, BarChart3, CheckCircle, Clock, ArrowRight, Send } from "lucide-react";
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

function StatCard({ icon: Icon, label, value, color, sub }: { icon: any; label: string; value: string | number; color: string; sub?: string }) {
  return (
    <div className="rounded-xl border bg-gray-800 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">{label}</span>
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-100">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function EvaluationsPage() {
  const router = useRouter();
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/evaluations")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => {
        setEvaluations(Array.isArray(d) ? d : []);
        setLoading(false);
      })
      .catch(() => {
        setEvaluations([]);
        setLoading(false);
      });
  }, []);

  const completed = evaluations.filter((e) => e.estComplete);
  const pending = evaluations.filter((e) => !e.estComplete);
  const avgNote = completed.length > 0
    ? completed.reduce((sum, e) => sum + (e.noteGlobale || 0), 0) / completed.length
    : 0;

  const byType = Object.entries(EVALUATION_TYPES).map(([key, val]) => ({
    key,
    label: val.label,
    count: evaluations.filter((e) => e.type === key).length,
  }));

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-100">Évaluations & Satisfaction</h1>
        <p className="text-gray-400 text-sm">Vue d'ensemble des questionnaires de satisfaction</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={BarChart3} label="Total évaluations" value={evaluations.length} color="bg-red-900/20 text-red-400" />
        <StatCard icon={CheckCircle} label="Complétées" value={completed.length} color="bg-green-900/20 text-green-400" sub={evaluations.length > 0 ? `${Math.round((completed.length / evaluations.length) * 100)}% de taux de réponse` : undefined} />
        <StatCard icon={Clock} label="En attente" value={pending.length} color="bg-amber-900/20 text-amber-400" />
        <StatCard icon={Star} label="Note moyenne" value={`${avgNote.toFixed(1)} / 5`} color="bg-amber-900/20 text-amber-400" />
      </div>

      {/* Répartition par type + Dernières complétées */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Répartition par type */}
        <div className="rounded-xl border bg-gray-800 p-5">
          <h2 className="font-semibold text-gray-100 mb-4">Répartition par type</h2>
          <div className="space-y-3">
            {byType.map((t) => (
              <div key={t.key} className="flex items-center justify-between">
                <span className="text-sm text-gray-300">{t.label}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500 rounded-full"
                      style={{ width: `${evaluations.length > 0 ? (t.count / evaluations.length) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-100 w-8 text-right">{t.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Note moyenne par étoile */}
        <div className="rounded-xl border bg-gray-800 p-5">
          <h2 className="font-semibold text-gray-100 mb-4">Distribution des notes</h2>
          {completed.length === 0 ? (
            <p className="text-sm text-gray-400">Aucune évaluation complétée</p>
          ) : (
            <div className="space-y-3">
              {[5, 4, 3, 2, 1].map((n) => {
                const count = completed.filter((e) => e.noteGlobale === n).length;
                return (
                  <div key={n} className="flex items-center gap-3">
                    <div className="flex items-center gap-1 w-20">
                      {Array.from({ length: n }).map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full"
                        style={{ width: `${completed.length > 0 ? (count / completed.length) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-300 w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Dernières évaluations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* En attente */}
        <div className="rounded-xl border bg-gray-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-100">En attente de réponse</h2>
            <span className="text-xs bg-amber-900/20 text-amber-400 px-2 py-1 rounded-full">{pending.length}</span>
          </div>
          {pending.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Aucune évaluation en attente</p>
          ) : (
            <div className="space-y-2">
              {pending.slice(0, 5).map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => router.push(`/evaluations/${ev.id}`)}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-900 hover:bg-gray-700 cursor-pointer transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-100 truncate">{ev.session.formation.titre}</p>
                    <p className="text-xs text-gray-400">
                      {EVALUATION_TYPES[ev.type as keyof typeof EVALUATION_TYPES]?.label} • {ev.contact ? `${ev.contact.prenom} ${ev.contact.nom}` : "—"}
                    </p>
                  </div>
                  <Send className="h-4 w-4 text-gray-500 shrink-0" />
                </div>
              ))}
              {pending.length > 5 && (
                <Link href="/evaluations" className="flex items-center justify-center gap-1 text-sm text-red-500 hover:text-red-400 pt-2">
                  Voir tout <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Dernières complétées */}
        <div className="rounded-xl border bg-gray-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-100">Dernières complétées</h2>
            <span className="text-xs bg-green-900/20 text-green-400 px-2 py-1 rounded-full">{completed.length}</span>
          </div>
          {completed.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Aucune évaluation complétée</p>
          ) : (
            <div className="space-y-2">
              {completed.slice(0, 5).map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => router.push(`/evaluations/${ev.id}`)}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-900 hover:bg-gray-700 cursor-pointer transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-100 truncate">{ev.session.formation.titre}</p>
                    <p className="text-xs text-gray-400">
                      {ev.contact ? `${ev.contact.prenom} ${ev.contact.nom}` : "—"} • {formatDate(ev.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {ev.noteGlobale && Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-3 w-3 ${i < ev.noteGlobale! ? "fill-amber-400 text-amber-400" : "text-gray-600"}`} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
