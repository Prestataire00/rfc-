"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Trash2, FileText, FilePlus, Building2, User, Phone, Mail,
  MapPin, Hash, ExternalLink, FolderOpen, Clock, Send, Receipt, UserPlus,
  Calendar, CheckCircle2, XCircle, AlertCircle,
} from "lucide-react";
import { StatutBadge } from "@/components/shared/StatutBadge";
import { BESOIN_STATUTS, BESOIN_PRIORITES, BESOIN_ORIGINES } from "@/lib/constants";
import { formatDate, formatCurrency } from "@/lib/utils";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

type Besoin = {
  id: string;
  titre: string;
  description: string | null;
  origine: string;
  statut: string;
  priorite: string;
  nbStagiaires: number | null;
  datesSouhaitees: string | null;
  budget: number | null;
  notes: string | null;
  createdAt: string;
  entreprise: {
    id: string;
    nom: string;
    secteur: string | null;
    adresse: string | null;
    codePostal: string | null;
    ville: string | null;
    telephone: string | null;
    email: string | null;
    siret: string | null;
  } | null;
  contact: { id: string; nom: string; prenom: string; email: string; telephone: string | null; poste: string | null } | null;
  formation: { id: string; titre: string } | null;
  devis: { id: string; numero: string; objet: string | null; montantHT: number; montantTTC: number; statut: string } | null;
};

type HistoriqueAction = {
  id: string;
  createdAt: string;
  action: string;
  label: string;
  detail: string | null;
  lien: string | null;
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-gray-400 shrink-0">{label}</span>
      <span className="text-gray-100 text-right">{value}</span>
    </div>
  );
}

