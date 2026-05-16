"use client";

// Page admin /certifications — adresse l'exigence du cahier des charges §2.2 :
// suivi des formations certifiantes, échéances, statistiques annuelles taux
// de réussite et certifications obtenues.

import { useState } from "react";
import Link from "next/link";
import { Award, TrendingUp, AlertTriangle, Calendar, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { useApi } from "@/hooks/useApi";
import { formatDate } from "@/lib/utils";

type Certification = {
  id: string;
  dateObtention: string;
  dateExpiration: string | null;
  statut: string; // valide | expire | en_cours_recyclage
  contact: {
    id: string;
    nom: string;
    prenom: string;
    email: string;
    entreprise: { id: string; nom: string } | null;
  };
  formation: {
    id: string;
    titre: string;
    certifiante: boolean;
    codeRNCP: string | null;
    dureeRecyclage: number | null;
  };
};

type CertResponse = {
  annee: number;
  certifications: Certification[];
  stats: {
    nbCertifiesAnnee: number;
    nbSessionsCertifiantes: number;
    nbInscritsCertifiantsTotal: number;
    tauxReussite: number;
    echeancesProches: number;
    repartitionStatut: Record<string, number>;
  };
};

const STATUT_LABELS: Record<string, string> = {
  valide: "Valide",
  expire: "Expirée",
  en_cours_recyclage: "En cours de recyclage",
};

const STATUT_COLORS: Record<string, string> = {
  valide: "bg-emerald-900/30 text-emerald-400 border border-emerald-700",
  expire: "bg-red-900/30 text-red-400 border border-red-700",
  en_cours_recyclage: "bg-amber-900/30 text-amber-400 border border-amber-700",
};

export default function CertificationsPage() {
  const currentYear = new Date().getFullYear();
  const [annee, setAnnee] = useState(currentYear);
  const [statutFilter, setStatutFilter] = useState("");

  const params = new URLSearchParams({ annee: String(annee) });
  if (statutFilter) params.set("statut", statutFilter);

  const { data, isLoading } = useApi<CertResponse>(`/api/certifications?${params.toString()}`);

  return (
    <div className="p-6">
      <PageHeader
        title="Certifications stagiaires"
        description="Suivi des formations certifiantes, échéances et statistiques annuelles."
      />

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <label className="text-sm text-gray-400">
          Année :
          <select
            value={annee}
            onChange={(e) => setAnnee(parseInt(e.target.value, 10))}
            className="ml-2 rounded-md border border-gray-600 bg-gray-800 px-3 py-1.5 text-sm text-gray-200"
          >
            {[currentYear, currentYear - 1, currentYear - 2, currentYear - 3].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </label>
        <label className="text-sm text-gray-400">
          Statut :
          <select
            value={statutFilter}
            onChange={(e) => setStatutFilter(e.target.value)}
            className="ml-2 rounded-md border border-gray-600 bg-gray-800 px-3 py-1.5 text-sm text-gray-200"
          >
            <option value="">Tous</option>
            <option value="valide">Valide</option>
            <option value="expire">Expirée</option>
            <option value="en_cours_recyclage">En cours de recyclage</option>
          </select>
        </label>
      </div>

      {/* Statistiques */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={Award}
            label={`Certifiés en ${annee}`}
            value={data.stats.nbCertifiesAnnee}
            color="emerald"
          />
          <StatCard
            icon={TrendingUp}
            label="Taux de réussite"
            value={`${data.stats.tauxReussite} %`}
            sublabel={`${data.stats.nbCertifiesAnnee}/${data.stats.nbInscritsCertifiantsTotal} stagiaires`}
            color="blue"
          />
          <StatCard
            icon={Calendar}
            label="Sessions certifiantes"
            value={data.stats.nbSessionsCertifiantes}
            sublabel={`en ${annee}`}
            color="purple"
          />
          <StatCard
            icon={AlertTriangle}
            label="Échéances < 60 j"
            value={data.stats.echeancesProches}
            sublabel="recyclage urgent"
            color="amber"
          />
        </div>
      )}

      {/* Liste */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
        </div>
      ) : !data || data.certifications.length === 0 ? (
        <div className="bg-gray-800 border border-gray-700 rounded-xl py-16 text-center">
          <Award className="h-10 w-10 text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Aucune certification pour {annee}</p>
        </div>
      ) : (
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 border-b border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Stagiaire</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Entreprise</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Formation</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Obtention</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Expiration</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Statut</th>
              </tr>
            </thead>
            <tbody>
              {data.certifications.map((c) => (
                <tr key={c.id} className="border-b border-gray-700 hover:bg-gray-750">
                  <td className="px-4 py-3">
                    <Link href={`/contacts/${c.contact.id}`} className="text-red-500 hover:underline">
                      {c.contact.prenom} {c.contact.nom}
                    </Link>
                    <div className="text-xs text-gray-500">{c.contact.email}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {c.contact.entreprise ? (
                      <Link href={`/entreprises/${c.contact.entreprise.id}`} className="hover:underline">
                        {c.contact.entreprise.nom}
                      </Link>
                    ) : <span className="text-gray-500 italic">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {c.formation.titre}
                    {c.formation.codeRNCP && (
                      <div className="text-xs text-gray-500">RNCP : {c.formation.codeRNCP}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-xs">{formatDate(c.dateObtention)}</td>
                  <td className="px-4 py-3 text-gray-300 text-xs">
                    {c.dateExpiration ? formatDate(c.dateExpiration) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUT_COLORS[c.statut] ?? "bg-gray-700"}`}>
                      {c.statut === "en_cours_recyclage" && <RefreshCw className="h-3 w-3" />}
                      {STATUT_LABELS[c.statut] ?? c.statut}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sublabel?: string;
  color: "emerald" | "blue" | "purple" | "amber";
}) {
  const colorMap = {
    emerald: { bg: "from-emerald-50 to-green-50", text: "text-emerald-900", icon: "text-emerald-600", label: "text-emerald-800", sub: "text-emerald-600" },
    blue: { bg: "from-blue-50 to-sky-50", text: "text-blue-900", icon: "text-blue-600", label: "text-blue-800", sub: "text-blue-600" },
    purple: { bg: "from-purple-50 to-violet-50", text: "text-purple-900", icon: "text-purple-600", label: "text-purple-800", sub: "text-purple-600" },
    amber: { bg: "from-amber-50 to-yellow-50", text: "text-amber-900", icon: "text-amber-600", label: "text-amber-800", sub: "text-amber-600" },
  }[color];

  return (
    <div className={`rounded-lg border bg-gradient-to-br ${colorMap.bg} p-5`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-5 w-5 ${colorMap.icon}`} />
        <span className={`text-sm font-medium ${colorMap.label}`}>{label}</span>
      </div>
      <p className={`text-3xl font-bold ${colorMap.text}`}>{value}</p>
      {sublabel && <p className={`text-xs ${colorMap.sub} mt-1`}>{sublabel}</p>}
    </div>
  );
}
