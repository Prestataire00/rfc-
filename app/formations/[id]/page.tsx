"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  BookOpen, Clock, Euro, Tag, FileText, Target, ArrowLeft, Pencil, Trash2,
  Calendar, Users, Star, Monitor, Video, Shuffle, Award, RefreshCw,
  Accessibility, BarChart3, Wrench, ClipboardList, GraduationCap, Wallet,
} from "lucide-react";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { StatutBadge } from "@/components/shared/StatutBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NIVEAUX_FORMATION, SESSION_STATUTS, MODALITES_FORMATION, STATUTS_FORMATION, TYPES_FINANCEMENT } from "@/lib/constants";
import { formatDate, formatCurrency, formatDuree } from "@/lib/utils";

interface Formateur {
  id: string;
  nom: string;
  prenom: string;
}

interface Session {
  id: string;
  dateDebut: string;
  dateFin: string;
  statut: keyof typeof SESSION_STATUTS;
  lieu: string | null;
  formateur: Formateur | null;
  _count: {
    inscriptions: number;
  };
}

interface Formation {
  id: string;
  titre: string;
  description: string | null;
  duree: number;
  tarif: number;
  niveau: string;
  prerequis: string | null;
  objectifs: string | null;
  categorie: string | null;
  actif: boolean;
  modalite: string;
  statut: string;
  publicCible: string | null;
  contenuProgramme: string | null;
  methodesPedagogiques: string | null;
  methodesEvaluation: string | null;
  moyensTechniques: string | null;
  accessibilite: string | null;
  indicateursResultats: string | null;
  typesFinancement: string;
  certifiante: boolean;
  codeRNCP: string | null;
  dureeRecyclage: number | null;
  misEnAvant: boolean;
  sessions: Session[];
  createdAt: string;
}

const niveauColors: Record<string, string> = {
  tous: "bg-gray-700 text-gray-300 border-gray-700",
  debutant: "bg-green-900/30 text-green-400 border-green-700",
  intermediaire: "bg-red-900/30 text-red-400 border-red-700",
  avance: "bg-purple-900/30 text-purple-400 border-purple-200",
};

const modaliteIcons: Record<string, React.ReactNode> = {
  presentiel: <Monitor className="h-4 w-4" />,
  distanciel: <Video className="h-4 w-4" />,
  mixte: <Shuffle className="h-4 w-4" />,
};

type TabKey = "informations" | "programme" | "sessions";

