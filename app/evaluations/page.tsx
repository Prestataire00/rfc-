"use client";
// v2 - dashboard style
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MessageSquare, Star, BarChart3, CheckCircle, Clock, ArrowRight, Send, Download, FileText, X } from "lucide-react";
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
  const searchParams = useSearchParams();
  const filtre = searchParams.get("filtre"); // "attente" | "completees" | null
  const typeFilter = searchParams.get("type"); // "satisfaction_chaud" | "satisfaction_froid" | "acquis" | null
  const [allEvaluations, setAllEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/evaluations")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => {
        setAllEvaluations(Array.isArray(d) ? d : []);
        setLoading(false);
      })
      .catch(() => {
        setAllEvaluations([]);
        setLoading(false);
      });
  }, []);

  // Filtered evaluations (based on type from sidebar)
  const evaluations = typeFilter ? allEvaluations.filter((e) => e.type === typeFilter) : allEvaluations;
  const completed = evaluations.filter((e) => e.estComplete);
  const pending = evaluations.filter((e) => !e.estComplete);
  const avgNote = completed.length > 0
    ? completed.reduce((sum, e) => sum + (e.noteGlobale || 0), 0) / completed.length
    : 0;

  // byType always uses ALL evaluations for the global overview
  const byType = Object.entries(EVALUATION_TYPES).map(([key, val]) => ({
    key,
    label: val.label,
    count: allEvaluations.filter((e) => e.type === key).length,
  }));

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
      </div>
    );
  }

  // Vue filtrée
  if (filtre === "attente" || filtre === "completees") {
    const liste = filtre === "attente" ? pending : completed;
    const titre = filtre === "attente" ? "En attente de réponse" : "Évaluations complétées";
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-100">{titre} <span className="text-lg font-normal text-gray-400">({liste.length})</span></h1>
          <Link href="/evaluations" className="inline-flex items-center gap-1.5 rounded-md border border-gray-600 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors">
            <X className="h-4 w-4" /> Retour
          </Link>
        </div>
        {liste.length === 0 ? (
          <p className="text-gray-400 text-center py-12">Aucune évaluation</p>
        ) : (
          <div className="space-y-2">
            {liste.map((ev) => (
              <div
                key={ev.id}
                onClick={() => router.push(`/evaluations/${ev.id}`)}
                className="flex items-center justify-between p-4 rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700 cursor-pointer transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-100 truncate">{ev.session.formation.titre}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {EVALUATION_TYPES[ev.type as keyof typeof EVALUATION_TYPES]?.label} • {ev.contact ? `${ev.contact.prenom} ${ev.contact.nom}` : "—"} • {formatDate(ev.createdAt)}
                  </p>
                </div>
                {ev.estComplete && ev.noteGlobale ? (
                  <div className="flex items-center gap-1 shrink-0 ml-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-4 w-4 ${i < ev.noteGlobale! ? "fill-amber-400 text-amber-400" : "text-gray-600"}`} />
                    ))}
                  </div>
                ) : (
                  <Send className="h-4 w-4 text-gray-500 shrink-0 ml-4" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const typeLabel = typeFilter ? (EVALUATION_TYPES[typeFilter as keyof typeof EVALUATION_TYPES]?.label ?? typeFilter) : null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">
            {typeLabel ? typeLabel : "Evaluations & Satisfaction"}
          </h1>
          <p className="text-gray-400 text-sm">
            {typeLabel ? `Filtrage par type : ${typeLabel}` : "Vue d'ensemble des questionnaires de satisfaction"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {typeFilter && (
            <Link
              href="/evaluations"
              className="inline-flex items-center gap-2 rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors"
            >
              <X className="h-4 w-4" />
              Voir tout
            </Link>
          )}
          <Link
            href="/evaluations/modeles"
            className="inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
          >
            <FileText className="h-4 w-4" />
            Mes modeles
          </Link>
          <a
            href="/api/export/evaluations"
            download
            className="inline-flex items-center gap-2 rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            Exporter CSV
          </a>
        </div>
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
              <Link
                key={t.key}
                href={typeFilter === t.key ? "/evaluations" : `/evaluations?type=${t.key}`}
                className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                  typeFilter === t.key ? "bg-red-900/20 border border-red-700" : "hover:bg-gray-700"
                }`}
              >
                <span className={`text-sm ${typeFilter === t.key ? "text-red-400 font-medium" : "text-gray-300"}`}>{t.label}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500 rounded-full"
                      style={{ width: `${evaluations.length > 0 ? (t.count / evaluations.length) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-100 w-8 text-right">{t.count}</span>
                </div>
              </Link>
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
                <Link href="/evaluations?filtre=attente" className="flex items-center justify-center gap-1 text-sm text-red-500 hover:text-red-400 pt-2">
                  Voir tout ({pending.length}) <ArrowRight className="h-4 w-4" />
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
