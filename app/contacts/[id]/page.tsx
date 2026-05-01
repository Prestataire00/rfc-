"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  User, Building2, Mail, Phone, Briefcase, FileText, Calendar, Pencil, Trash2,
  BookOpen, ClipboardList, MessageSquare, FolderOpen, Clock,
  Star, Euro, CheckCircle2, AlertCircle, Plus, UserCheck, Sparkles,
} from "lucide-react";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { StatutBadge } from "@/components/shared/StatutBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { AIButton } from "@/components/shared/AIButton";
import { notify } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CONTACT_TYPES, INSCRIPTION_STATUTS, SESSION_STATUTS, DEVIS_STATUTS,
  BESOIN_STATUTS, BESOIN_PRIORITES, EVALUATION_TYPES,
} from "@/lib/constants";
import { formatDate, formatCurrency } from "@/lib/utils";
import type { Contact, TabKey } from "./types";
import { DocumentsTab } from "./DocumentsTab";

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
  const [aiResult, setAiResult] = useState("");

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

  const [convertOpen, setConvertOpen] = useState(false);
  const [convertMode, setConvertMode] = useState<"existante" | "nouvelle">("nouvelle");
  const [convertEntrepriseId, setConvertEntrepriseId] = useState("");
  const [convertNom, setConvertNom] = useState("");
  const [convertSiret, setConvertSiret] = useState("");
  const [convertEmail, setConvertEmail] = useState("");
  const [convertTel, setConvertTel] = useState("");
  const [convertAdresse, setConvertAdresse] = useState("");
  const [convertVille, setConvertVille] = useState("");
  const [convertCp, setConvertCp] = useState("");
  const [converting, setConverting] = useState(false);
  const [convertError, setConvertError] = useState("");
  const [allEntreprises, setAllEntreprises] = useState<{ id: string; nom: string }[]>([]);

  useEffect(() => {
    if (convertOpen && allEntreprises.length === 0) {
      fetch("/api/entreprises").then((r) => r.ok ? r.json() : []).then((d) => setAllEntreprises(Array.isArray(d) ? d : d.entreprises || []));
    }
  }, [convertOpen, allEntreprises.length]);

  // Pre-remplir si le contact a deja une entreprise
  useEffect(() => {
    if (contact?.entreprise) {
      setConvertMode("existante");
      setConvertEntrepriseId(contact.entreprise.id);
    }
  }, [contact?.entreprise]);

  const handleConvertToClient = async () => {
    setConverting(true);
    setConvertError("");
    try {
      const body = convertMode === "existante"
        ? { entrepriseExistanteId: convertEntrepriseId }
        : { nouvelleEntreprise: { nom: convertNom, siret: convertSiret || undefined, email: convertEmail || undefined, telephone: convertTel || undefined, adresse: convertAdresse || undefined, ville: convertVille || undefined, codePostal: convertCp || undefined } };

      const res = await fetch(`/api/contacts/${id}/convertir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur de conversion");
      }
      const updated = await res.json();
      setContact((prev) => prev ? { ...prev, type: updated.type, entreprise: updated.entreprise } : prev);
      setConvertOpen(false);
      notify.success("Prospect converti en client");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur";
      setConvertError(msg);
      notify.error("Erreur conversion", msg);
    }
    setConverting(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/contacts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erreur lors de la suppression");
      notify.success("Contact supprime");
      router.push("/contacts");
    } catch {
      notify.error("Erreur", "Suppression impossible");
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
            {contact.type === "prospect" && (
              <button
                onClick={() => setConvertOpen(true)}
                className="inline-flex items-center gap-2 rounded-md bg-emerald-600 hover:bg-emerald-700 px-3 py-2 text-sm font-medium text-white transition-colors"
              >
                <UserCheck className="h-4 w-4" /> Convertir en client
              </button>
            )}
            <Link
              href={`/commercial/devis/nouveau?contactId=${id}${contact.entreprise ? `&entrepriseId=${contact.entreprise.id}` : ""}`}
              className="inline-flex items-center gap-2 rounded-md bg-red-600 hover:bg-red-700 px-3 py-2 text-sm font-medium text-white transition-colors"
            >
              <Plus className="h-4 w-4" /> Devis
            </Link>
            <Link
              href={`/besoins/nouveau?contactId=${id}${contact.entreprise ? `&entrepriseId=${contact.entreprise.id}` : ""}`}
              className="inline-flex items-center gap-2 rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors"
            >
              <Plus className="h-4 w-4" /> Besoin
            </Link>
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

            {/* Actions rapides */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Actions rapides</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2">
                <Link
                  href={`/commercial/devis/nouveau?contactId=${id}${contact.entreprise ? `&entrepriseId=${contact.entreprise.id}` : ""}`}
                  className="flex items-center gap-2 rounded-md border border-gray-700 px-3 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:border-gray-600 transition-colors"
                >
                  <Euro className="h-4 w-4 text-red-500" /> Creer un devis
                </Link>
                <Link
                  href={`/besoins/nouveau?contactId=${id}${contact.entreprise ? `&entrepriseId=${contact.entreprise.id}` : ""}`}
                  className="flex items-center gap-2 rounded-md border border-gray-700 px-3 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:border-gray-600 transition-colors"
                >
                  <ClipboardList className="h-4 w-4 text-red-500" /> Nouveau besoin
                </Link>
                {contact.email && (
                  <a
                    href={`mailto:${contact.email}`}
                    className="flex items-center gap-2 rounded-md border border-gray-700 px-3 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:border-gray-600 transition-colors"
                  >
                    <Mail className="h-4 w-4 text-blue-400" /> Envoyer un email
                  </a>
                )}
                {contact.telephone && (
                  <a
                    href={`tel:${contact.telephone}`}
                    className="flex items-center gap-2 rounded-md border border-gray-700 px-3 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:border-gray-600 transition-colors"
                  >
                    <Phone className="h-4 w-4 text-green-400" /> Appeler
                  </a>
                )}
              </CardContent>
            </Card>

            {/* Assistant IA */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-red-500" />
                  Assistant IA
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <AIButton endpoint="/api/ai/email" payload={{ type: "prise_contact", contactId: id }} onResult={(t) => setAiResult(t)} label="Email de prise de contact" size="md" className="w-full justify-start" />
                <AIButton endpoint="/api/ai/email" payload={{ type: "suivi_prospect", contactId: id }} onResult={(t) => setAiResult(t)} label="Email de suivi" size="md" className="w-full justify-start" />
                {contact.devis.length > 0 && (
                  <AIButton endpoint="/api/ai/email" payload={{ type: "relance_devis", contactId: id, devisId: contact.devis[0].id }} onResult={(t) => setAiResult(t)} label="Relance devis" size="md" className="w-full justify-start" />
                )}
                {aiResult && (
                  <div className="mt-3 p-3 rounded-md bg-gray-900 border border-gray-700 relative">
                    <div className="flex items-center justify-between mb-2 text-xs">
                      <span className="text-gray-500">Reponse IA</span>
                      <div className="flex gap-2">
                        <button onClick={() => navigator.clipboard.writeText(aiResult)} className="text-gray-400 hover:text-gray-200">Copier</button>
                        <button onClick={() => setAiResult("")} className="text-gray-400 hover:text-gray-200">Fermer</button>
                      </div>
                    </div>
                    <pre className="text-xs text-gray-300 whitespace-pre-wrap font-sans">{aiResult}</pre>
                  </div>
                )}
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
        <DocumentsTab attestations={contact.attestations} feuillesPresence={contact.feuillesPresence} />
      )}

      {/* ============== TAB: Devis & Factures ============== */}
      {activeTab === "devis" && (
        <div>
          <div className="flex justify-end mb-4">
            <Link
              href={`/commercial/devis/nouveau?contactId=${id}${contact.entreprise ? `&entrepriseId=${contact.entreprise.id}` : ""}`}
              className="inline-flex items-center gap-2 rounded-md bg-red-600 hover:bg-red-700 px-3 py-2 text-sm font-medium text-white transition-colors"
            >
              <Plus className="h-4 w-4" /> Nouveau devis
            </Link>
          </div>
          <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-sm overflow-hidden">
          {contact.devis.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Euro className="h-10 w-10 text-gray-600 mb-3" />
              <h3 className="text-base font-medium text-gray-300 mb-1">Aucun devis</h3>
              <p className="text-sm text-gray-400 mb-4">Aucun devis associe a ce contact.</p>
              <Link
                href={`/commercial/devis/nouveau?contactId=${id}${contact.entreprise ? `&entrepriseId=${contact.entreprise.id}` : ""}`}
                className="inline-flex items-center gap-2 text-sm text-red-500 hover:underline"
              >
                <Plus className="h-4 w-4" /> Creer le premier devis
              </Link>
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
        <div>
          <div className="flex justify-end mb-4">
            <Link
              href={`/besoins/nouveau?contactId=${id}${contact.entreprise ? `&entrepriseId=${contact.entreprise.id}` : ""}`}
              className="inline-flex items-center gap-2 rounded-md bg-red-600 hover:bg-red-700 px-3 py-2 text-sm font-medium text-white transition-colors"
            >
              <Plus className="h-4 w-4" /> Nouveau besoin
            </Link>
          </div>
          <div className="bg-gray-800 rounded-lg border border-gray-700 shadow-sm overflow-hidden">
          {contact.besoins.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ClipboardList className="h-10 w-10 text-gray-600 mb-3" />
              <h3 className="text-base font-medium text-gray-300 mb-1">Aucun besoin</h3>
              <p className="text-sm text-gray-400 mb-4">Aucun besoin de formation enregistre pour ce contact.</p>
              <Link
                href={`/besoins/nouveau?contactId=${id}${contact.entreprise ? `&entrepriseId=${contact.entreprise.id}` : ""}`}
                className="inline-flex items-center gap-2 text-sm text-red-500 hover:underline"
              >
                <Plus className="h-4 w-4" /> Creer le premier besoin
              </Link>
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

      {/* Dialog conversion prospect -> client */}
      {convertOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setConvertOpen(false)}>
          <div className="bg-gray-800 rounded-xl shadow-xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-100 mb-1">Convertir en client</h2>
            <p className="text-sm text-gray-400 mb-4">Rattachez {contact.prenom} {contact.nom} a une entreprise.</p>

            <div className="space-y-4">
              <div className="flex gap-3">
                <button onClick={() => setConvertMode("existante")} className={`flex-1 rounded-md border-2 p-3 text-sm text-left ${convertMode === "existante" ? "border-emerald-600 bg-emerald-900/20 text-emerald-300" : "border-gray-600 text-gray-400"}`}>
                  <Building2 className="h-4 w-4 mb-1" /> Entreprise existante
                </button>
                <button onClick={() => setConvertMode("nouvelle")} className={`flex-1 rounded-md border-2 p-3 text-sm text-left ${convertMode === "nouvelle" ? "border-emerald-600 bg-emerald-900/20 text-emerald-300" : "border-gray-600 text-gray-400"}`}>
                  <Plus className="h-4 w-4 mb-1" /> Nouvelle entreprise
                </button>
              </div>

              {convertMode === "existante" ? (
                <select value={convertEntrepriseId} onChange={(e) => setConvertEntrepriseId(e.target.value)} className="w-full h-10 rounded-md border border-gray-600 bg-gray-900 text-sm text-gray-100 px-3">
                  <option value="">-- Selectionner --</option>
                  {allEntreprises.map((e) => <option key={e.id} value={e.id}>{e.nom}</option>)}
                </select>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-400 mb-1">Nom *</label>
                    <input value={convertNom} onChange={(e) => setConvertNom(e.target.value)} className="w-full h-9 rounded-md border border-gray-600 bg-gray-900 text-sm text-gray-100 px-3" />
                  </div>
                  <div><label className="block text-xs text-gray-400 mb-1">SIRET</label><input value={convertSiret} onChange={(e) => setConvertSiret(e.target.value)} className="w-full h-9 rounded-md border border-gray-600 bg-gray-900 text-sm text-gray-100 px-3" /></div>
                  <div><label className="block text-xs text-gray-400 mb-1">Email</label><input value={convertEmail} onChange={(e) => setConvertEmail(e.target.value)} className="w-full h-9 rounded-md border border-gray-600 bg-gray-900 text-sm text-gray-100 px-3" /></div>
                  <div><label className="block text-xs text-gray-400 mb-1">Telephone</label><input value={convertTel} onChange={(e) => setConvertTel(e.target.value)} className="w-full h-9 rounded-md border border-gray-600 bg-gray-900 text-sm text-gray-100 px-3" /></div>
                  <div><label className="block text-xs text-gray-400 mb-1">Code postal</label><input value={convertCp} onChange={(e) => setConvertCp(e.target.value)} className="w-full h-9 rounded-md border border-gray-600 bg-gray-900 text-sm text-gray-100 px-3" /></div>
                  <div><label className="block text-xs text-gray-400 mb-1">Ville</label><input value={convertVille} onChange={(e) => setConvertVille(e.target.value)} className="w-full h-9 rounded-md border border-gray-600 bg-gray-900 text-sm text-gray-100 px-3" /></div>
                  <div><label className="block text-xs text-gray-400 mb-1">Adresse</label><input value={convertAdresse} onChange={(e) => setConvertAdresse(e.target.value)} className="w-full h-9 rounded-md border border-gray-600 bg-gray-900 text-sm text-gray-100 px-3" /></div>
                </div>
              )}

              {convertError && <p className="text-sm text-red-400">{convertError}</p>}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setConvertOpen(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200">Annuler</button>
              <button
                onClick={handleConvertToClient}
                disabled={converting || (convertMode === "existante" ? !convertEntrepriseId : !convertNom)}
                className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-sm font-medium text-white disabled:opacity-50"
              >
                {converting ? "Conversion..." : "Convertir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
