"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  BookOpen, Clock, Euro, Tag, FileText, Target, Pencil, Trash2,
  Calendar, Users, Star, Monitor, Video, Shuffle, Award, RefreshCw,
  Accessibility, BarChart3, Wrench, ClipboardList, GraduationCap, Wallet,
  Download, UserPlus, FolderOpen, MessageSquare,
} from "lucide-react";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { StatutBadge } from "@/components/shared/StatutBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NIVEAUX_FORMATION, SESSION_STATUTS, MODALITES_FORMATION, STATUTS_FORMATION, TYPES_FINANCEMENT } from "@/lib/constants";
import { formatDate, formatCurrency, formatDuree } from "@/lib/utils";
import { useApi, useApiMutation } from "@/hooks/useApi";

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

const modaliteIcons: Record<string, React.ReactNode> = {
  presentiel: <Monitor className="h-4 w-4" />,
  distanciel: <Video className="h-4 w-4" />,
  mixte: <Shuffle className="h-4 w-4" />,
};

type TabKey = "description" | "sessions" | "documents" | "evaluations" | "programme" | "espace-apprenant" | "approches";

export default function FormationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [activeTab, setActiveTab] = useState<TabKey>("description");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: formation, error, isLoading: loading } = useApi<Formation>(`/api/formations/${id}`);
  const { trigger: deleteFormation, isMutating: deleting } = useApiMutation(`/api/formations/${id}`, "DELETE");

  const handleDelete = async () => {
    try {
      await deleteFormation();
      router.push("/formations");
    } catch {
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
        <p className="text-red-600">{error?.message || "Formation introuvable"}</p>
        <Link href="/formations" className="text-red-600 hover:underline text-sm mt-2 inline-block">
          Retour aux formations
        </Link>
      </div>
    );
  }

  const niveauLabel = NIVEAUX_FORMATION.find((n) => n.value === formation.niveau)?.label ?? formation.niveau;
  const modaliteInfo = MODALITES_FORMATION[formation.modalite as keyof typeof MODALITES_FORMATION];
  const statutInfo = STATUTS_FORMATION[formation.statut as keyof typeof STATUTS_FORMATION];

  let financements: string[] = [];
  try { financements = JSON.parse(formation.typesFinancement); } catch { financements = []; }

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: "description", label: "Description", icon: <FileText className="h-4 w-4" /> },
    { key: "sessions", label: "Sessions", icon: <Calendar className="h-4 w-4" /> },
    { key: "documents", label: "Documents", icon: <FolderOpen className="h-4 w-4" /> },
    { key: "evaluations", label: "Evaluations", icon: <MessageSquare className="h-4 w-4" /> },
    { key: "programme", label: "Le programme", icon: <ClipboardList className="h-4 w-4" /> },
    { key: "espace-apprenant", label: "Espace Apprenant", icon: <GraduationCap className="h-4 w-4" /> },
    { key: "approches", label: "Approches", icon: <Target className="h-4 w-4" /> },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Breadcrumb items={[
          { label: "Formations", href: "/formations" },
          { label: formation.titre },
        ]} />

        <div className="flex items-start justify-between mt-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-xl bg-red-900/30 flex items-center justify-center">
              <BookOpen className="h-7 w-7 text-red-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                {formation.misEnAvant && <Star className="h-4 w-4 text-amber-400 fill-amber-400" />}
                <h1 className="text-2xl font-bold text-gray-100">{formation.titre}</h1>
              </div>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {statutInfo && <StatutBadge label={statutInfo.label} color={statutInfo.color} />}
                {modaliteInfo && (
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${modaliteInfo.color}`}>
                    {modaliteIcons[formation.modalite]}
                    {modaliteInfo.label}
                  </span>
                )}
                {formation.certifiante && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-900/30 text-amber-400 border border-amber-700 px-2.5 py-0.5 text-xs font-medium">
                    <Award className="h-3 w-3" /> Certifiante
                  </span>
                )}
                {!formation.actif && (
                  <span className="inline-flex items-center rounded-full border bg-gray-700 text-gray-400 border-gray-600 px-2.5 py-0.5 text-xs font-medium">Inactive</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2 border-gray-600 text-gray-300 hover:bg-gray-700">
              <Download className="h-4 w-4" /> Telecharger le programme
            </Button>
            <Link
              href={`/formations/${id}/modifier`}
              className="inline-flex items-center gap-2 rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors"
            >
              <Pencil className="h-4 w-4" /> Modifier
            </Link>
            <Button variant="default" size="sm" className="gap-2 bg-red-600 hover:bg-red-700">
              <UserPlus className="h-4 w-4" /> Inscription
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-700 mb-6">
        <nav className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 pb-3 pt-1 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? "border-red-600 text-red-500"
                  : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ============== TAB: Description ============== */}
      {activeTab === "description" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonne gauche - Information generale */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Information generale</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {formation.categorie && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400 flex items-center gap-2"><Tag className="h-3.5 w-3.5" /> Categorie</span>
                    <span className="text-sm font-medium text-gray-200">{formation.categorie}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400 flex items-center gap-2"><BarChart3 className="h-3.5 w-3.5" /> Niveau</span>
                  <span className="text-sm font-medium text-gray-200">{niveauLabel}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400 flex items-center gap-2"><Clock className="h-3.5 w-3.5" /> Duree</span>
                  <span className="text-sm font-medium text-gray-200">{formatDuree(formation.duree)} ({formation.duree}h)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400 flex items-center gap-2"><Euro className="h-3.5 w-3.5" /> Tarif</span>
                  <span className="text-sm font-medium text-gray-200">{formatCurrency(formation.tarif)}</span>
                </div>
                {formation.certifiante && formation.codeRNCP && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400 flex items-center gap-2"><Award className="h-3.5 w-3.5" /> Code RNCP</span>
                    <span className="text-sm font-medium text-gray-200">{formation.codeRNCP}</span>
                  </div>
                )}
                {formation.certifiante && formation.dureeRecyclage && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400 flex items-center gap-2"><RefreshCw className="h-3.5 w-3.5" /> Recyclage</span>
                    <span className="text-sm font-medium text-gray-200">{formation.dureeRecyclage} mois</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400 flex items-center gap-2"><Calendar className="h-3.5 w-3.5" /> Creee le</span>
                  <span className="text-sm font-medium text-gray-200">{formatDate(formation.createdAt)}</span>
                </div>

                {/* Financements */}
                {financements.length > 0 && (
                  <div className="pt-3 border-t border-gray-700">
                    <p className="text-sm text-gray-400 mb-2 flex items-center gap-2"><Wallet className="h-3.5 w-3.5" /> Financements</p>
                    <div className="flex flex-wrap gap-1.5">
                      {financements.map((f: string) => {
                        const label = TYPES_FINANCEMENT.find((t) => t.value === f)?.label ?? f;
                        return (
                          <span key={f} className="inline-flex items-center rounded-full bg-gray-700 text-gray-300 border border-gray-600 px-2 py-0.5 text-[11px] font-medium">
                            {label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Public cible */}
            {formation.publicCible && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-gray-400" /> Public cible
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-300 whitespace-pre-wrap">{formation.publicCible}</p>
                </CardContent>
              </Card>
            )}

            {/* Prerequis */}
            {formation.prerequis && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Prerequis</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-300 whitespace-pre-wrap">{formation.prerequis}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Colonne droite - Contenu pedagogique */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-gray-400" /> Contenu pedagogique
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {formation.description && (
                  <div>
                    <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{formation.description}</p>
                  </div>
                )}
                {formation.objectifs && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-200 mb-2 flex items-center gap-2">
                      <Target className="h-4 w-4 text-red-500" /> Objectifs pedagogiques
                    </h4>
                    <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{formation.objectifs}</p>
                  </div>
                )}
                {!formation.description && !formation.objectifs && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FileText className="h-8 w-8 text-gray-600 mb-3" />
                    <p className="text-sm text-gray-400">Aucun contenu pedagogique renseigne</p>
                    <Link href={`/formations/${id}/modifier`} className="mt-3 text-sm text-red-500 hover:underline">
                      Ajouter le contenu
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Accessibilite */}
            {formation.accessibilite && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Accessibility className="h-4 w-4 text-gray-400" /> Accessibilite
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-300 whitespace-pre-wrap">{formation.accessibilite}</p>
                </CardContent>
              </Card>
            )}

            {/* Indicateurs de resultats */}
            {formation.indicateursResultats && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-gray-400" /> Indicateurs de resultats
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-300 whitespace-pre-wrap">{formation.indicateursResultats}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ============== TAB: Sessions ============== */}
      {activeTab === "sessions" && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-sm overflow-hidden">
          {formation.sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Calendar className="h-8 w-8 text-gray-600 mb-3" />
              <p className="text-sm text-gray-400">Aucune session planifiee</p>
              <Link href="/sessions/nouveau" className="mt-3 text-sm text-red-500 hover:underline">
                Planifier une session
              </Link>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Dates</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Lieu</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Formateur</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Inscrits</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Statut</th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {formation.sessions.map((session) => {
                  const sInfo = SESSION_STATUTS[session.statut];
                  return (
                    <tr key={session.id} className="hover:bg-gray-750 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        <Link href={`/sessions/${session.id}`} className="text-red-500 hover:underline">
                          {formatDate(session.dateDebut)} → {formatDate(session.dateFin)}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {session.lieu || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {session.formateur ? (
                          <Link href={`/formateurs/${session.formateur.id}`} className="text-red-500 hover:underline">
                            {session.formateur.prenom} {session.formateur.nom}
                          </Link>
                        ) : "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-sm text-gray-400">
                          <Users className="h-3.5 w-3.5" /> {session._count.inscriptions}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {sInfo && <StatutBadge label={sInfo.label} color={sInfo.color} />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ============== TAB: Documents ============== */}
      {activeTab === "documents" && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FolderOpen className="h-10 w-10 text-gray-600 mb-3" />
          <h3 className="text-base font-medium text-gray-300 mb-1">Documents de la formation</h3>
          <p className="text-sm text-gray-400">Aucun document associe a cette formation pour le moment.</p>
        </div>
      )}

      {/* ============== TAB: Evaluations ============== */}
      {activeTab === "evaluations" && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <MessageSquare className="h-10 w-10 text-gray-600 mb-3" />
          <h3 className="text-base font-medium text-gray-300 mb-1">Evaluations</h3>
          <p className="text-sm text-gray-400">Aucune evaluation associee a cette formation pour le moment.</p>
        </div>
      )}

      {/* ============== TAB: Le programme ============== */}
      {activeTab === "programme" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {formation.contenuProgramme ? (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-gray-400" /> Contenu du programme
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{formation.contenuProgramme}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="lg:col-span-2 flex flex-col items-center justify-center py-16 text-center">
              <ClipboardList className="h-10 w-10 text-gray-600 mb-3" />
              <h3 className="text-base font-medium text-gray-300 mb-1">Programme de la formation</h3>
              <p className="text-sm text-gray-400">Le programme n&apos;a pas encore ete renseigne.</p>
              <Link href={`/formations/${id}/modifier`} className="mt-3 text-sm text-red-500 hover:underline">
                Ajouter le programme
              </Link>
            </div>
          )}

          {formation.methodesPedagogiques && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Methodes pedagogiques</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-300 whitespace-pre-wrap">{formation.methodesPedagogiques}</p>
              </CardContent>
            </Card>
          )}

          {formation.methodesEvaluation && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Methodes d&apos;evaluation</CardTitle>
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
                  <Wrench className="h-4 w-4 text-gray-400" /> Moyens techniques
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-300 whitespace-pre-wrap">{formation.moyensTechniques}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ============== TAB: Espace Apprenant ============== */}
      {activeTab === "espace-apprenant" && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <GraduationCap className="h-10 w-10 text-gray-600 mb-3" />
          <h3 className="text-base font-medium text-gray-300 mb-1">Espace Apprenant</h3>
          <p className="text-sm text-gray-400">Configuration de l&apos;espace apprenant pour cette formation.</p>
        </div>
      )}

      {/* ============== TAB: Approches ============== */}
      {activeTab === "approches" && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Target className="h-10 w-10 text-gray-600 mb-3" />
          <h3 className="text-base font-medium text-gray-300 mb-1">Approches pedagogiques</h3>
          <p className="text-sm text-gray-400">Les approches pedagogiques de cette formation.</p>
        </div>
      )}

      {/* Actions de suppression */}
      <div className="mt-8 pt-6 border-t border-gray-700 flex justify-end">
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setDeleteOpen(true)}
          className="inline-flex items-center gap-2"
        >
          <Trash2 className="h-4 w-4" /> Supprimer la formation
        </Button>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Supprimer la formation"
        description={`Etes-vous sur de vouloir supprimer "${formation.titre}" ? Cette action est irreversible.`}
        confirmLabel="Supprimer"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
