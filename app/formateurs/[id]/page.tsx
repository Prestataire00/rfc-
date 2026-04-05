"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  GraduationCap,
  Mail,
  Phone,
  Euro,
  FileText,
  ArrowLeft,
  Pencil,
  Trash2,
  Calendar,
  BookOpen,
} from "lucide-react";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { StatutBadge } from "@/components/shared/StatutBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SESSION_STATUTS } from "@/lib/constants";
import { formatDate, formatCurrency, parseSpecialites } from "@/lib/utils";

interface Formation {
  id: string;
  titre: string;
}

interface Session {
  id: string;
  dateDebut: string;
  dateFin: string;
  statut: keyof typeof SESSION_STATUTS;
  lieu: string | null;
  formation: Formation;
}

interface Formateur {
  id: string;
  nom: string;
  prenom: string;
  email: string | null;
  telephone: string | null;
  specialites: string;
  tarifJournalier: number | null;
  notes: string | null;
  sessions: Session[];
  createdAt: string;
}

type TabKey = "informations" | "sessions";

export default function FormateurDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [formateur, setFormateur] = useState<Formateur | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("informations");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch(`/api/formateurs/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Formateur introuvable");
        return res.json();
      })
      .then((data) => setFormateur(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/formateurs/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erreur lors de la suppression");
      router.push("/formateurs");
    } catch {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center py-24">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !formateur) {
    return (
      <div className="p-6">
        <p className="text-red-600">{error || "Formateur introuvable"}</p>
        <Link href="/formateurs" className="text-red-600 hover:underline text-sm mt-2 inline-block">
          Retour aux formateurs
        </Link>
      </div>
    );
  }

  const specialites = parseSpecialites(formateur.specialites);

  const now = new Date();
  const sessionsPassees = formateur.sessions.filter(
    (s) => new Date(s.dateFin) < now
  );
  const sessionsAVenir = formateur.sessions.filter(
    (s) => new Date(s.dateDebut) >= now
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Breadcrumb items={[
          { label: "Formateurs", href: "/formateurs" },
          { label: `${formateur.prenom} ${formateur.nom}` },
        ]} />
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-red-900/30 flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-100">
                {formateur.prenom} {formateur.nom}
              </h1>
              {specialites.length > 0 && (
                <div className="flex items-center gap-1 mt-1 flex-wrap">
                  {specialites.map((s, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center rounded-full bg-red-900/20 px-2 py-0.5 text-xs font-medium text-red-400"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/formateurs/${id}/modifier`}
              className="inline-flex items-center gap-2 rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors"
            >
              <Pencil className="h-4 w-4" />
              Modifier
            </Link>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteOpen(true)}
              className="inline-flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Supprimer
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-700 mb-6">
        <nav className="flex gap-6">
          {(["informations", "sessions"] as TabKey[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-red-600 text-red-600"
                  : "border-transparent text-gray-400 hover:text-gray-300"
              }`}
            >
              {tab === "informations" ? "Informations" : `Sessions (${formateur.sessions.length})`}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "informations" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Coordonnées</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {formateur.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                  <a href={`mailto:${formateur.email}`} className="text-sm text-red-600 hover:underline">
                    {formateur.email}
                  </a>
                </div>
              )}
              {formateur.telephone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                  <a href={`tel:${formateur.telephone}`} className="text-sm text-gray-300 hover:underline">
                    {formateur.telephone}
                  </a>
                </div>
              )}
              {formateur.tarifJournalier != null && (
                <div className="flex items-center gap-3">
                  <Euro className="h-4 w-4 text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-300">
                    {formatCurrency(formateur.tarifJournalier)} / jour
                  </span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                <span className="text-sm text-gray-400">
                  Ajouté le {formatDate(formateur.createdAt)}
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-4 text-center">
                  <div className="text-2xl font-bold text-red-600">{sessionsAVenir.length}</div>
                  <div className="text-xs text-gray-400 mt-1">Session{sessionsAVenir.length !== 1 ? "s" : ""} à venir</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{sessionsPassees.length}</div>
                  <div className="text-xs text-gray-400 mt-1">Session{sessionsPassees.length !== 1 ? "s" : ""} passée{sessionsPassees.length !== 1 ? "s" : ""}</div>
                </CardContent>
              </Card>
            </div>

            {formateur.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-400" />
                    Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-300 whitespace-pre-wrap">{formateur.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {activeTab === "sessions" && (
        <div className="space-y-6">
          {/* Sessions à venir */}
          {sessionsAVenir.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-red-500" />
                Sessions à venir ({sessionsAVenir.length})
              </h3>
              <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Formation</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Dates</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Lieu</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-800 divide-y divide-gray-200">
                    {sessionsAVenir.map((session) => {
                      const statutInfo = SESSION_STATUTS[session.statut];
                      return (
                        <tr key={session.id} className="hover:bg-gray-700 transition-colors">
                          <td className="px-6 py-4">
                            <Link
                              href={`/formations/${session.formation.id}`}
                              className="text-sm font-medium text-red-600 hover:underline"
                            >
                              {session.formation.titre}
                            </Link>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                            {formatDate(session.dateDebut)} → {formatDate(session.dateFin)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                            {session.lieu || <span className="text-gray-400">—</span>}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {statutInfo && (
                              <StatutBadge label={statutInfo.label} color={statutInfo.color} />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sessions passées */}
          {sessionsPassees.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                Sessions passées ({sessionsPassees.length})
              </h3>
              <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Formation</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Dates</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Lieu</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-800 divide-y divide-gray-200">
                    {sessionsPassees.map((session) => {
                      const statutInfo = SESSION_STATUTS[session.statut];
                      return (
                        <tr key={session.id} className="hover:bg-gray-700 transition-colors">
                          <td className="px-6 py-4">
                            <Link
                              href={`/formations/${session.formation.id}`}
                              className="text-sm font-medium text-red-600 hover:underline"
                            >
                              {session.formation.titre}
                            </Link>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                            {formatDate(session.dateDebut)} → {formatDate(session.dateFin)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                            {session.lieu || <span className="text-gray-400">—</span>}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {statutInfo && (
                              <StatutBadge label={statutInfo.label} color={statutInfo.color} />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {formateur.sessions.length === 0 && (
            <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-sm">
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Calendar className="h-8 w-8 text-gray-300 mb-3" />
                <p className="text-sm text-gray-400">Aucune session assignée</p>
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Supprimer le formateur"
        description={`Êtes-vous sûr de vouloir supprimer ${formateur.prenom} ${formateur.nom} ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
