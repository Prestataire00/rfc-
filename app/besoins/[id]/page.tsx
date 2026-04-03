"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trash2, FileText, FilePlus, Building2, User, Phone, Mail, MapPin, Hash, ExternalLink, FolderOpen, Clock, Send, Receipt, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
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
  entreprise: any;
  contact: { id: string; nom: string; prenom: string; email: string; telephone: string | null; poste: string | null } | null;
  formation: any;
  devis: any;
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-gray-400 shrink-0">{label}</span>
      <span className="text-gray-100 text-right">{value}</span>
    </div>
  );
}

type HistoriqueAction = {
  id: string;
  createdAt: string;
  action: string;
  label: string;
  detail: string | null;
  lien: string | null;
};

function formatRelative(dateStr: string): string {
  const date = new Date(dateStr);
  const diffDays = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return "Hier";
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaine${Math.floor(diffDays / 7) > 1 ? "s" : ""}`;
  return `Il y a ${Math.floor(diffDays / 30)} mois`;
}

function actionIcon(action: string) {
  if (action.startsWith("devis")) return FileText;
  if (action.startsWith("facture")) return Receipt;
  if (action === "inscription_creee") return UserPlus;
  if (action.includes("envoye") || action.includes("convocation")) return Send;
  return Clock;
}

function actionColor(action: string): string {
  if (action.startsWith("devis")) return "bg-blue-900/30 text-blue-400 border-blue-700";
  if (action.startsWith("facture")) return "bg-orange-900/30 text-orange-400 border-orange-700";
  if (action === "inscription_creee") return "bg-violet-900/30 text-violet-400 border-violet-700";
  if (action.includes("envoye") || action.includes("convocation")) return "bg-green-900/30 text-green-400 border-green-700";
  return "bg-gray-700 text-gray-400 border-gray-600";
}

export default function BesoinDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const [besoin, setBesoin] = useState<Besoin | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const [historique, setHistorique] = useState<HistoriqueAction[]>([]);

  useEffect(() => {
    fetch(`/api/besoins/${id}`).then((r) => r.ok ? r.json() : null).then((d) => {
      setBesoin(d);
      setLoading(false);
      if (d?.entrepriseId) {
        fetch(`/api/entreprises/${d.entrepriseId}/historique`)
          .then((r) => r.ok ? r.json() : [])
          .then(setHistorique);
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

  return (
    <div>
      <Link href="/besoins" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-300 mb-4">
        <ArrowLeft className="h-4 w-4" /> Retour aux besoins
      </Link>

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

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          {besoin.description && (
            <div className="rounded-lg border bg-gray-800 p-6">
              <h3 className="font-semibold text-gray-100 mb-2">Description</h3>
              <p className="text-sm text-gray-400 whitespace-pre-wrap">{besoin.description}</p>
            </div>
          )}

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
              {besoin.entreprise.secteur && (
                <p className="text-gray-400 text-xs">{besoin.entreprise.secteur}</p>
              )}
              <div className="space-y-1.5 pt-1">
                {(besoin.entreprise.adresse || besoin.entreprise.ville) && (
                  <div className="flex items-start gap-2 text-gray-400">
                    <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span className="text-xs">
                      {[besoin.entreprise.adresse, besoin.entreprise.codePostal, besoin.entreprise.ville].filter(Boolean).join(", ")}
                    </span>
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
                  <h3 className="font-semibold text-gray-100">
                    {besoin.origine === "stagiaire" ? "Stagiaire" : "Contact"}
                  </h3>
                </div>
                <Link href={`/contacts/${besoin.contact.id}`} className="text-xs text-red-500 hover:text-red-400 flex items-center gap-1">
                  Voir <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
              <p className="font-semibold text-gray-100">{besoin.contact.prenom} {besoin.contact.nom}</p>
              {besoin.contact.poste && (
                <p className="text-gray-400 text-xs">{besoin.contact.poste}</p>
              )}
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
              {besoin.devis.objet && (
                <p className="text-gray-400 text-xs truncate">{besoin.devis.objet}</p>
              )}
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
                const DEVIS_STATUTS_LABELS: Record<string, string> = {
                  brouillon: "Brouillon", envoye: "Envoyé", accepte: "Accepté",
                  signe: "Signé", refuse: "Refusé", expire: "Expiré",
                };
                const DEVIS_STATUTS_COLORS: Record<string, string> = {
                  brouillon: "bg-gray-700 text-gray-300",
                  envoye: "bg-blue-900/30 text-blue-400",
                  accepte: "bg-green-900/30 text-green-400",
                  signe: "bg-green-900/30 text-green-400",
                  refuse: "bg-red-900/30 text-red-400",
                  expire: "bg-orange-900/30 text-orange-400",
                };
                return (
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${DEVIS_STATUTS_COLORS[besoin.devis.statut] || "bg-gray-700 text-gray-400"}`}>
                    {DEVIS_STATUTS_LABELS[besoin.devis.statut] || besoin.devis.statut}
                  </span>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Historique */}
      {historique.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-100 flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" /> Historique d'activité
            </h3>
            {besoin?.entreprise?.id && (
              <Link
                href={`/entreprises/${besoin.entreprise.id}?tab=historique`}
                className="text-xs text-red-500 hover:text-red-400"
              >
                Voir tout →
              </Link>
            )}
          </div>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px border-l-2 border-dashed border-gray-700" />
            <div className="space-y-3 pl-10">
              {historique.slice(0, 10).map((h) => {
                const Icon = actionIcon(h.action);
                const colorClass = actionColor(h.action);
                return (
                  <div key={h.id} className="relative">
                    <div className={`absolute -left-6 h-6 w-6 rounded-full border flex items-center justify-center ${colorClass}`}>
                      <Icon className="h-3 w-3" />
                    </div>
                    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          {h.lien ? (
                            <Link href={h.lien} className="text-xs font-medium text-gray-200 hover:text-red-400">
                              {h.label}
                            </Link>
                          ) : (
                            <p className="text-xs font-medium text-gray-200">{h.label}</p>
                          )}
                          {h.detail && <p className="text-xs text-gray-500 mt-0.5">{h.detail}</p>}
                        </div>
                        <span
                          className="text-xs text-gray-500 shrink-0 cursor-default"
                          title={new Date(h.createdAt).toLocaleString("fr-FR")}
                        >
                          {formatRelative(h.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
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
