"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  User, Building2, Mail, Phone, Briefcase, FileText, Calendar, Pencil, Trash2,
  BookOpen, ClipboardList, MessageSquare, FolderOpen, Award, Clock,
  Star, Euro, CheckCircle2, XCircle, AlertCircle,
} from "lucide-react";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { StatutBadge } from "@/components/shared/StatutBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CONTACT_TYPES, INSCRIPTION_STATUTS, SESSION_STATUTS, DEVIS_STATUTS,
  BESOIN_STATUTS, BESOIN_PRIORITES, EVALUATION_TYPES,
} from "@/lib/constants";
import { formatDate, formatCurrency } from "@/lib/utils";

interface Session {
  id: string;
  dateDebut: string;
  dateFin: string;
  statut: keyof typeof SESSION_STATUTS;
  lieu: string | null;
  formation: { id: string; titre: string };
}

interface Inscription {
  id: string;
  statut: keyof typeof INSCRIPTION_STATUTS;
  createdAt: string;
  session: Session;
}

interface Devis {
  id: string;
  numero: string;
  objet: string;
  montantHT: number;
  montantTTC: number;
  statut: keyof typeof DEVIS_STATUTS;
  dateEmission: string;
  dateValidite: string;
}

interface Attestation {
  id: string;
  type: string;
  statut: string;
  createdAt: string;
  session: { id: string; formation: { titre: string } };
}

interface EvaluationData {
  id: string;
  type: keyof typeof EVALUATION_TYPES;
  noteGlobale: number | null;
  estComplete: boolean;
  commentaire: string | null;
  createdAt: string;
  session: { id: string; formation: { titre: string } };
}

interface Besoin {
  id: string;
  titre: string;
  statut: keyof typeof BESOIN_STATUTS;
  priorite: keyof typeof BESOIN_PRIORITES;
  nbStagiaires: number | null;
  createdAt: string;
  formation: { id: string; titre: string } | null;
}

interface FeuillePresence {
  id: string;
  date: string;
  matin: boolean;
  apresMidi: boolean;
  session: { id: string; formation: { titre: string } };
}

interface Entreprise {
  id: string;
  nom: string;
}

interface Contact {
  id: string;
  nom: string;
  prenom: string;
  email: string | null;
  telephone: string | null;
  type: keyof typeof CONTACT_TYPES;
  poste: string | null;
  notes: string | null;
  entreprise: Entreprise | null;
  inscriptions: Inscription[];
  devis: Devis[];
  attestations: Attestation[];
  evaluations: EvaluationData[];
  besoins: Besoin[];
  feuillesPresence: FeuillePresence[];
  createdAt: string;
}

