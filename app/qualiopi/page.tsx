"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BadgeCheck, BookOpen, Users, ClipboardList, MessageSquare,
  FileText, BarChart3, CheckCircle2, AlertTriangle, Clock,
  TrendingUp, Target, Shield, ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Stats {
  totalFormations: number;
  totalSessions: number;
  totalStagiaires: number;
  totalEvaluations: number;
  evaluationsCompletes: number;
  tauxSatisfaction: number;
  tauxReussite: number;
  documentsManquants: number;
}

const CRITERES_QUALIOPI = [
  {
    numero: 1,
    titre: "Conditions d'information du public",
    description: "Informations rendues accessibles au public sur les prestations, les delais, les resultats et les tarifs.",
    indicateurs: ["1.1", "1.2", "1.3"],
    icon: Target,
    color: "text-blue-500 bg-blue-900/30",
  },
  {
    numero: 2,
    titre: "Identification des objectifs et adaptation",
    description: "Identification precise des objectifs des prestations et adaptation aux beneficiaires.",
    indicateurs: ["2.1", "2.2", "2.3", "2.4"],
    icon: ClipboardList,
    color: "text-emerald-500 bg-emerald-900/30",
  },
  {
    numero: 3,
    titre: "Adaptation aux publics beneficiaires",
    description: "Adaptation aux publics, modalites d'accueil, accompagnement et suivi.",
    indicateurs: ["3.1", "3.2", "3.3"],
    icon: Users,
    color: "text-purple-500 bg-purple-900/30",
  },
  {
    numero: 4,
    titre: "Adequation des moyens pedagogiques",
    description: "Adequation des moyens pedagogiques, techniques et d'encadrement.",
    indicateurs: ["4.1", "4.2", "4.3"],
    icon: BookOpen,
    color: "text-amber-500 bg-amber-900/30",
  },
  {
    numero: 5,
    titre: "Qualification des personnels",
    description: "Qualification et developpement des competences des personnels.",
    indicateurs: ["5.1", "5.2"],
    icon: BadgeCheck,
    color: "text-red-500 bg-red-900/30",
  },
  {
    numero: 6,
    titre: "Inscription dans l'environnement professionnel",
    description: "Inscription et investissement dans l'environnement professionnel.",
    indicateurs: ["6.1", "6.2", "6.3"],
    icon: TrendingUp,
    color: "text-cyan-500 bg-cyan-900/30",
  },
  {
    numero: 7,
    titre: "Recueil et prise en compte des appreciations",
    description: "Recueil et prise en compte des appreciations et reclamations.",
    indicateurs: ["7.1", "7.2", "7.3"],
    icon: MessageSquare,
    color: "text-pink-500 bg-pink-900/30",
  },
];

