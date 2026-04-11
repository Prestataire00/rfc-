"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Shield, Calendar, CheckCircle2, Clock, AlertTriangle, Plus, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Audit {
  id: string;
  type: "initial" | "surveillance" | "renouvellement";
  date: string;
  statut: "planifie" | "en_cours" | "termine" | "a_planifier";
  organisme: string;
  notes: string;
  nonConformites: number;
}

const MOCK_AUDITS: Audit[] = [
  {
    id: "1",
    type: "initial",
    date: "2024-03-15",
    statut: "termine",
    organisme: "AFNOR",
    notes: "Audit initial reussi. Certification obtenue.",
    nonConformites: 0,
  },
  {
    id: "2",
    type: "surveillance",
    date: "2025-03-15",
    statut: "termine",
    organisme: "AFNOR",
    notes: "Audit de surveillance an 1. RAS.",
    nonConformites: 1,
  },
  {
    id: "3",
    type: "surveillance",
    date: "2026-03-15",
    statut: "planifie",
    organisme: "AFNOR",
    notes: "",
    nonConformites: 0,
  },
  {
    id: "4",
    type: "renouvellement",
    date: "2027-03-15",
    statut: "a_planifier",
    organisme: "",
    notes: "",
    nonConformites: 0,
  },
];

const typeLabels: Record<string, string> = { initial: "Audit initial", surveillance: "Surveillance", renouvellement: "Renouvellement" };
const statutConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  termine: { label: "Termine", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
  en_cours: { label: "En cours", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: Clock },
  planifie: { label: "Planifie", color: "bg-amber-500/20 text-amber-400 border-amber-500/30", icon: Calendar },
  a_planifier: { label: "A planifier", color: "bg-gray-500/20 text-gray-400 border-gray-500/30", icon: AlertTriangle },
};

export default function AuditsPage() {
  const [audits] = useState<Audit[]>(MOCK_AUDITS);

  const prochainAudit = audits.find((a) => a.statut === "planifie" || a.statut === "a_planifier");
  const auditsTermines = audits.filter((a) => a.statut === "termine");

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link href="/qualiopi" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-300 mb-3">
          <ArrowLeft className="h-4 w-4" /> Retour Qualiopi
        </Link>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-purple-900/30 flex items-center justify-center">
              <Shield className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-100">Audits Qualiopi</h1>
              <p className="text-sm text-gray-400">Suivi et preparation des audits de certification</p>
            </div>
          </div>
        </div>
      </div>

      {/* Prochain audit */}
      {prochainAudit && (
        <Card className="mb-6 border-amber-700/50">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-amber-900/30 flex items-center justify-center shrink-0">
                <Calendar className="h-6 w-6 text-amber-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-gray-100">Prochain audit : {typeLabels[prochainAudit.type]}</h3>
                <p className="text-sm text-gray-400">
                  {prochainAudit.statut === "a_planifier" ? "Date a definir" : `Prevu le ${new Date(prochainAudit.date).toLocaleDateString("fr-FR")}`}
                  {prochainAudit.organisme && ` - ${prochainAudit.organisme}`}
                </p>
              </div>
              <Link href="/qualiopi/indicateurs" className="inline-flex items-center gap-2 rounded-md bg-amber-600 hover:bg-amber-700 px-3 py-2 text-sm font-medium text-white transition-colors">
                Preparer l&apos;audit
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline des audits */}
      <h2 className="text-lg font-semibold text-gray-100 mb-4">Historique des audits</h2>
      <div className="space-y-4">
        {audits.map((audit) => {
          const config = statutConfig[audit.statut];
          const Icon = config.icon;
          return (
            <Card key={audit.id}>
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start gap-4">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${config.color.split(" ").slice(0, 1).join(" ")}`}>
                    <Icon className={`h-5 w-5 ${config.color.split(" ")[1]}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-gray-200">{typeLabels[audit.type]}</h3>
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${config.color}`}>
                        {config.label}
                      </span>
                      {audit.nonConformites > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-900/30 text-red-400 border border-red-700 px-2 py-0.5 text-[11px] font-medium">
                          <AlertTriangle className="h-3 w-3" /> {audit.nonConformites} NC
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">
                      {audit.date ? new Date(audit.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "Date a definir"}
                      {audit.organisme && ` - ${audit.organisme}`}
                    </p>
                    {audit.notes && <p className="text-xs text-gray-400 mt-1">{audit.notes}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Checklist */}
      <h2 className="text-lg font-semibold text-gray-100 mb-4 mt-8">Checklist preparation audit</h2>
      <Card>
        <CardContent className="pt-5 pb-5">
          <div className="space-y-3">
            {[
              { label: "Catalogues de formations a jour", link: "/formations" },
              { label: "Evaluations de satisfaction collectees", link: "/evaluations" },
              { label: "Feuilles de presence signees", link: "/documents" },
              { label: "Attestations generees", link: "/documents" },
              { label: "CV et qualifications des formateurs", link: "/formateurs" },
              { label: "Indicateurs de resultats renseignes", link: "/qualiopi/indicateurs" },
              { label: "Processus d'amelioration continue documente", link: "/documents" },
            ].map((item) => (
              <Link key={item.label} href={item.link} className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-700 transition-colors group">
                <div className="h-5 w-5 rounded border border-gray-600 flex items-center justify-center shrink-0 group-hover:border-red-500">
                  <CheckCircle2 className="h-3.5 w-3.5 text-gray-600 group-hover:text-red-500" />
                </div>
                <span className="text-sm text-gray-300">{item.label}</span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