type TabKey = "informations" | "formations" | "documents" | "devis" | "evaluations" | "besoins";

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("informations");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch(`/api/contacts/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Contact introuvable");
        return res.json();
      })
      .then((data) => setContact(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/contacts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erreur lors de la suppression");
      router.push("/contacts");
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

  if (error || !contact) {
    return (
      <div className="p-6">
        <p className="text-red-600">{error || "Contact introuvable"}</p>
        <Link href="/contacts" className="text-red-600 hover:underline text-sm mt-2 inline-block">
          Retour aux contacts
        </Link>
      </div>
    );
  }

  const typeInfo = CONTACT_TYPES[contact.type];

  const tabs: { key: TabKey; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: "informations", label: "Informations", icon: <User className="h-4 w-4" /> },
    { key: "formations", label: "Formations", icon: <BookOpen className="h-4 w-4" />, count: contact.inscriptions.length },
    { key: "documents", label: "Documents", icon: <FolderOpen className="h-4 w-4" />, count: contact.attestations.length + contact.feuillesPresence.length },
    { key: "devis", label: "Devis & Factures", icon: <Euro className="h-4 w-4" />, count: contact.devis.length },
    { key: "evaluations", label: "Evaluations", icon: <MessageSquare className="h-4 w-4" />, count: contact.evaluations.length },
    { key: "besoins", label: "Besoins", icon: <ClipboardList className="h-4 w-4" />, count: contact.besoins.length },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Breadcrumb items={[
          { label: "Contacts", href: "/contacts" },
          { label: `${contact.prenom} ${contact.nom}` },
        ]} />
        <div className="flex items-start justify-between mt-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-xl bg-red-900/30 flex items-center justify-center">
              <User className="h-7 w-7 text-red-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-100">
                {contact.prenom} {contact.nom}
              </h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {typeInfo && <StatutBadge label={typeInfo.label} color={typeInfo.color} />}
                {contact.poste && <span className="text-sm text-gray-400">{contact.poste}</span>}
                {contact.entreprise && (
                  <Link href={`/entreprises/${contact.entreprise.id}`} className="text-sm text-red-500 hover:underline flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" /> {contact.entreprise.nom}
                  </Link>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/contacts/${id}/modifier`}
              className="inline-flex items-center gap-2 rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors"
            >
              <Pencil className="h-4 w-4" /> Modifier
            </Link>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteOpen(true)}
              className="inline-flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" /> Supprimer
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
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-1 inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-gray-700 px-1.5 text-[11px] font-medium text-gray-300">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* ============== TAB: Informations ============== */}
      {activeTab === "informations" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonne gauche */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Coordonnees</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {contact.email && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400 flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> Email</span>
                    <a href={`mailto:${contact.email}`} className="text-sm text-red-500 hover:underline">{contact.email}</a>
                  </div>
                )}
                {contact.telephone && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400 flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> Telephone</span>
                    <a href={`tel:${contact.telephone}`} className="text-sm text-gray-200 hover:underline">{contact.telephone}</a>
                  </div>
                )}
                {contact.poste && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400 flex items-center gap-2"><Briefcase className="h-3.5 w-3.5" /> Poste</span>
                    <span className="text-sm text-gray-200">{contact.poste}</span>
                  </div>
                )}
                {contact.entreprise && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400 flex items-center gap-2"><Building2 className="h-3.5 w-3.5" /> Entreprise</span>
                    <Link href={`/entreprises/${contact.entreprise.id}`} className="text-sm text-red-500 hover:underline">
                      {contact.entreprise.nom}
                    </Link>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400 flex items-center gap-2"><Calendar className="h-3.5 w-3.5" /> Cree le</span>
                  <span className="text-sm text-gray-200">{formatDate(contact.createdAt)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Statistiques rapides */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Activite</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Formations suivies</span>
                  <span className="text-sm font-semibold text-gray-200">{contact.inscriptions.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Devis</span>
                  <span className="text-sm font-semibold text-gray-200">{contact.devis.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Attestations</span>
                  <span className="text-sm font-semibold text-gray-200">{contact.attestations.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Evaluations</span>
                  <span className="text-sm font-semibold text-gray-200">{contact.evaluations.length}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Colonne droite */}
          <div className="lg:col-span-2 space-y-6">
            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-400" /> Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {contact.notes ? (
                  <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{contact.notes}</p>
                ) : (
                  <p className="text-sm text-gray-500 italic">Aucune note pour ce contact.</p>
                )}
              </CardContent>
            </Card>

            {/* Dernieres inscriptions */}
            {contact.inscriptions.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-gray-400" /> Dernieres formations
                    </CardTitle>
                    <button onClick={() => setActiveTab("formations")} className="text-xs text-red-500 hover:underline">
                      Voir tout
                    </button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {contact.inscriptions.slice(0, 3).map((ins) => {
                      const sInfo = SESSION_STATUTS[ins.session.statut];
                      const iInfo = INSCRIPTION_STATUTS[ins.statut];
                      return (
                        <div key={ins.id} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0">
                          <div>
                            <Link href={`/formations/${ins.session.formation.id}`} className="text-sm font-medium text-red-500 hover:underline">
                              {ins.session.formation.titre}
                            </Link>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {formatDate(ins.session.dateDebut)} → {formatDate(ins.session.dateFin)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {sInfo && <StatutBadge label={sInfo.label} color={sInfo.color} />}
                            {iInfo && <StatutBadge label={iInfo.label} color={iInfo.color} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ============== TAB: Formations ============== */}
      {activeTab === "formations" && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-sm overflow-hidden">
          {contact.inscriptions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <BookOpen className="h-10 w-10 text-gray-600 mb-3" />
              <h3 className="text-base font-medium text-gray-300 mb-1">Aucune formation</h3>
              <p className="text-sm text-gray-400">Ce contact n&apos;est inscrit a aucune formation.</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Formation</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Dates</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Lieu</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Statut session</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Inscription</th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {contact.inscriptions.map((ins) => {
                  const sInfo = SESSION_STATUTS[ins.session.statut];
                  const iInfo = INSCRIPTION_STATUTS[ins.statut];
                  return (
                    <tr key={ins.id} className="hover:bg-gray-750 transition-colors">
                      <td className="px-6 py-4">
                        <Link href={`/formations/${ins.session.formation.id}`} className="text-sm font-medium text-red-500 hover:underline">
                          {ins.session.formation.titre}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        <Link href={`/sessions/${ins.session.id}`} className="hover:underline text-gray-300">
                          {formatDate(ins.session.dateDebut)} → {formatDate(ins.session.dateFin)}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {ins.session.lieu || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {sInfo && <StatutBadge label={sInfo.label} color={sInfo.color} />}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {iInfo && <StatutBadge label={iInfo.label} color={iInfo.color} />}
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
        <div className="space-y-6">
          {/* Attestations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="h-4 w-4 text-gray-400" /> Attestations
                {contact.attestations.length > 0 && (
                  <span className="ml-auto text-xs text-gray-400">{contact.attestations.length} attestation(s)</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {contact.attestations.length === 0 ? (
                <p className="text-sm text-gray-500 italic py-4 text-center">Aucune attestation generee.</p>
              ) : (
                <div className="space-y-3">
                  {contact.attestations.map((att) => (
                    <div key={att.id} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-200">
                          {att.type === "fin_formation" ? "Attestation de fin de formation" :
                           att.type === "presence" ? "Attestation de presence" :
                           att.type === "competences" ? "Attestation de competences" : att.type}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{att.session?.formation?.titre} - {formatDate(att.createdAt)}</p>
                      </div>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        att.statut === "envoyee" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                        att.statut === "validee" ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" :
                        "bg-gray-700 text-gray-300 border border-gray-600"
                      }`}>
                        {att.statut === "generee" ? "Generee" : att.statut === "validee" ? "Validee" : "Envoyee"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Feuilles de presence */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-gray-400" /> Feuilles de presence
                {contact.feuillesPresence.length > 0 && (
                  <span className="ml-auto text-xs text-gray-400">{contact.feuillesPresence.length} feuille(s)</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {contact.feuillesPresence.length === 0 ? (
                <p className="text-sm text-gray-500 italic py-4 text-center">Aucune feuille de presence.</p>
              ) : (
                <div className="space-y-3">
                  {contact.feuillesPresence.map((fp) => (
                    <div key={fp.id} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-200">{fp.session?.formation?.titre}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatDate(fp.date)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${fp.matin ? "bg-emerald-500/20 text-emerald-400" : "bg-gray-700 text-gray-500"}`}>
                          {fp.matin ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />} Matin
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${fp.apresMidi ? "bg-emerald-500/20 text-emerald-400" : "bg-gray-700 text-gray-500"}`}>
                          {fp.apresMidi ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />} Apres-midi
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ============== TAB: Devis & Factures ============== */}
      {activeTab === "devis" && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-sm overflow-hidden">
          {contact.devis.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Euro className="h-10 w-10 text-gray-600 mb-3" />
              <h3 className="text-base font-medium text-gray-300 mb-1">Aucun devis</h3>
              <p className="text-sm text-gray-400">Aucun devis associe a ce contact.</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Numero</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Objet</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Montant HT</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Montant TTC</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Statut</th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {contact.devis.map((d) => {
                  const dInfo = DEVIS_STATUTS[d.statut];
                  return (
                    <tr key={d.id} className="hover:bg-gray-750 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link href={`/commercial/devis/${d.id}`} className="text-sm font-medium text-red-500 hover:underline">
                          {d.numero}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300 max-w-xs truncate">{d.objet}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200 font-medium">{formatCurrency(d.montantHT)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">{formatCurrency(d.montantTTC)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{formatDate(d.dateEmission)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {dInfo && <StatutBadge label={dInfo.label} color={dInfo.color} />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ============== TAB: Evaluations ============== */}
      {activeTab === "evaluations" && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-sm overflow-hidden">
          {contact.evaluations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <MessageSquare className="h-10 w-10 text-gray-600 mb-3" />
              <h3 className="text-base font-medium text-gray-300 mb-1">Aucune evaluation</h3>
              <p className="text-sm text-gray-400">Ce contact n&apos;a pas encore d&apos;evaluation.</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Formation</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Note</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {contact.evaluations.map((ev) => {
                  const evType = EVALUATION_TYPES[ev.type];
                  return (
                    <tr key={ev.id} className="hover:bg-gray-750 transition-colors">
                      <td className="px-6 py-4">
                        <Link href={`/sessions/${ev.session.id}`} className="text-sm font-medium text-red-500 hover:underline">
                          {ev.session?.formation?.titre}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {evType?.label ?? ev.type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {ev.noteGlobale !== null ? (
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <Star
                                key={i}
                                className={`h-3.5 w-3.5 ${i <= (ev.noteGlobale ?? 0) ? "text-amber-400 fill-amber-400" : "text-gray-600"}`}
                              />
                            ))}
                            <span className="ml-1 text-sm text-gray-300">{ev.noteGlobale}/5</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          ev.estComplete
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        }`}>
                          {ev.estComplete ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                          {ev.estComplete ? "Completee" : "En attente"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {formatDate(ev.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ============== TAB: Besoins ============== */}
      {activeTab === "besoins" && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-sm overflow-hidden">
          {contact.besoins.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ClipboardList className="h-10 w-10 text-gray-600 mb-3" />
              <h3 className="text-base font-medium text-gray-300 mb-1">Aucun besoin</h3>
              <p className="text-sm text-gray-400">Aucun besoin de formation enregistre pour ce contact.</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Besoin</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Formation</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Priorite</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Stagiaires</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {contact.besoins.map((b) => {
                  const bInfo = BESOIN_STATUTS[b.statut];
                  const pInfo = BESOIN_PRIORITES[b.priorite];
                  return (
                    <tr key={b.id} className="hover:bg-gray-750 transition-colors">
                      <td className="px-6 py-4">
                        <Link href={`/besoins/${b.id}`} className="text-sm font-medium text-red-500 hover:underline">
                          {b.titre}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {b.formation ? (
                          <Link href={`/formations/${b.formation.id}`} className="text-red-500 hover:underline">
                            {b.formation.titre}
                          </Link>
                        ) : "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`flex items-center gap-1 text-sm ${pInfo?.color ?? "text-gray-400"}`}>
                          <AlertCircle className="h-3.5 w-3.5" /> {pInfo?.label ?? b.priorite}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {b.nbStagiaires ?? "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {bInfo && <StatutBadge label={bInfo.label} color={bInfo.color} />}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {formatDate(b.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Suppression */}
      <div className="mt-8 pt-6 border-t border-gray-700 flex justify-end">
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setDeleteOpen(true)}
          className="inline-flex items-center gap-2"
        >
          <Trash2 className="h-4 w-4" /> Supprimer le contact
        </Button>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Supprimer le contact"
        description={`Etes-vous sur de vouloir supprimer ${contact.prenom} ${contact.nom} ? Cette action est irreversible.`}
        confirmLabel="Supprimer"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
