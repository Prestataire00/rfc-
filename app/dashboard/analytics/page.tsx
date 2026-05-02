"use client";

import { Download, TrendingUp, Users, CalendarDays, BarChart3, Percent, PieChart } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useApi } from "@/hooks/useApi";

interface AnalyticsData {
  months: string[];
  revenueByMonth: number[];
  sessionsByMonth: number[];
  inscriptionsByMonth: number[];
  fillRateByMonth: number[];
  topFormations: { titre: string; count: number }[];
  topFormateurs: { nom: string; count: number }[];
  statutCounts: Record<string, number>;
}

const statutLabels: Record<string, string> = {
  planifiee: "Planifiée",
  confirmee: "Confirmée",
  en_cours: "En cours",
  terminee: "Terminée",
  annulee: "Annulée",
};

const statutColors: Record<string, string> = {
  planifiee: "bg-red-900/30 text-red-800 border-red-700",
  confirmee: "bg-green-900/30 text-green-300 border-green-700",
  en_cours: "bg-yellow-900/30 text-yellow-300 border-yellow-700",
  terminee: "bg-gray-700 text-gray-200 border-gray-700",
  annulee: "bg-red-900/30 text-red-800 border-red-700",
};

const statutBarColors: Record<string, string> = {
  planifiee: "bg-red-900/200",
  confirmee: "bg-green-900/200",
  en_cours: "bg-yellow-900/200",
  terminee: "bg-gray-9000",
  annulee: "bg-red-900/200",
};

