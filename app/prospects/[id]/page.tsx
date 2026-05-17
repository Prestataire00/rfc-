"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  Building2,
  FileText,
  Receipt,
  CalendarDays,
  ClipboardList,
  Users,
  Clock,
  ExternalLink,
  MapPin,
  Phone,
  Mail,
  Hash,
  CheckCircle2,
  Send,
  UserPlus,
  AlertCircle,
  BadgeAlert,
} from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { StatutBadge } from "@/components/shared/StatutBadge";
import { BESOIN_STATUTS, BESOIN_STATUTS_PIPELINE, BESOIN_ORIGINES } from "@/lib/constants";
import { formatDate, formatCurrency } from "@/lib/utils";
import { notify } from "@/lib/toast";

// ————————————————————————
// Types
// ————————————————————————
type ProspectData = {
  demande: {
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
    sourceContact: string | null;
    createdAt: string;
    devisId: string | null;
  };
  contact: {
    id: string;
    nom: string;
    prenom: string;
    email: string;
    telephone: string | null;
    poste: string | null;
    type: string;
  } | null;
  entreprise: {
    id: string;
    nom: string;
    siret: string | null;
    adresse: string | null;
    codePostal: string | null;
    ville: string | null;
    secteur: string | null;
    effectif: number | null;
    telephone: string | null;
    email: string | null;
  } | null;
  formation: { id: string; titre: string } | null;
  devis: {
    id: string;
    numero: string;
    objet: string | null;
    montantHT: number;
    montantTTC: number;
    statut: string;
    dateEmission: string;
    dateValidite: string;
    notes: string | null;
    lignes: Array<{
      id: string;
      designation: string;
      quantite: number;
      prixUnitaire: number;
      montant: number;
    }>;
  } | null;
  session: {
    id: string;
    dateDebut: string;
    dateFin: string;
    lieu: string | null;
    statut: string;
    capaciteMax: number;
    notes: string | null;
    formateur: { id: string; prenom: string; nom: string } | null;
    lieuFormation: { id: string; nom: string } | null;
    formation: { id: string; titre: string } | null;
  } | null;
  ficheEntreprise: {
    id: string;
    statut: string;
    dateEnvoi: string | null;
    destinataireNom: string | null;
    destinataireEmail: string | null;
  } | null;
  fichesStagiaire: Array<{
    id: string;
    statut: string;
    dateEnvoi: string | null;
    contact: { id: string; nom: string; prenom: string };
  }>;
  inscriptions: Array<{
    id: string;
    statut: string;
    contact: { id: string; nom: string; prenom: string; email: string };
  }>;
  historique: Array<{
    id: string;
    createdAt: string;
    action: string;
    label: string;
    detail: string | null;
    lien: string | null;
  }>;
};

