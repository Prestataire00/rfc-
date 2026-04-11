"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, BarChart3, TrendingUp, Users, CheckCircle2, Clock, Star, BookOpen, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface KPI {
  label: string;
  value: string;
  target: string;
  progress: number;
  status: "ok" | "warning" | "danger";
  icon: React.ElementType;
}

export default function IndicateursPage() {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KPI[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/evaluations").then((r) => r.ok ? r.json() : []),
      fetch("/api/sessions").then((r) => r.ok ? r.json() : []),
      fetch("/api/formations").then((r) => r.ok ? r.json() : { total: 0 }),
    ])
      .then(([evaluations, sessions, formations]) => {
        const evalsArr = Array.isArray(evaluations) ? evaluations : [];
        const sessionsArr = Array.isArray(sessions) ? sessions : sessions.sessions || [];
        const completed = evalsArr.filter((e: any) => e.estComplete);
        const notes = completed.filter((e: any) => e.noteGlobale).map((e: any) => e.noteGlobale);
        const avgNote = notes.length > 0 ? (notes.reduce((a: number, b: number) => a + b, 0) / notes.length) : 0;
        const tauxCompletion = evalsArr.length > 0 ? Math.round((completed.length / evalsArr.length) * 100) : 0;
        const tauxSatisfaction = Math.round(avgNote * 20);
        const totalInscrits = sessionsArr.reduce((acc: number, s: any) => acc + (s._count?.inscriptions || 0), 0);
        const sessionsTerminees = sessionsArr.filter((s: any) => s.statut === "terminee").length;

        setKpis([
          { label: "Taux de satisfaction globale", value: `${tauxSatisfaction}%`, target: "90%", progress: tauxSatisfaction, status: tauxSatisfaction >= 90 ? "ok" : tauxSatisfaction >= 70 ? "warning" : "danger", icon: Star },
          { label: "Taux de completion des evaluations", value: `${tauxCompletion}%`, target: "80%", progress: tauxCompletion, status: tauxCompletion >= 80 ? "ok" : tauxCompletion >= 60 ? "warning" : "danger", icon: CheckCircle2 },
          { label: "Nombre de stagiaires formes", value: String(totalInscrits), target: "100+", progress: Math.min(100, totalInscrits), status: totalInscrits >= 100 ? "ok" : totalInscrits >= 50 ? "warning" : "danger", icon: Users },
          { label: "Sessions realisees", value: String(sessionsTerminees), target: "20+", progress: Math.min(100, sessionsTerminees * 5), status: sessionsTerminees >= 20 ? "ok" : sessionsTerminees >= 10 ? "warning" : "danger", icon: BookOpen },
          { label: "Evaluations collectees", value: String(evalsArr.length), target: "50+", progress: Math.min(100, evalsArr.length * 2), status: evalsArr.length >= 50 ? "ok" : evalsArr.length >= 20 ? "warning" : "danger", icon: MessageSquare },
          { label: "Note moyenne (/5)", value: avgNote > 0 ? avgNote.toFixed(1) : "N/A", target: "4.5/5", progress: Math.round(avgNote * 20), status: avgNote >= 4.5 ? "ok" : avgNote >= 3.5 ? "warning" : "danger", icon: TrendingUp },
        ]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const statusColors = { ok: "text-emerald-400", warning: "text-amber-400", danger: "text-red-400" };
  const progressColors = { ok: "bg-emerald-500", warning: "bg-amber-500", danger: "bg-red-500" };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center py-24">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link href="/qualiopi" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-300 mb-3">
          <ArrowLeft className="h-4 w-4" /> Retour Qualiopi
        </Link>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-blue-900/30 flex items-center justify-center">
            <BarChart3 className="h-6 w-6 text-blue-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-100">Indicateurs Qualite</h1>
            <p className="text-sm text-gray-400">Suivi des indicateurs de performance Qualiopi</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label}>
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-5 w-5 ${statusColors[kpi.status]}`} />
                    <span className="text-sm font-medium text-gray-300">{kpi.label}</span>
                  </div>
                </div>
                <div className="flex items-end justify-between mb-3">
                  <span className="text-3xl font-bold text-gray-100">{kpi.value}</span>
                  <span className="text-xs text-gray-400">Objectif : {kpi.target}</span>
                </div>
                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${progressColors[kpi.status]}`} style={{ width: `${Math.min(100, kpi.progress)}%` }} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