export default function QualiopiPage() {
  const [stats, setStats] = useState<Stats>({
    totalFormations: 0, totalSessions: 0, totalStagiaires: 0,
    totalEvaluations: 0, evaluationsCompletes: 0, tauxSatisfaction: 0,
    tauxReussite: 0, documentsManquants: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/formations").then((r) => r.ok ? r.json() : { total: 0 }),
      fetch("/api/sessions").then((r) => r.ok ? r.json() : []),
      fetch("/api/evaluations").then((r) => r.ok ? r.json() : []),
    ])
      .then(([formData, sessions, evaluations]) => {
        const sessionsArr = Array.isArray(sessions) ? sessions : sessions.sessions || [];
        const evalsArr = Array.isArray(evaluations) ? evaluations : [];
        const completed = evalsArr.filter((e: any) => e.estComplete);
        const notes = completed.filter((e: any) => e.noteGlobale).map((e: any) => e.noteGlobale);
        const avgNote = notes.length > 0 ? notes.reduce((a: number, b: number) => a + b, 0) / notes.length : 0;

        setStats({
          totalFormations: formData.total || 0,
          totalSessions: sessionsArr.length,
          totalStagiaires: sessionsArr.reduce((acc: number, s: any) => acc + (s._count?.inscriptions || 0), 0),
          totalEvaluations: evalsArr.length,
          evaluationsCompletes: completed.length,
          tauxSatisfaction: Math.round(avgNote * 20),
          tauxReussite: evalsArr.length > 0 ? Math.round((completed.length / evalsArr.length) * 100) : 0,
          documentsManquants: 0,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center py-24">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-red-900/30 flex items-center justify-center">
            <BadgeCheck className="h-6 w-6 text-red-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-100">Qualiopi</h1>
            <p className="text-sm text-gray-400">Tableau de bord qualite - Certification Qualiopi</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/qualiopi/indicateurs" className="inline-flex items-center gap-2 rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors">
            <BarChart3 className="h-4 w-4" /> Indicateurs
          </Link>
          <Link href="/qualiopi/audits" className="inline-flex items-center gap-2 rounded-md bg-red-600 hover:bg-red-700 px-3 py-2 text-sm font-medium text-white transition-colors">
            <Shield className="h-4 w-4" /> Audits
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-900/30 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-100">{stats.tauxSatisfaction}%</p>
                <p className="text-xs text-gray-400">Taux satisfaction</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-100">{stats.evaluationsCompletes}/{stats.totalEvaluations}</p>
                <p className="text-xs text-gray-400">Evaluations completees</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-900/30 flex items-center justify-center">
                <Users className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-100">{stats.totalStagiaires}</p>
                <p className="text-xs text-gray-400">Stagiaires formes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-900/30 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-100">{stats.totalFormations}</p>
                <p className="text-xs text-gray-400">Formations actives</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 7 Criteres Qualiopi */}
      <h2 className="text-lg font-semibold text-gray-100 mb-4">Les 7 criteres du Referentiel National Qualite</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {CRITERES_QUALIOPI.map((critere) => {
          const Icon = critere.icon;
          return (
            <Card key={critere.numero} className="hover:border-gray-600 transition-colors">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start gap-3">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${critere.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-red-500">Critere {critere.numero}</span>
                      <span className="text-[10px] text-gray-500">{critere.indicateurs.length} indicateurs</span>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-200 mb-1">{critere.titre}</h3>
                    <p className="text-xs text-gray-400 line-clamp-2">{critere.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Raccourcis */}
      <h2 className="text-lg font-semibold text-gray-100 mb-4">Acces rapides</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/evaluations" className="flex items-center gap-3 p-4 rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-750 hover:border-gray-600 transition-colors group">
          <MessageSquare className="h-5 w-5 text-gray-400 group-hover:text-red-500 transition-colors" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-200">Evaluations</p>
            <p className="text-xs text-gray-400">Satisfaction & acquis</p>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-500 group-hover:text-gray-300 transition-colors" />
        </Link>
        <Link href="/documents" className="flex items-center gap-3 p-4 rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-750 hover:border-gray-600 transition-colors group">
          <FileText className="h-5 w-5 text-gray-400 group-hover:text-red-500 transition-colors" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-200">Documents</p>
            <p className="text-xs text-gray-400">Gestion documentaire</p>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-500 group-hover:text-gray-300 transition-colors" />
        </Link>
        <Link href="/qualiopi/indicateurs" className="flex items-center gap-3 p-4 rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-750 hover:border-gray-600 transition-colors group">
          <BarChart3 className="h-5 w-5 text-gray-400 group-hover:text-red-500 transition-colors" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-200">Indicateurs</p>
            <p className="text-xs text-gray-400">Suivi des KPIs</p>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-500 group-hover:text-gray-300 transition-colors" />
        </Link>
        <Link href="/qualiopi/audits" className="flex items-center gap-3 p-4 rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-750 hover:border-gray-600 transition-colors group">
          <Shield className="h-5 w-5 text-gray-400 group-hover:text-red-500 transition-colors" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-200">Audits</p>
            <p className="text-xs text-gray-400">Preparation & suivi</p>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-500 group-hover:text-gray-300 transition-colors" />
        </Link>
      </div>
    </div>
  );
}