// ————————————————————————
// Helpers
// ————————————————————————
function formatRelative(dateStr: string): string {
  const diffDays = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return "Hier";
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaine${Math.floor(diffDays / 7) > 1 ? "s" : ""}`;
  return `Il y a ${Math.floor(diffDays / 30)} mois`;
}

function SectionCard({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-100 flex items-center gap-2">
          <Icon className="h-4 w-4 text-red-500" />
          {title}
        </h2>
        {action}
      </div>
      {children}
    </div>
  );
}

const DEVIS_LABELS: Record<string, string> = {
  brouillon: "Brouillon",
  envoye: "Envoyé",
  signe: "Signé",
  refuse: "Refusé",
  expire: "Expiré",
};
const DEVIS_COLORS: Record<string, string> = {
  brouillon: "bg-gray-700 text-gray-300",
  envoye: "bg-blue-900/30 text-blue-400",
  signe: "bg-green-900/30 text-green-400",
  refuse: "bg-red-900/30 text-red-400",
  expire: "bg-orange-900/30 text-orange-400",
};

const FICHE_LABELS: Record<string, string> = {
  en_attente: "En attente",
  envoye: "Envoyée",
  repondu: "Répondue",
  incomplet: "Incomplète",
};

function actionIcon(action: string) {
  if (action.startsWith("devis")) return FileText;
  if (action.startsWith("facture")) return Receipt;
  if (action === "inscription_creee") return UserPlus;
  if (action === "convocation_envoyee") return Send;
  if (action.startsWith("prospect")) return User;
  return Clock;
}

function actionColor(action: string) {
  if (action.startsWith("devis")) return { bg: "bg-blue-900/30", text: "text-blue-400", border: "border-blue-700" };
  if (action.startsWith("facture")) return { bg: "bg-orange-900/30", text: "text-orange-400", border: "border-orange-700" };
  if (action === "inscription_creee") return { bg: "bg-violet-900/30", text: "text-violet-400", border: "border-violet-700" };
  if (action === "convocation_envoyee") return { bg: "bg-green-900/30", text: "text-green-400", border: "border-green-700" };
  if (action.startsWith("prospect")) return { bg: "bg-sky-900/30", text: "text-sky-400", border: "border-sky-700" };
  return { bg: "bg-gray-800", text: "text-gray-400", border: "border-gray-700" };
}

// ————————————————————————
// Page principale
// ————————————————————————
export default function ProspectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [updatingStatut, setUpdatingStatut] = useState(false);
  const [converting, setConverting] = useState(false);

  const { data, isLoading, error, mutate } = useApi<ProspectData>(
    id ? `/api/prospects/${id}` : null
  );

  async function handleConvertToClient() {
    if (!data?.demande) return;
    const ok = window.confirm(
      "Convertir ce prospect en client ? Il apparaîtra dans la liste 'Clients'.",
    );
    if (!ok) return;
    setConverting(true);
    try {
      const res = await fetch(`/api/prospects/${data.demande.id}/convert-to-client`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Erreur serveur");
      const json = await res.json();
      await mutate();
      if (json.alreadyClient) {
        notify.success("Déjà marqué comme client");
      } else {
        notify.success("Prospect converti en client");
      }
    } catch {
      notify.error("Impossible de convertir en client");
    } finally {
      setConverting(false);
    }
  }

  async function handleStatutChange(newStatut: string) {
    if (!data) return;
    const { demande } = data;

    // Confirmation IA :
    //   - nouveau → devis_envoye sans devis (workflow standard)
    //   - n'importe quel statut → accepte sans devis (fast-track Gagné)
    const willGenerateDevis =
      !demande.devisId &&
      ((demande.statut === "nouveau" && newStatut === "devis_envoye") ||
        (demande.statut !== "accepte" && newStatut === "accepte"));
    if (willGenerateDevis) {
      const ok = window.confirm(
        "Cela va générer un devis brouillon avec l'IA. Continuer ?",
      );
      if (!ok) return;
    }

    setUpdatingStatut(true);
    try {
      const res = await fetch(`/api/demandes/${demande.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut: newStatut }),
      });
      const json = await res.json();

      await mutate();

      if (json.ai?.generated === true) {
        notify.success("Devis brouillon généré par l'IA");
      } else if (json.ai?.generated === false) {
        notify.error("Statut mis à jour, mais l'IA n'a pas pu générer le devis", json.ai.error);
      } else {
        notify.success("Statut mis à jour");
      }
    } catch {
      notify.error("Erreur lors de la mise à jour du statut");
    } finally {
      setUpdatingStatut(false);
    }
  }

  // Loading / error states
  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center py-24 gap-3">
        <AlertCircle className="h-8 w-8 text-red-500" />
        <p className="text-gray-400">Prospect introuvable</p>
        <Link href="/demandes" className="text-sm text-red-500 hover:underline">
          Retour aux demandes
        </Link>
      </div>
    );
  }

  const {
    demande,
    contact,
    entreprise,
    formation,
    devis,
    session,
    ficheEntreprise,
    fichesStagiaire,
    inscriptions,
    historique,
  } = data;

  const st = BESOIN_STATUTS[demande.statut as keyof typeof BESOIN_STATUTS];

  const fichesRepondues = fichesStagiaire.filter((f) => f.statut === "repondu").length;

  return (
    <div className="min-h-screen">
      {/* ——— HEADER STICKY ——— */}
      <div className="sticky top-0 z-20 border-b border-gray-700 bg-gray-900 px-4 py-3">
        <div className="flex items-center gap-4 flex-wrap">
          <Link
            href="/demandes"
            className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-300 shrink-0"
          >
            <ArrowLeft className="h-4 w-4" /> Retour
          </Link>

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-100 truncate">
              {contact ? `${contact.prenom} ${contact.nom}` : demande.titre}
              {entreprise && (
                <span className="text-gray-400 font-normal"> — {entreprise.nom}</span>
              )}
            </p>
            <p className="text-xs text-gray-500">Créé le {formatDate(demande.createdAt)}</p>
          </div>

          {/* Sélecteur de statut */}
          <div className="flex items-center gap-2 shrink-0">
            {st && <StatutBadge label={st.label} color={st.color} />}
            <select
              disabled={updatingStatut}
              value={demande.statut}
              onChange={(e) => handleStatutChange(e.target.value)}
              className="rounded-md border border-gray-600 bg-gray-800 px-2 py-1 text-xs text-gray-200 disabled:opacity-50 cursor-pointer"
            >
              {BESOIN_STATUTS_PIPELINE.map((key) => (
                <option key={key} value={key}>
                  {BESOIN_STATUTS[key].label}
                </option>
              ))}
              {/* Fallback : si la demande a un statut legacy (archive), l'afficher quand même */}
              {!BESOIN_STATUTS_PIPELINE.includes(demande.statut as never) &&
                BESOIN_STATUTS[demande.statut as keyof typeof BESOIN_STATUTS] && (
                  <option value={demande.statut}>
                    {BESOIN_STATUTS[demande.statut as keyof typeof BESOIN_STATUTS].label}
                  </option>
                )}
            </select>
          </div>
        </div>
      </div>

      {/* ——— BODY ——— */}
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">

        {/* § 1 — CONTACT */}
        {contact && (
          <SectionCard
            icon={User}
            title="Contact"
            action={
              <div className="flex items-center gap-2">
                {contact.type === "prospect" ? (
                  <button
                    onClick={handleConvertToClient}
                    disabled={converting}
                    className="inline-flex items-center gap-1 rounded-md border border-emerald-700 bg-emerald-900/30 px-2.5 py-1 text-xs font-medium text-emerald-300 hover:bg-emerald-900/50 disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {converting ? "Conversion…" : "Convertir en client"}
                  </button>
                ) : null}
                <Link
                  href={`/contacts/${contact.id}`}
                  className="text-xs text-red-500 hover:text-red-400 flex items-center gap-1"
                >
                  Voir <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            }
          >
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-gray-100 flex items-center gap-2 flex-wrap">
                <span>{contact.prenom} {contact.nom}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    contact.type === "client"
                      ? "bg-emerald-900/40 text-emerald-300 border border-emerald-700"
                      : contact.type === "stagiaire"
                      ? "bg-violet-900/40 text-violet-300 border border-violet-700"
                      : "bg-sky-900/40 text-sky-300 border border-sky-700"
                  }`}
                >
                  {contact.type === "client"
                    ? "Client"
                    : contact.type === "stagiaire"
                    ? "Stagiaire"
                    : "Prospect"}
                </span>
                {contact.poste && (
                  <span className="ml-1 text-xs text-gray-400 font-normal">— {contact.poste}</span>
                )}
              </p>
              <div className="flex flex-wrap gap-4 text-gray-400">
                <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 hover:text-gray-200 text-xs">
                  <Mail className="h-3.5 w-3.5" /> {contact.email}
                </a>
                {contact.telephone && (
                  <a href={`tel:${contact.telephone}`} className="flex items-center gap-1.5 hover:text-gray-200 text-xs">
                    <Phone className="h-3.5 w-3.5" /> {contact.telephone}
                  </a>
                )}
              </div>
            </div>
          </SectionCard>
        )}

        {/* § 2 — ENTREPRISE */}
        {entreprise && (
          <SectionCard
            icon={Building2}
            title="Entreprise"
            action={
              <Link
                href={`/entreprises/${entreprise.id}`}
                className="text-xs text-red-500 hover:text-red-400 flex items-center gap-1"
              >
                Voir <ExternalLink className="h-3 w-3" />
              </Link>
            }
          >
            <div className="space-y-2 text-sm">
              <p className="font-semibold text-gray-100">{entreprise.nom}</p>
              {entreprise.secteur && (
                <p className="text-xs text-gray-400">{entreprise.secteur}</p>
              )}
              <div className="flex flex-wrap gap-4 text-gray-400 text-xs pt-1">
                {(entreprise.adresse || entreprise.ville) && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {[entreprise.adresse, entreprise.codePostal, entreprise.ville]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                )}
                {entreprise.siret && (
                  <span className="flex items-center gap-1.5 font-mono">
                    <Hash className="h-3.5 w-3.5 shrink-0" /> {entreprise.siret}
                  </span>
                )}
                {entreprise.effectif && (
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 shrink-0" /> {entreprise.effectif} salariés
                  </span>
                )}
              </div>
            </div>
          </SectionCard>
        )}

        {/* § 3 — DEMANDE DE FORMATION */}
        <SectionCard
          icon={ClipboardList}
          title="Demande de formation"
          action={
            <Link
              href={`/demandes/${demande.id}/modifier`}
              className="text-xs text-red-500 hover:text-red-400"
            >
              Modifier
            </Link>
          }
        >
          <div className="space-y-3 text-sm">
            <p className="font-semibold text-gray-100">{demande.titre}</p>
            {demande.description && (
              <p className="text-gray-300 whitespace-pre-wrap text-sm leading-relaxed">
                {demande.description}
              </p>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <p className="text-xs text-gray-500">Origine</p>
                <p className="text-gray-200">
                  {BESOIN_ORIGINES[demande.origine as keyof typeof BESOIN_ORIGINES]?.label || demande.origine}
                </p>
              </div>
              {demande.nbStagiaires && (
                <div>
                  <p className="text-xs text-gray-500">Nb stagiaires</p>
                  <p className="text-gray-200">{demande.nbStagiaires}</p>
                </div>
              )}
              {demande.budget && (
                <div>
                  <p className="text-xs text-gray-500">Budget</p>
                  <p className="text-gray-200">{formatCurrency(demande.budget)}</p>
                </div>
              )}
              {demande.datesSouhaitees && (
                <div>
                  <p className="text-xs text-gray-500">Dates souhaitées</p>
                  <p className="text-gray-200">{demande.datesSouhaitees}</p>
                </div>
              )}
              {formation && (
                <div>
                  <p className="text-xs text-gray-500">Formation</p>
                  <Link href={`/formations/${formation.id}`} className="text-red-500 hover:underline">
                    {formation.titre}
                  </Link>
                </div>
              )}
            </div>
            {demande.notes && (
              <div className="pt-2 border-t border-gray-700">
                <p className="text-xs text-gray-500 mb-1">Notes</p>
                <p className="text-gray-300 text-xs whitespace-pre-wrap">{demande.notes}</p>
              </div>
            )}
            {/* Bouton génération devis IA si pas de devis et statut nouveau */}
            {!devis && demande.statut === "nouveau" && (
              <div className="pt-3 border-t border-gray-700">
                <button
                  onClick={() => handleStatutChange("devis_envoye")}
                  disabled={updatingStatut}
                  className="inline-flex items-center gap-2 rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Générer le devis brouillon (IA)
                </button>
              </div>
            )}
          </div>
        </SectionCard>

        {/* § 4 — DEVIS */}
        {devis && (
          <SectionCard
            icon={Receipt}
            title="Devis"
            action={
              <Link
                href={`/commercial/devis/${devis.id}`}
                className="text-xs text-red-500 hover:text-red-400 flex items-center gap-1"
              >
                Ouvrir <ExternalLink className="h-3 w-3" />
              </Link>
            }
          >
            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-mono font-semibold text-gray-100">{devis.numero}</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${DEVIS_COLORS[devis.statut] || "bg-gray-700 text-gray-400"}`}
                >
                  {DEVIS_LABELS[devis.statut] || devis.statut}
                </span>
              </div>
              {devis.objet && <p className="text-gray-400 text-xs">{devis.objet}</p>}
              <div className="flex gap-6">
                <div>
                  <p className="text-xs text-gray-500">Montant HT</p>
                  <p className="font-semibold text-gray-100">{formatCurrency(devis.montantHT)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Montant TTC</p>
                  <p className="font-semibold text-gray-100">{formatCurrency(devis.montantTTC)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Émis le</p>
                  <p className="text-gray-200">{formatDate(devis.dateEmission)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Valide jusqu'au</p>
                  <p className="text-gray-200">{formatDate(devis.dateValidite)}</p>
                </div>
              </div>
              {devis.lignes.length > 0 && (
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="text-gray-500 border-b border-gray-700">
                      <th className="text-left pb-1 font-normal">Désignation</th>
                      <th className="text-right pb-1 font-normal">Qté</th>
                      <th className="text-right pb-1 font-normal">PU HT</th>
                      <th className="text-right pb-1 font-normal">Montant HT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/50">
                    {devis.lignes.map((l) => (
                      <tr key={l.id} className="text-gray-300">
                        <td className="py-1.5 pr-2">{l.designation}</td>
                        <td className="py-1.5 text-right">{l.quantite}</td>
                        <td className="py-1.5 text-right">{formatCurrency(l.prixUnitaire)}</td>
                        <td className="py-1.5 text-right font-medium">{formatCurrency(l.montant)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </SectionCard>
        )}

        {/* § 5 — SESSION */}
        {session && (
          <SectionCard
            icon={CalendarDays}
            title="Session de formation"
            action={
              <Link
                href={`/sessions/${session.id}`}
                className="text-xs text-red-500 hover:text-red-400 flex items-center gap-1"
              >
                Aller à la session <ExternalLink className="h-3 w-3" />
              </Link>
            }
          >
            <div className="space-y-3 text-sm">
              {session.formation && (
                <p className="font-semibold text-gray-100">{session.formation.titre}</p>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-gray-500">Dates</p>
                  <p className="text-gray-200">
                    {formatDate(session.dateDebut)} → {formatDate(session.dateFin)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Lieu</p>
                  <p className="text-gray-200">
                    {session.lieuFormation?.nom || session.lieu || (
                      <span className="inline-flex items-center gap-1 text-orange-400">
                        <BadgeAlert className="h-3.5 w-3.5" /> À compléter
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Formateur</p>
                  <p className="text-gray-200">
                    {session.formateur
                      ? `${session.formateur.prenom} ${session.formateur.nom}`
                      : <span className="text-gray-500">Non assigné</span>}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Capacité</p>
                  <p className="text-gray-200">{session.capaciteMax} places</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Statut</p>
                  <p className="text-gray-200 capitalize">{session.statut.replace("_", " ")}</p>
                </div>
              </div>
            </div>
          </SectionCard>
        )}

        {/* § 6 — FICHES QUALIOPI */}
        {(ficheEntreprise || fichesStagiaire.length > 0) && (
          <SectionCard icon={FileText} title="Fiches pré-formation (Qualiopi)">
            <div className="space-y-4 text-sm">
              {ficheEntreprise && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Fiche entreprise</p>
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        ficheEntreprise.statut === "repondu"
                          ? "bg-green-900/30 text-green-400"
                          : ficheEntreprise.statut === "envoye"
                          ? "bg-blue-900/30 text-blue-400"
                          : "bg-gray-700 text-gray-400"
                      }`}
                    >
                      {FICHE_LABELS[ficheEntreprise.statut] || ficheEntreprise.statut}
                    </span>
                    {ficheEntreprise.dateEnvoi && (
                      <span className="text-xs text-gray-400">
                        Envoyée le {formatDate(ficheEntreprise.dateEnvoi)}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {fichesStagiaire.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">
                    Fiches stagiaires — {fichesRepondues}/{fichesStagiaire.length} répondues
                  </p>
                  <div className="space-y-1.5">
                    {fichesStagiaire.map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center gap-3 rounded-md bg-gray-700/40 px-3 py-2"
                      >
                        <span className="flex-1 text-gray-200 text-xs">
                          {f.contact.prenom} {f.contact.nom}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            f.statut === "repondu"
                              ? "bg-green-900/30 text-green-400"
                              : f.statut === "envoye"
                              ? "bg-blue-900/30 text-blue-400"
                              : "bg-gray-700 text-gray-400"
                          }`}
                        >
                          {FICHE_LABELS[f.statut] || f.statut}
                        </span>
                        {f.dateEnvoi && (
                          <span className="text-xs text-gray-500">{formatDate(f.dateEnvoi)}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {/* § 7 — INSCRIPTIONS */}
        {session && (
          <SectionCard
            icon={Users}
            title={`Inscriptions (${inscriptions.length})`}
            action={
              <Link
                href={`/sessions/${session.id}/inscriptions/new`}
                className="text-xs text-red-500 hover:text-red-400 flex items-center gap-1"
              >
                <UserPlus className="h-3.5 w-3.5" /> Ajouter
              </Link>
            }
          >
            {inscriptions.length === 0 ? (
              <p className="text-sm text-gray-500 italic">Aucune inscription pour cette session.</p>
            ) : (
              <div className="space-y-1.5">
                {inscriptions.map((ins) => (
                  <div
                    key={ins.id}
                    className="flex items-center gap-3 rounded-md bg-gray-700/40 px-3 py-2 text-sm"
                  >
                    <span className="flex-1 text-gray-200 text-xs">
                      {ins.contact.prenom} {ins.contact.nom}
                    </span>
                    <span className="text-xs text-gray-400">{ins.contact.email}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        ins.statut === "confirmee"
                          ? "bg-green-900/30 text-green-400"
                          : ins.statut === "annulee"
                          ? "bg-red-900/30 text-red-400"
                          : "bg-gray-700 text-gray-400"
                      }`}
                    >
                      {ins.statut.replace("_", " ")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        )}

        {/* § 8 — HISTORIQUE */}
        <SectionCard icon={Clock} title={`Historique${historique.length > 0 ? ` (${historique.length})` : ""}`}>
          {historique.length === 0 ? (
            <p className="text-sm text-gray-500 italic">Aucune action enregistrée.</p>
          ) : (
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px border-l-2 border-dashed border-gray-700" />
              <div className="space-y-3 pl-12">
                {historique.slice(0, 10).map((h) => {
                  const Icon = actionIcon(h.action);
                  const c = actionColor(h.action);
                  return (
                    <div key={h.id} className="relative">
                      <div
                        className={`absolute -left-8 h-7 w-7 rounded-full border flex items-center justify-center ${c.bg} ${c.border}`}
                      >
                        <Icon className={`h-3.5 w-3.5 ${c.text}`} />
                      </div>
                      <div className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 hover:border-gray-600 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            {h.lien ? (
                              <Link
                                href={h.lien}
                                className="text-sm font-medium text-gray-100 hover:text-red-400"
                              >
                                {h.label}
                              </Link>
                            ) : (
                              <p className="text-sm font-medium text-gray-100">{h.label}</p>
                            )}
                            {h.detail && (
                              <p className="text-xs text-gray-500 mt-0.5">{h.detail}</p>
                            )}
                          </div>
                          <span
                            className="text-xs text-gray-500 shrink-0"
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
          )}
        </SectionCard>
      </div>
    </div>
  );
}