export default function AnalyticsPage() {
  const { data, isLoading } = useApi<AnalyticsData>("/api/dashboard/analytics");
  const loading = isLoading;

  const handleExport = (type: string) => {
    window.open(`/api/export/${type}`, "_blank");
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <p className="text-gray-400">Erreur lors du chargement des données analytiques.</p>
      </div>
    );
  }

  const maxRevenue = Math.max(...data.revenueByMonth, 1);
  const maxSessions = Math.max(...data.sessionsByMonth, 1);
  const maxInscriptions = Math.max(...data.inscriptionsByMonth, 1);
  const maxFormationCount = data.topFormations.length > 0 ? data.topFormations[0].count : 1;
  const maxFormateurCount = data.topFormateurs.length > 0 ? data.topFormateurs[0].count : 1;

  const totalRevenue = data.revenueByMonth.reduce((a, b) => a + b, 0);
  const totalSessions = data.sessionsByMonth.reduce((a, b) => a + b, 0);
  const totalInscriptions = data.inscriptionsByMonth.reduce((a, b) => a + b, 0);
  const avgFillRate = data.fillRateByMonth.filter((r) => r > 0).length > 0
    ? Math.round(data.fillRateByMonth.filter((r) => r > 0).reduce((a, b) => a + b, 0) / data.fillRateByMonth.filter((r) => r > 0).length)
    : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-100">Analytics</h1>
          <p className="text-sm text-gray-400 mt-1">Statistiques avancées sur les 12 derniers mois</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport("formations")}
            className="inline-flex items-center gap-2 rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            Formations
          </button>
          <button
            onClick={() => handleExport("sessions")}
            className="inline-flex items-center gap-2 rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            Sessions
          </button>
          <button
            onClick={() => handleExport("factures")}
            className="inline-flex items-center gap-2 rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            Factures
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-900/30">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-400">CA Total (12 mois)</p>
                <p className="text-xl font-bold text-gray-100">
                  {totalRevenue.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-900/30">
                <CalendarDays className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Sessions (12 mois)</p>
                <p className="text-xl font-bold text-gray-100">{totalSessions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-900/30">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Inscriptions (12 mois)</p>
                <p className="text-xl font-bold text-gray-100">{totalInscriptions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-900/30">
                <Percent className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Taux remplissage moyen</p>
                <p className="text-xl font-bold text-gray-100">{avgFillRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CA Mensuel */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-semibold">
            <span className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              CA mensuel
            </span>
          </CardTitle>
          <button
            onClick={() => handleExport("factures")}
            className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-300 transition-colors"
          >
            <Download className="h-3.5 w-3.5" /> Exporter
          </button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.months.map((month, i) => (
              <div key={month} className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-20 shrink-0">{month}</span>
                <div className="flex-1 h-6 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-900/200 rounded-full transition-all duration-500"
                    style={{ width: `${(data.revenueByMonth[i] / maxRevenue) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-300 w-24 text-right">
                  {data.revenueByMonth[i].toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sessions mensuelles */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">
              <span className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-red-600" />
                Sessions mensuelles
              </span>
            </CardTitle>
            <button
              onClick={() => handleExport("sessions")}
              className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-300 transition-colors"
            >
              <Download className="h-3.5 w-3.5" /> Exporter
            </button>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-40">
              {data.months.map((month, i) => (
                <div key={month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-medium text-gray-300">{data.sessionsByMonth[i]}</span>
                  <div className="w-full bg-gray-700 rounded-t relative" style={{ height: "120px" }}>
                    <div
                      className="absolute bottom-0 w-full bg-red-900/200 rounded-t transition-all duration-500"
                      style={{ height: `${(data.sessionsByMonth[i] / maxSessions) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 truncate w-full text-center">{month.split(" ")[0]}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Inscriptions mensuelles */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-600" />
                Inscriptions mensuelles
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-40">
              {data.months.map((month, i) => (
                <div key={month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-medium text-gray-300">{data.inscriptionsByMonth[i]}</span>
                  <div className="w-full bg-gray-700 rounded-t relative" style={{ height: "120px" }}>
                    <div
                      className="absolute bottom-0 w-full bg-purple-900/200 rounded-t transition-all duration-500"
                      style={{ height: `${(data.inscriptionsByMonth[i] / maxInscriptions) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 truncate w-full text-center">{month.split(" ")[0]}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top formations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">
              <span className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-indigo-600" />
                Top 5 formations (inscriptions)
              </span>
            </CardTitle>
            <button
              onClick={() => handleExport("formations")}
              className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-300 transition-colors"
            >
              <Download className="h-3.5 w-3.5" /> Exporter
            </button>
          </CardHeader>
          <CardContent>
            {data.topFormations.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">Aucune donnée</p>
            ) : (
              <div className="space-y-3">
                {data.topFormations.map((f, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-300 truncate flex-1 mr-2">{f.titre}</span>
                      <span className="text-sm font-semibold text-gray-100">{f.count}</span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-900/200 rounded-full transition-all duration-500"
                        style={{ width: `${(f.count / maxFormationCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top formateurs */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4 text-teal-600" />
                Top 5 formateurs (sessions)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.topFormateurs.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">Aucune donnée</p>
            ) : (
              <div className="space-y-3">
                {data.topFormateurs.map((f, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-300 truncate flex-1 mr-2">{f.nom}</span>
                      <span className="text-sm font-semibold text-gray-100">{f.count} sessions</span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-900/200 rounded-full transition-all duration-500"
                        style={{ width: `${(f.count / maxFormateurCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Taux de remplissage */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">
              <span className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-orange-600" />
                Taux de remplissage par mois
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.months.map((month, i) => (
                <div key={month} className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-20 shrink-0">{month}</span>
                  <div className="flex-1 h-4 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        data.fillRateByMonth[i] >= 80
                          ? "bg-green-900/200"
                          : data.fillRateByMonth[i] >= 50
                          ? "bg-orange-900/200"
                          : data.fillRateByMonth[i] > 0
                          ? "bg-red-400"
                          : "bg-gray-200"
                      )}
                      style={{ width: `${data.fillRateByMonth[i]}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-300 w-10 text-right">
                    {data.fillRateByMonth[i]}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Repartition statuts */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">
              <span className="flex items-center gap-2">
                <PieChart className="h-4 w-4 text-gray-400" />
                Répartition des sessions par statut
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(data.statutCounts).map(([statut, count]) => (
                <div
                  key={statut}
                  className={cn(
                    "rounded-lg border p-3 text-center",
                    statutColors[statut] || "bg-gray-700 text-gray-200 border-gray-700"
                  )}
                >
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs font-medium mt-1">{statutLabels[statut] || statut}</p>
                </div>
              ))}
            </div>
            {/* Visual bar */}
            {Object.keys(data.statutCounts).length > 0 && (
              <div className="mt-4 flex rounded-full overflow-hidden h-3">
                {Object.entries(data.statutCounts).map(([statut, count]) => {
                  const total = Object.values(data.statutCounts).reduce((a, b) => a + b, 0);
                  const pct = total > 0 ? (count / total) * 100 : 0;
                  return (
                    <div
                      key={statut}
                      className={cn("transition-all", statutBarColors[statut] || "bg-gray-400")}
                      style={{ width: `${pct}%` }}
                      title={`${statutLabels[statut] || statut}: ${count} (${Math.round(pct)}%)`}
                    />
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