function formatRelative(dateStr: string): string {
  const diffDays = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return "Hier";
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaine${Math.floor(diffDays / 7) > 1 ? "s" : ""}`;
  if (diffDays < 365) return `Il y a ${Math.floor(diffDays / 30)} mois`;
  return `Il y a ${Math.floor(diffDays / 365)} an${Math.floor(diffDays / 365) > 1 ? "s" : ""}`;
}

function actionIcon(action: string) {
  if (action.startsWith("devis_cree")) return FileText;
  if (action.startsWith("devis_envoye")) return Send;
  if (action.startsWith("devis_statut")) return CheckCircle2;
  if (action.startsWith("facture")) return Receipt;
  if (action === "inscription_creee") return UserPlus;
  if (action === "convocation_envoyee") return Send;
  return Clock;
}

function actionColor(action: string) {
  if (action.startsWith("devis")) return { bg: "bg-blue-900/30", text: "text-blue-400", border: "border-blue-700", dot: "bg-blue-500" };
  if (action.startsWith("facture")) return { bg: "bg-orange-900/30", text: "text-orange-400", border: "border-orange-700", dot: "bg-orange-500" };
  if (action === "inscription_creee") return { bg: "bg-violet-900/30", text: "text-violet-400", border: "border-violet-700", dot: "bg-violet-500" };
  if (action === "convocation_envoyee") return { bg: "bg-green-900/30", text: "text-green-400", border: "border-green-700", dot: "bg-green-500" };
  return { bg: "bg-gray-800", text: "text-gray-400", border: "border-gray-700", dot: "bg-gray-500" };
}

function actionLabel(action: string): string {
  const map: Record<string, string> = {
    devis_cree: "Devis créé",
    devis_envoye: "Devis envoyé",
    devis_statut: "Statut devis modifié",
    facture_generee: "Facture générée",
    facture_payee: "Facture payée",
    facture_en_attente: "Facture en attente",
    facture_envoyee: "Facture envoyée",
    inscription_creee: "Inscription créée",
    convocation_envoyee: "Convocation envoyée",
  };
  return map[action] || action;
}

type TabKey = "detail" | "historique";

export default function BesoinDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const [besoin, setBesoin] = useState<Besoin | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const [historique, setHistorique] = useState<HistoriqueAction[]>([]);
  const [historiqueLoading, setHistoriqueLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("detail");

  useEffect(() => {
    fetch(`/api/besoins/${id}`).then((r) => r.ok ? r.json() : null).then((d) => {
      setBesoin(d);
      setLoading(false);
      const params = new URLSearchParams();
      if (d?.entreprise?.id) params.append("entrepriseId", d.entreprise.id);
      if (d?.contact?.id) params.append("contactId", d.contact.id);
      if (params.toString()) {
        setHistoriqueLoading(true);
        fetch(`/api/historique?${params}`)
          .then((r) => r.ok ? r.json() : [])
          .then((data) => { setHistorique(data); setHistoriqueLoading(false); });
      }
    });
  }, [id]);

  async function updateStatut(statut: string) {
    if (!besoin) return;
    await fetch(`/api/besoins/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...besoin, statut }),
    });
    setBesoin({ ...besoin, statut });
  }

  async function handleDelete() {
    await fetch(`/api/besoins/${id}`, { method: "DELETE" });
    router.push("/besoins");
  }

  if (loading) {
    return <div className="flex justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" /></div>;
  }

  if (!besoin) return <p>Besoin non trouvé</p>;

  const st = BESOIN_STATUTS[besoin.statut as keyof typeof BESOIN_STATUTS];
  const prio = BESOIN_PRIORITES[besoin.priorite as keyof typeof BESOIN_PRIORITES];

  // Stats historique
  const nbDevis = historique.filter((h) => h.action === "devis_cree").length;
  const nbEnvois = historique.filter((h) => h.action === "devis_envoye").length;
  const nbFactures = historique.filter((h) => h.action === "facture_generee").length;
  const nbInscriptions = historique.filter((h) => h.action === "inscription_creee").length;
  const derniereAction = historique[0];

  return (
    <div>
      <Link href="/besoins" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-300 mb-4">
        <ArrowLeft className="h-4 w-4" /> Retour aux besoins
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">{besoin.titre}</h1>
          <div className="flex items-center gap-3 mt-2">
            {st && <StatutBadge label={st.label} color={st.color} />}
            <span className={`text-sm font-medium ${prio?.color}`}>{prio?.label}</span>
            <span className="text-sm text-gray-400">Créé le {formatDate(besoin.createdAt)}</span>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {besoin.entreprise && (
            <Link
              href={`/entreprises/${besoin.entreprise.id}`}
              className="inline-flex items-center gap-2 rounded-md bg-gray-700 border border-gray-600 px-3 py-2 text-sm font-medium text-gray-100 hover:bg-gray-600 transition-colors"
            >
              <Building2 className="h-4 w-4 text-gray-400" />
              Compte client
              <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
            </Link>
          )}
          {besoin.entreprise && (
            <Link
              href={`/entreprises/${besoin.entreprise.id}?tab=devis`}
              className="inline-flex items-center gap-2 rounded-md bg-gray-700 border border-gray-600 px-3 py-2 text-sm font-medium text-gray-100 hover:bg-gray-600 transition-colors"
            >
              <FolderOpen className="h-4 w-4 text-gray-400" />
              Documents
              <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
            </Link>
          )}
          {!besoin.devis && (besoin.statut === "nouveau" || besoin.statut === "qualifie") && (
            <Link
              href={`/commercial/devis/nouveau?besoinId=${besoin.id}`}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              <FilePlus className="h-4 w-4" /> Générer un devis
            </Link>
          )}
          <button onClick={() => setShowDelete(true)} className="rounded-md border border-red-700 px-3 py-2 text-sm text-red-600 hover:bg-red-900/20">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-700 mb-6">
        <nav className="flex gap-6">
          {[
            { key: "detail" as TabKey, label: "Détail" },
            { key: "historique" as TabKey, label: `Historique${historique.length > 0 ? ` (${historique.length})` : ""}` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
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

      {/* Tab: Détail */}
      {activeTab === "detail" && (
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            <div className="rounded-lg border border-red-700/30 bg-gray-800 p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-100 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-red-500" /> Descriptif de la demande
                </h3>
                <Link href={`/besoins/${besoin.id}/modifier`} className="text-xs text-red-500 hover:underline">Modifier</Link>
              </div>
              {besoin.description ? (
                <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{besoin.description}</p>
              ) : (
                <p className="text-sm text-gray-500 italic">Aucun descriptif renseigne. <Link href={`/besoins/${besoin.id}/modifier`} className="text-red-500 hover:underline">Ajouter</Link></p>
              )}
            </div>

            <div className="rounded-lg border bg-gray-800 p-6">
              <h3 className="font-semibold text-gray-100 mb-4">Avancement</h3>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(BESOIN_STATUTS).map(([key, val]) => (
                  <button
                    key={key}
                    onClick={() => updateStatut(key)}
                    className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                      besoin.statut === key ? val.color + " ring-2 ring-offset-1 ring-red-400" : "bg-gray-900 text-gray-400 border-gray-700 hover:bg-gray-700"
                    }`}
                  >
                    {val.label}
                  </button>
                ))}
              </div>
            </div>

            {besoin.notes && (
              <div className="rounded-lg border bg-gray-800 p-6">
                <h3 className="font-semibold text-gray-100 mb-2">Notes</h3>
                <p className="text-sm text-gray-400 whitespace-pre-wrap">{besoin.notes}</p>
              </div>
            )}

            {/* Mini historique dans l'onglet détail */}
            {historique.length > 0 && (
              <div className="rounded-lg border bg-gray-800 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-100 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" /> Activité récente
                  </h3>
                  <button
                    onClick={() => setActiveTab("historique")}
                    className="text-xs text-red-500 hover:text-red-400"
                  >
                    Voir tout ({historique.length}) →
                  </button>
                </div>
                <div className="space-y-2">
                  {historique.slice(0, 4).map((h) => {
                    const Icon = actionIcon(h.action);
                    const c = actionColor(h.action);
                    return (
                      <div key={h.id} className="flex items-start gap-3">
                        <div className={`mt-0.5 h-6 w-6 rounded-full border flex items-center justify-center shrink-0 ${c.bg} ${c.border}`}>
                          <Icon className={`h-3 w-3 ${c.text}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          {h.lien ? (
                            <Link href={h.lien} className="text-sm text-gray-200 hover:text-red-400 font-medium">{h.label}</Link>
                          ) : (
                            <p className="text-sm text-gray-200 font-medium">{h.label}</p>
                          )}
                          {h.detail && <p className="text-xs text-gray-500">{h.detail}</p>}
                        </div>
                        <span className="text-xs text-gray-500 shrink-0">{formatRelative(h.createdAt)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {/* Infos synthèse */}
            <div className="rounded-lg border bg-gray-800 p-4 space-y-2 text-sm">
              <h3 className="font-semibold text-gray-100 mb-3">Informations</h3>
              <InfoRow label="Origine" value={BESOIN_ORIGINES[besoin.origine as keyof typeof BESOIN_ORIGINES]?.label || besoin.origine} />
              {besoin.nbStagiaires && <InfoRow label="Stagiaires" value={String(besoin.nbStagiaires)} />}
              {besoin.budget && <InfoRow label="Budget" value={formatCurrency(besoin.budget)} />}
              {besoin.datesSouhaitees && <InfoRow label="Dates souhaitées" value={besoin.datesSouhaitees} />}
              {besoin.formation && (
                <div className="flex items-start gap-2 pt-1">
                  <span className="text-gray-400 shrink-0">Formation</span>
                  <Link href={`/formations/${besoin.formation.id}`} className="text-red-500 hover:underline font-medium text-right flex-1">
                    {besoin.formation.titre}
                  </Link>
                </div>
              )}
            </div>

            {/* Entreprise */}
            {besoin.entreprise && (
              <div className="rounded-lg border bg-gray-800 p-4 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    <h3 className="font-semibold text-gray-100">Entreprise</h3>
                  </div>
                  <Link href={`/entreprises/${besoin.entreprise.id}`} className="text-xs text-red-500 hover:text-red-400 flex items-center gap-1">
                    Voir <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
                <p className="font-semibold text-gray-100">{besoin.entreprise.nom}</p>
                {besoin.entreprise.secteur && <p className="text-gray-400 text-xs">{besoin.entreprise.secteur}</p>}
                <div className="space-y-1.5 pt-1">
                  {(besoin.entreprise.adresse || besoin.entreprise.ville) && (
                    <div className="flex items-start gap-2 text-gray-400">
                      <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span className="text-xs">{[besoin.entreprise.adresse, besoin.entreprise.codePostal, besoin.entreprise.ville].filter(Boolean).join(", ")}</span>
                    </div>
                  )}
                  {besoin.entreprise.telephone && (
                    <div className="flex items-center gap-2 text-gray-400">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      <a href={`tel:${besoin.entreprise.telephone}`} className="text-xs hover:text-gray-200">{besoin.entreprise.telephone}</a>
                    </div>
                  )}
                  {besoin.entreprise.email && (
                    <div className="flex items-center gap-2 text-gray-400">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <a href={`mailto:${besoin.entreprise.email}`} className="text-xs hover:text-gray-200 truncate">{besoin.entreprise.email}</a>
                    </div>
                  )}
                  {besoin.entreprise.siret && (
                    <div className="flex items-center gap-2 text-gray-400">
                      <Hash className="h-3.5 w-3.5 shrink-0" />
                      <span className="text-xs font-mono">{besoin.entreprise.siret}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Contact */}
            {besoin.contact && (
              <div className="rounded-lg border bg-gray-800 p-4 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <h3 className="font-semibold text-gray-100">{besoin.origine === "stagiaire" ? "Stagiaire" : "Contact"}</h3>
                  </div>
                  <Link href={`/contacts/${besoin.contact.id}`} className="text-xs text-red-500 hover:text-red-400 flex items-center gap-1">
                    Voir <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
                <p className="font-semibold text-gray-100">{besoin.contact.prenom} {besoin.contact.nom}</p>
                {besoin.contact.poste && <p className="text-gray-400 text-xs">{besoin.contact.poste}</p>}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <a href={`mailto:${besoin.contact.email}`} className="text-xs hover:text-gray-200 truncate">{besoin.contact.email}</a>
                  </div>
                  {besoin.contact.telephone && (
                    <div className="flex items-center gap-2 text-gray-400">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      <a href={`tel:${besoin.contact.telephone}`} className="text-xs hover:text-gray-200">{besoin.contact.telephone}</a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Devis associé */}
            {besoin.devis && (
              <div className="rounded-lg border bg-gray-800 p-4 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <h3 className="font-semibold text-gray-100">Devis associé</h3>
                  </div>
                  <Link href={`/commercial/devis/${besoin.devis.id}`} className="text-xs text-red-500 hover:text-red-400 flex items-center gap-1">
                    Ouvrir <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
                <p className="font-mono font-medium text-gray-100">{besoin.devis.numero}</p>
                {besoin.devis.objet && <p className="text-gray-400 text-xs truncate">{besoin.devis.objet}</p>}
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <p className="text-xs text-gray-400">Montant HT</p>
                    <p className="font-semibold text-gray-100">{formatCurrency(besoin.devis.montantHT)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">TTC</p>
                    <p className="font-semibold text-gray-100">{formatCurrency(besoin.devis.montantTTC)}</p>
                  </div>
                </div>
                {besoin.devis.statut && (() => {
                  const LABELS: Record<string, string> = { brouillon: "Brouillon", envoye: "Envoyé", accepte: "Accepté", signe: "Signé", refuse: "Refusé", expire: "Expiré" };
                  const COLORS: Record<string, string> = { brouillon: "bg-gray-700 text-gray-300", envoye: "bg-blue-900/30 text-blue-400", accepte: "bg-green-900/30 text-green-400", signe: "bg-green-900/30 text-green-400", refuse: "bg-red-900/30 text-red-400", expire: "bg-orange-900/30 text-orange-400" };
                  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${COLORS[besoin.devis.statut] || "bg-gray-700 text-gray-400"}`}>{LABELS[besoin.devis.statut] || besoin.devis.statut}</span>;
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Historique */}
      {activeTab === "historique" && (
        <div>
          {/* En-tête client */}
          {(besoin.entreprise || besoin.contact) && (
            <div className="rounded-lg border bg-gray-800 p-4 mb-6 flex items-center gap-4 flex-wrap">
              {besoin.entreprise && (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-red-900/30 flex items-center justify-center shrink-0">
                    <Building2 className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-100">{besoin.entreprise.nom}</p>
                    {besoin.entreprise.email && <p className="text-xs text-gray-400">{besoin.entreprise.email}</p>}
                  </div>
                </div>
              )}
              {besoin.entreprise && besoin.contact && <div className="h-8 w-px bg-gray-700" />}
              {besoin.contact && (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-900/30 flex items-center justify-center shrink-0">
                    <User className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-100">{besoin.contact.prenom} {besoin.contact.nom}</p>
                    <p className="text-xs text-gray-400">{besoin.contact.email}</p>
                  </div>
                </div>
              )}
              <div className="ml-auto flex gap-3">
                {besoin.entreprise && (
                  <Link href={`/entreprises/${besoin.entreprise.id}?tab=historique`} className="text-xs text-red-500 hover:text-red-400 flex items-center gap-1">
                    Historique complet <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Stats */}
          {historique.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="rounded-lg border border-blue-700 bg-blue-900/20 p-3 text-center">
                <div className="text-xl font-bold text-blue-400">{nbDevis}</div>
                <div className="text-xs text-gray-400 mt-0.5">Devis créé{nbDevis > 1 ? "s" : ""}</div>
              </div>
              <div className="rounded-lg border border-green-700 bg-green-900/20 p-3 text-center">
                <div className="text-xl font-bold text-green-400">{nbEnvois}</div>
                <div className="text-xs text-gray-400 mt-0.5">Email{nbEnvois > 1 ? "s" : ""} envoyé{nbEnvois > 1 ? "s" : ""}</div>
              </div>
              <div className="rounded-lg border border-orange-700 bg-orange-900/20 p-3 text-center">
                <div className="text-xl font-bold text-orange-400">{nbFactures}</div>
                <div className="text-xs text-gray-400 mt-0.5">Facture{nbFactures > 1 ? "s" : ""}</div>
              </div>
              <div className="rounded-lg border border-violet-700 bg-violet-900/20 p-3 text-center">
                <div className="text-xl font-bold text-violet-400">{nbInscriptions}</div>
                <div className="text-xs text-gray-400 mt-0.5">Inscription{nbInscriptions > 1 ? "s" : ""}</div>
              </div>
            </div>
          )}

          {/* Dernière activité */}
          {derniereAction && (
            <div className="rounded-lg border border-gray-600 bg-gray-800/50 px-4 py-3 mb-6 flex items-center gap-3">
              <AlertCircle className="h-4 w-4 text-yellow-500 shrink-0" />
              <p className="text-sm text-gray-300">
                Dernière activité : <span className="font-medium text-gray-100">{derniereAction.label}</span>
                <span className="text-gray-500 ml-2">— {formatRelative(derniereAction.createdAt)}</span>
              </p>
            </div>
          )}

          {/* Timeline */}
          {historiqueLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
            </div>
          ) : historique.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Clock className="h-8 w-8 text-gray-500 mb-3" />
              <p className="text-sm text-gray-400">Aucune activité enregistrée pour ce client</p>
              <p className="text-xs text-gray-500 mt-1">Les actions (devis, emails, inscriptions…) apparaîtront ici</p>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-5 top-0 bottom-0 w-px border-l-2 border-dashed border-gray-700" />
              <div className="space-y-4 pl-14">
                {historique.map((h) => {
                  const Icon = actionIcon(h.action);
                  const c = actionColor(h.action);
                  return (
                    <div key={h.id} className="relative">
                      <div className={`absolute -left-9 h-8 w-8 rounded-full border flex items-center justify-center ${c.bg} ${c.border}`}>
                        <Icon className={`h-3.5 w-3.5 ${c.text}`} />
                      </div>
                      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${c.bg} ${c.text} ${c.border}`}>
                                {actionLabel(h.action)}
                              </span>
                            </div>
                            {h.lien ? (
                              <Link href={h.lien} className="font-medium text-gray-100 hover:text-red-400 text-sm mt-1 block">
                                {h.label}
                              </Link>
                            ) : (
                              <p className="font-medium text-gray-100 text-sm mt-1">{h.label}</p>
                            )}
                            {h.detail && <p className="text-xs text-gray-400 mt-1">{h.detail}</p>}
                          </div>
                          <div className="shrink-0 text-right">
                            <span
                              className="text-xs text-gray-400 cursor-default"
                              title={new Date(h.createdAt).toLocaleString("fr-FR")}
                            >
                              {formatRelative(h.createdAt)}
                            </span>
                            <p className="text-xs text-gray-500 mt-0.5">{formatDate(h.createdAt)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={showDelete}
        title="Supprimer ce besoin ?"
        description="Cette action est irréversible."
        onConfirm={handleDelete}
        onOpenChange={setShowDelete}
      />
    </div>
  );
}