export default function FormationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [formation, setFormation] = useState<Formation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("informations");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch(`/api/formations/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Formation introuvable");
        return res.json();
      })
      .then((data) => setFormation(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/formations/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erreur lors de la suppression");
      router.push("/formations");
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

  if (error || !formation) {
    return (
      <div className="p-6">
        <p className="text-red-600">{error || "Formation introuvable"}</p>
        <Link href="/formations" className="text-red-600 hover:underline text-sm mt-2 inline-block">
          Retour aux formations
        </Link>
      </div>
    );
  }

  const niveauLabel = NIVEAUX_FORMATION.find((n) => n.value === formation.niveau)?.label ?? formation.niveau;
  const niveauColor = niveauColors[formation.niveau] ?? "bg-gray-700 text-gray-300 border-gray-700";
  const modaliteInfo = MODALITES_FORMATION[formation.modalite as keyof typeof MODALITES_FORMATION];
  const statutInfo = STATUTS_FORMATION[formation.statut as keyof typeof STATUTS_FORMATION];

  let financements: string[] = [];
  try { financements = JSON.parse(formation.typesFinancement); } catch { financements = []; }

  const tabs: { key: TabKey; label: string }[] = [
    { key: "informations", label: "Informations" },
    { key: "programme", label: "Programme & Méthodes" },
    { key: "sessions", label: `Sessions (${formation.sessions.length})` },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Breadcrumb items={[
          { label: "Formations", href: "/formations" },
          { label: formation.titre },
        ]} />
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-red-900/30 flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                {formation.misEnAvant && <Star className="h-4 w-4 text-amber-400" />}
                <h1 className="text-2xl font-bold text-gray-100">{formation.titre}</h1>
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <StatutBadge label={niveauLabel} color={niveauColor} />
                {modaliteInfo && (
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${modaliteInfo.color}`}>
                    {modaliteIcons[formation.modalite]}
                    {modaliteInfo.label}
                  </span>
                )}
                {statutInfo && (
                  <StatutBadge label={statutInfo.label} color={statutInfo.color} />
                )}
                {formation.categorie && (
                  <span className="text-sm text-gray-400">{formation.categorie}</span>
                )}
                {formation.certifiante && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-900/30 text-amber-400 border border-amber-700 px-2.5 py-0.5 text-xs font-medium">
                    <Award className="h-3 w-3" />
                    Certifiante
                  </span>
                )}
                {!formation.actif && (
                  <span className="inline-flex items-center rounded-full border bg-gray-700 text-gray-400 border-gray-700 px-2.5 py-0.5 text-xs font-medium">
                    Inactive
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/formations/${id}/modifier`}
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
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-red-600 text-red-600"
                  : "border-transparent text-gray-400 hover:text-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab: Informations */}
      {activeTab === "informations" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Caractéristiques</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-gray-400 shrink-0" />
                <div>
                  <span className="text-sm text-gray-400">Durée : </span>
                  <span className="text-sm font-medium text-gray-100">{formatDuree(formation.duree)}</span>
                  <span className="text-sm text-gray-400"> ({formation.duree}h)</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Euro className="h-4 w-4 text-gray-400 shrink-0" />
                <div>
                  <span className="text-sm text-gray-400">Tarif : </span>
                  <span className="text-sm font-medium text-gray-100">{formatCurrency(formation.tarif)}</span>
                </div>
              </div>
              {formation.categorie && (
                <div className="flex items-center gap-3">
                  <Tag className="h-4 w-4 text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-300">{formation.categorie}</span>
                </div>
              )}
              {formation.certifiante && formation.codeRNCP && (
                <div className="flex items-center gap-3">
                  <Award className="h-4 w-4 text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-300">Code RNCP : {formation.codeRNCP}</span>
                </div>
              )}
              {formation.certifiante && formation.dureeRecyclage && (
                <div className="flex items-center gap-3">
                  <RefreshCw className="h-4 w-4 text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-300">Recyclage : {formation.dureeRecyclage} mois</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                <span className="text-sm text-gray-400">
                  Créée le {formatDate(formation.createdAt)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Financement */}
          {financements.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-gray-400" />
                  Financements acceptés
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {financements.map((f: string) => {
                    const label = TYPES_FINANCEMENT.find((t) => t.value === f)?.label ?? f;
                    return (
                      <span key={f} className="inline-flex items-center rounded-full bg-gray-700 text-gray-300 border border-gray-600 px-2.5 py-0.5 text-xs font-medium">
                        {label}
                      </span>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Description */}
          {formation.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-400" />
                  Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-300 whitespace-pre-wrap">{formation.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Objectifs */}
          {formation.objectifs && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4 text-gray-400" />
                  Objectifs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-300 whitespace-pre-wrap">{formation.objectifs}</p>
              </CardContent>
            </Card>
          )}

          {/* Public cible */}
          {formation.publicCible && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-gray-400" />
                  Public cible
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-300 whitespace-pre-wrap">{formation.publicCible}</p>
              </CardContent>
            </Card>
          )}

          {/* Prérequis */}
          {formation.prerequis && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Prérequis</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-300 whitespace-pre-wrap">{formation.prerequis}</p>
              </CardContent>
            </Card>
          )}

          {/* Accessibilité */}
          {formation.accessibilite && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Accessibility className="h-4 w-4 text-gray-400" />
                  Accessibilité
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-300 whitespace-pre-wrap">{formation.accessibilite}</p>
              </CardContent>
            </Card>
          )}

          {/* Indicateurs de résultats */}
          {formation.indicateursResultats && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-gray-400" />
                  Indicateurs de résultats
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-300 whitespace-pre-wrap">{formation.indicateursResultats}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Tab: Programme & Méthodes */}
      {activeTab === "programme" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {formation.contenuProgramme && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-gray-400" />
                  Contenu du programme
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-300 whitespace-pre-wrap">{formation.contenuProgramme}</p>
              </CardContent>
            </Card>
          )}

          {formation.methodesPedagogiques && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Méthodes pédagogiques</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-300 whitespace-pre-wrap">{formation.methodesPedagogiques}</p>
              </CardContent>
            </Card>
          )}

          {formation.methodesEvaluation && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Méthodes d'évaluation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-300 whitespace-pre-wrap">{formation.methodesEvaluation}</p>
              </CardContent>
            </Card>
          )}

          {formation.moyensTechniques && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-gray-400" />
                  Moyens techniques
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-300 whitespace-pre-wrap">{formation.moyensTechniques}</p>
              </CardContent>
            </Card>
          )}

          {!formation.contenuProgramme && !formation.methodesPedagogiques && !formation.methodesEvaluation && !formation.moyensTechniques && (
            <div className="lg:col-span-2 flex flex-col items-center justify-center py-16 text-center">
              <ClipboardList className="h-8 w-8 text-gray-300 mb-3" />
              <p className="text-sm text-gray-400">Aucun contenu pédagogique renseigné</p>
              <Link
                href={`/formations/${id}/modifier`}
                className="mt-3 text-sm text-red-600 hover:underline"
              >
                Ajouter le contenu
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Tab: Sessions */}
      {activeTab === "sessions" && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-sm overflow-hidden">
          {formation.sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Calendar className="h-8 w-8 text-gray-300 mb-3" />
              <p className="text-sm text-gray-400">Aucune session planifiée</p>
              <Link
                href="/sessions/nouveau"
                className="mt-3 text-sm text-red-600 hover:underline"
              >
                Planifier une session
              </Link>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Dates</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Lieu</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Formateur</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Inscrits</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Statut</th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-200">
                {formation.sessions.map((session) => {
                  const statutInfo = SESSION_STATUTS[session.statut];
                  return (
                    <tr key={session.id} className="hover:bg-gray-700 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        <Link href={`/sessions/${session.id}`} className="text-red-600 hover:underline">
                          {formatDate(session.dateDebut)} → {formatDate(session.dateFin)}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {session.lieu || <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {session.formateur ? (
                          <Link
                            href={`/formateurs/${session.formateur.id}`}
                            className="text-red-600 hover:underline"
                          >
                            {session.formateur.prenom} {session.formateur.nom}
                          </Link>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-sm text-gray-400">
                          <Users className="h-3.5 w-3.5 text-gray-400" />
                          {session._count.inscriptions}
                        </span>
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
          )}
        </div>
      )}

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Supprimer la formation"
        description={`Êtes-vous sûr de vouloir supprimer "${formation.titre}" ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
