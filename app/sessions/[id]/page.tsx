"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UserPlus, Trash2, Edit, CalendarDays, Download, FileText, Upload, Mail, Send, ClipboardList, Link2, Search, Users, AlertTriangle } from "lucide-react";
import { StatutBadge } from "@/components/shared/StatutBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { SESSION_STATUTS, INSCRIPTION_STATUTS } from "@/lib/constants";
import { formatDate, formatCurrency, cn } from "@/lib/utils";

type Contact = { id: string; nom: string; prenom: string; email: string };
type Inscription = {
  id: string;
  statut: string;
  contact: Contact & { entreprise?: { nom: string } | null };
  dateInscription: string;
};
type Session = {
  id: string;
  dateDebut: string;
  dateFin: string;
  lieu: string | null;
  capaciteMax: number;
  statut: string;
  notes: string | null;
  coutFormateur: number | null;
  formation: { id: string; titre: string; tarif: number };
  formateur: { id: string; nom: string; prenom: string } | null;
  inscriptions: Inscription[];
};

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [emailMsg, setEmailMsg] = useState("");
  const [evalLoading, setEvalLoading] = useState(false);
  const [evalMsg, setEvalMsg] = useState("");
  const [inscriptionLink, setInscriptionLink] = useState("");
  const [removeConfirm, setRemoveConfirm] = useState<{ id: string; name: string } | null>(null);
  const [removing, setRemoving] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const fetchSession = useCallback(async () => {
    const res = await fetch(`/api/sessions/${id}`);
    if (res.ok) setSession(await res.json());
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchSession(); }, [fetchSession]);

  const fetchContacts = async () => {
    const res = await fetch("/api/contacts");
    if (res.ok) setContacts(await res.json());
  };

  const handleDelete = async () => {
    setDeleting(true);
    await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    router.push("/sessions");
  };

  const handleAddInscription = async () => {
    if (!selectedContactId) return;
    setAdding(true);
    setAddError("");
    const res = await fetch(`/api/sessions/${id}/inscriptions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId: selectedContactId }),
    });
    if (res.ok) {
      setAddOpen(false);
      setSelectedContactId("");
      setContactSearch("");
      fetchSession();
    } else {
      const data = await res.json();
      setAddError(data.error || "Erreur lors de l'inscription");
    }
    setAdding(false);
  };

  const handleUpdateStatutInscription = async (inscriptionId: string, newStatut: string) => {
    await fetch(`/api/sessions/${id}/inscriptions`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inscriptionId, statut: newStatut }),
    });
    fetchSession();
  };

  const handleRemoveInscription = async () => {
    if (!removeConfirm) return;
    setRemoving(true);
    await fetch(`/api/sessions/${id}/inscriptions/${removeConfirm.id}`, { method: "DELETE" });
    setRemoveConfirm(null);
    setRemoving(false);
    fetchSession();
  };

  const handleGenererLienInscription = async () => {
    const res = await fetch(`/api/sessions/${id}/lien-inscription`, { method: "POST" });
    const data = await res.json();
    if (data.lien) {
      setInscriptionLink(data.lien);
      navigator.clipboard.writeText(data.lien);
    }
  };

  const handleGenererEvaluations = async (type: string, cible: string = "stagiaire") => {
    setEvalLoading(true);
    setEvalMsg("");
    const genRes = await fetch("/api/evaluations/generer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: id, type, cible }),
    });
    if (!genRes.ok) {
      const errData = await genRes.json().catch(() => ({}));
      setEvalMsg(errData.error || "Erreur lors de la génération");
      setEvalLoading(false);
      return;
    }
    const emailRes = await fetch("/api/email/evaluation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: id, type }),
    });
    const emailData = await emailRes.json();
    if (emailData.skipped > 0 && emailData.sent === 0) {
      setEvalMsg("Liens générés (SMTP non configuré)");
    } else {
      setEvalMsg(`${emailData.sent} email(s) envoye(s)`);
    }
    setEvalLoading(false);
    setTimeout(() => setEvalMsg(""), 4000);
  };

  const handleSendConvocation = async (contactId: string) => {
    setSendingEmail(contactId);
    setEmailMsg("");
    const res = await fetch("/api/email/convocation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: id, contactId }),
    });
    const data = await res.json();
    if (data.skipped) setEmailMsg("SMTP non configuré (voir .env)");
    else if (res.ok) setEmailMsg("Convocation envoyée !");
    else setEmailMsg(data.error || "Erreur d'envoi");
    setSendingEmail(null);
    setTimeout(() => setEmailMsg(""), 3000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "autre");
    formData.append("sessionId", id);
    await fetch("/api/upload", { method: "POST", body: formData });
    setUploading(false);
    e.target.value = "";
  };

  // Filter contacts for the add dialog
  const inscribedContactIds = session?.inscriptions.map((i) => i.contact.id) || [];
  const availableContacts = useMemo(() => {
    const available = contacts.filter((c) => !inscribedContactIds.includes(c.id));
    if (!contactSearch) return available;
    const q = contactSearch.toLowerCase();
    return available.filter(
      (c) =>
        c.nom.toLowerCase().includes(q) ||
        c.prenom.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contacts, contactSearch, session?.inscriptions]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Session non trouvée</p>
        <Link href="/sessions" className="mt-4 inline-flex items-center gap-1 text-red-600 hover:underline text-sm">
          <ArrowLeft className="h-4 w-4" /> Retour aux sessions
        </Link>
      </div>
    );
  }

  const st = SESSION_STATUTS[session.statut as keyof typeof SESSION_STATUTS];
  const placesRestantes = session.capaciteMax - session.inscriptions.length;
  const capacityRatio = session.inscriptions.length / session.capaciteMax;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link href="/sessions" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-300 mb-4">
          <ArrowLeft className="h-4 w-4" /> Retour aux sessions
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-100">
                <Link href={`/formations/${session.formation.id}`} className="hover:text-red-600">
                  {session.formation.titre}
                </Link>
              </h1>
              {st && <StatutBadge label={st.label} color={st.color} />}
            </div>
            <p className="text-gray-400">{formatDate(session.dateDebut)} - {formatDate(session.dateFin)}</p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/sessions/${id}/modifier`}
              className="inline-flex items-center gap-2 rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700"
            >
              <Edit className="h-4 w-4" /> Modifier
            </Link>
            <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4 mr-1" /> Supprimer
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info + Documents column */}
        <div className="lg:col-span-1 space-y-4">
          {/* Info card */}
          <div className="rounded-lg border bg-gray-800 p-4 space-y-4">
            <h2 className="font-semibold text-gray-100">Informations</h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-400">Formateur</p>
                <p className="font-medium">
                  {session.formateur ? (
                    <Link href={`/formateurs/${session.formateur.id}`} className="text-red-600 hover:underline">
                      {session.formateur.prenom} {session.formateur.nom}
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-orange-500">
                      <AlertTriangle className="h-3.5 w-3.5" /> Non assigné
                    </span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-gray-400">Lieu</p>
                <p className="font-medium">{session.lieu || <span className="text-gray-400">Non défini</span>}</p>
              </div>
              <div>
                <p className="text-gray-400">Capacité</p>
                <div>
                  <p className={cn("font-medium", capacityRatio >= 1 ? "text-red-600" : capacityRatio >= 0.8 ? "text-orange-600" : "text-green-600")}>
                    {session.inscriptions.length}/{session.capaciteMax} participants
                    <span className="text-gray-400 font-normal ml-1">
                      ({placesRestantes} place{placesRestantes !== 1 ? "s" : ""} restante{placesRestantes !== 1 ? "s" : ""})
                    </span>
                  </p>
                  {/* Progress bar */}
                  <div className="w-full h-2 bg-gray-200 rounded-full mt-1.5">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        capacityRatio >= 1 ? "bg-red-900/200" : capacityRatio >= 0.8 ? "bg-orange-900/200" : "bg-green-900/200"
                      )}
                      style={{ width: `${Math.min(100, capacityRatio * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
              <div>
                <p className="text-gray-400">Tarif / participant</p>
                <p className="font-medium">{formatCurrency(session.formation.tarif)}</p>
              </div>
              <div>
                <p className="text-gray-400">CA prévisionnel</p>
                <p className="font-semibold text-gray-100">{formatCurrency(session.formation.tarif * session.inscriptions.length)}</p>
              </div>
              <div>
                <p className="text-gray-400">Coût formateur</p>
                <p className="font-medium">
                  {session.coutFormateur != null
                    ? formatCurrency(session.coutFormateur)
                    : <span className="text-gray-500 italic">Non renseigné</span>
                  }
                </p>
              </div>
              {session.notes && (
                <div>
                  <p className="text-gray-400">Notes</p>
                  <p className="font-medium whitespace-pre-wrap">{session.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Documents PDF */}
          <div className="rounded-lg border bg-gray-800 p-4">
            <h2 className="font-semibold text-gray-100 mb-3">Documents</h2>
            <div className="space-y-2">
              <a
                href={`/api/pdf/convention/${id}`}
                target="_blank"
                className="flex items-center gap-2 rounded-md border border-gray-700 px-3 py-2 text-sm hover:bg-gray-700 transition-colors"
              >
                <FileText className="h-4 w-4 text-red-600" />
                <span className="flex-1 text-gray-300">Convention de formation</span>
                <Download className="h-4 w-4 text-gray-400" />
              </a>
              <a
                href={`/api/pdf/feuille-presence/${id}`}
                target="_blank"
                className="flex items-center gap-2 rounded-md border border-gray-700 px-3 py-2 text-sm hover:bg-gray-700 transition-colors"
              >
                <FileText className="h-4 w-4 text-green-600" />
                <span className="flex-1 text-gray-300">Feuille de présence</span>
                <Download className="h-4 w-4 text-gray-400" />
              </a>

              {session.inscriptions.length > 0 && (
                <>
                  <p className="text-xs text-gray-400 mt-3 mb-1 font-medium">Par stagiaire :</p>
                  {session.inscriptions.map((insc) => (
                    <div key={insc.id} className="flex items-center gap-1 text-xs">
                      <span className="text-gray-400 flex-1 truncate">{insc.contact.prenom} {insc.contact.nom}</span>
                      <a href={`/api/pdf/convocation/${id}/${insc.contact.id}`} target="_blank" className="text-red-600 hover:underline px-1" title="Télécharger convocation">
                        Convoc.
                      </a>
                      <button
                        onClick={() => handleSendConvocation(insc.contact.id)}
                        disabled={sendingEmail === insc.contact.id}
                        className="text-orange-500 hover:text-orange-400 px-1 disabled:opacity-50"
                        title="Envoyer convocation par email"
                      >
                        <Mail className="h-3.5 w-3.5 inline" />
                      </button>
                      <a href={`/api/pdf/attestation/${id}/${insc.contact.id}`} target="_blank" className="text-green-600 hover:underline px-1" title="Attestation">
                        Attest.
                      </a>
                    </div>
                  ))}
                  {emailMsg && (
                    <p className={`text-xs mt-1 ${emailMsg.includes("envoyée") ? "text-green-600" : "text-orange-600"}`}>
                      {emailMsg}
                    </p>
                  )}
                </>
              )}

              <div className="border-t pt-3 mt-3">
                <label className="flex items-center gap-2 rounded-md border border-dashed border-gray-600 px-3 py-2 text-sm text-gray-400 hover:bg-gray-700 cursor-pointer transition-colors">
                  <Upload className="h-4 w-4" />
                  {uploading ? "Upload en cours..." : "Uploader un document"}
                  <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                </label>
              </div>
            </div>
          </div>

          {/* Evaluations */}
          <div className="rounded-lg border bg-gray-800 p-4">
            <h2 className="font-semibold text-gray-100 mb-3 flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-purple-600" />
              Evaluations
            </h2>
            <div className="space-y-2">
              <button
                onClick={() => handleGenererEvaluations("satisfaction_chaud", "stagiaire")}
                disabled={evalLoading || session.inscriptions.length === 0}
                className="w-full flex items-center gap-2 rounded-md border border-gray-700 px-3 py-2 text-sm hover:bg-purple-900/20 transition-colors disabled:opacity-50"
              >
                <Send className="h-4 w-4 text-orange-500" />
                <span className="flex-1 text-left text-gray-300">Éval. stagiaires à chaud</span>
              </button>
              <button
                onClick={() => handleGenererEvaluations("satisfaction_froid", "stagiaire")}
                disabled={evalLoading || session.inscriptions.length === 0}
                className="w-full flex items-center gap-2 rounded-md border border-gray-700 px-3 py-2 text-sm hover:bg-purple-900/20 transition-colors disabled:opacity-50"
              >
                <Send className="h-4 w-4 text-blue-500" />
                <span className="flex-1 text-left text-gray-300">Éval. stagiaires à froid</span>
              </button>
              <button
                onClick={() => handleGenererEvaluations("satisfaction_client", "client")}
                disabled={evalLoading || session.inscriptions.length === 0}
                className="w-full flex items-center gap-2 rounded-md border border-gray-700 px-3 py-2 text-sm hover:bg-purple-900/20 transition-colors disabled:opacity-50"
              >
                <Send className="h-4 w-4 text-green-500" />
                <span className="flex-1 text-left text-gray-300">Éval. client/financeur</span>
              </button>
              <button
                onClick={() => handleGenererEvaluations("satisfaction_formateur", "formateur")}
                disabled={evalLoading || !session.formateur}
                className="w-full flex items-center gap-2 rounded-md border border-gray-700 px-3 py-2 text-sm hover:bg-purple-900/20 transition-colors disabled:opacity-50"
              >
                <Send className="h-4 w-4 text-yellow-500" />
                <span className="flex-1 text-left text-gray-300">Éval. formateur</span>
              </button>
              {evalMsg && (
                <p className={`text-xs ${evalMsg.includes("Erreur") ? "text-red-600" : "text-green-600"}`}>
                  {evalMsg}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Inscriptions */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border bg-gray-800 overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border-b">
              <h2 className="font-semibold text-gray-100 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Participants ({session.inscriptions.length}/{session.capaciteMax})
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={handleGenererLienInscription}
                  className="inline-flex items-center gap-1.5 rounded-md border border-gray-600 bg-gray-800 px-3 py-1.5 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors"
                  title="Générer un lien d'inscription public"
                >
                  <Link2 className="h-4 w-4" /> Lien public
                </button>
                <button
                  onClick={() => { fetchContacts(); setAddOpen(true); setContactSearch(""); }}
                  disabled={placesRestantes === 0}
                  className="inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <UserPlus className="h-4 w-4" /> Ajouter
                </button>
              </div>
            </div>

            {inscriptionLink && (
              <div className="px-4 py-2 bg-green-900/20 border-b text-sm flex items-center gap-2">
                <span className="text-green-400">Lien copié !</span>
                <code className="text-xs bg-gray-800 px-2 py-1 rounded border flex-1 truncate">{inscriptionLink}</code>
                <button
                  onClick={() => setQrOpen(true)}
                  className="shrink-0 inline-flex items-center gap-1 rounded-md border border-green-700 bg-green-900/30 px-2 py-1 text-xs font-medium text-green-400 hover:bg-green-900/50 transition-colors"
                >
                  QR Code
                </button>
              </div>
            )}

            {session.inscriptions.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <CalendarDays className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>Aucun participant inscrit</p>
                <p className="text-xs text-gray-400 mt-1">{placesRestantes} place{placesRestantes !== 1 ? "s" : ""} disponible{placesRestantes !== 1 ? "s" : ""}</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-900 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-400">Participant</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-400">Entreprise</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-400">Statut</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-400">Date inscription</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {session.inscriptions.map((insc) => {
                    const inscSt = INSCRIPTION_STATUTS[insc.statut as keyof typeof INSCRIPTION_STATUTS];
                    return (
                      <tr key={insc.id} className="border-b last:border-0 hover:bg-gray-700">
                        <td className="px-4 py-3">
                          <Link href={`/contacts/${insc.contact.id}`} className="font-medium text-red-600 hover:underline">
                            {insc.contact.prenom} {insc.contact.nom}
                          </Link>
                          <div className="text-gray-400 text-xs">{insc.contact.email}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-400">
                          {insc.contact.entreprise?.nom || <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={insc.statut}
                            onChange={(e) => handleUpdateStatutInscription(insc.id, e.target.value)}
                            className={cn(
                              "rounded-md border px-2 py-1 text-xs font-medium",
                              inscSt?.color || "bg-gray-700 text-gray-300"
                            )}
                          >
                            {Object.entries(INSCRIPTION_STATUTS).map(([v, s]) => (
                              <option key={v} value={v}>{s.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(insc.dateInscription)}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setRemoveConfirm({ id: insc.id, name: `${insc.contact.prenom} ${insc.contact.nom}` })}
                            className="text-gray-400 hover:text-red-600 transition-colors p-1 rounded hover:bg-red-900/20"
                            title="Supprimer l'inscription"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Delete session dialog */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Supprimer la session ?"
        description="Cette action supprimera la session et toutes les inscriptions associées."
        onConfirm={handleDelete}
        loading={deleting}
      />

      {/* Remove inscription confirmation */}
      <ConfirmDialog
        open={!!removeConfirm}
        onOpenChange={(open) => { if (!open) setRemoveConfirm(null); }}
        title="Retirer le participant ?"
        description={`Voulez-vous vraiment retirer ${removeConfirm?.name || ""} de cette session ? Cette action est irréversible.`}
        onConfirm={handleRemoveInscription}
        loading={removing}
      />

      {/* Add inscription dialog with search */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent onClose={() => setAddOpen(false)}>
          <DialogHeader>
            <DialogTitle>Ajouter un participant</DialogTitle>
          </DialogHeader>
          {addError && (
            <p className="text-sm text-red-600 bg-red-900/20 border border-red-700 rounded-md px-3 py-2">{addError}</p>
          )}
          <div className="py-2 space-y-3">
            {/* Search contacts */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher un contact..."
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <label className="text-sm font-medium text-gray-300 block">Sélectionner un contact</label>
            <select
              value={selectedContactId}
              onChange={(e) => setSelectedContactId(e.target.value)}
              className="w-full h-auto rounded-md border border-gray-600 bg-gray-800 px-3 text-sm"
              size={Math.min(8, Math.max(3, availableContacts.length + 1))}
            >
              <option value="">-- Choisir un contact --</option>
              {availableContacts.map((c) => (
                <option key={c.id} value={c.id}>{c.prenom} {c.nom} — {c.email}</option>
              ))}
            </select>
            {availableContacts.length === 0 && contacts.length > 0 && !contactSearch && (
              <p className="text-xs text-gray-400">Tous les contacts sont déjà inscrits.</p>
            )}
            {availableContacts.length === 0 && contactSearch && (
              <p className="text-xs text-gray-400">Aucun contact ne correspond à &quot;{contactSearch}&quot;</p>
            )}
            <p className="text-xs text-gray-400">{availableContacts.length} contact{availableContacts.length !== 1 ? "s" : ""} disponible{availableContacts.length !== 1 ? "s" : ""}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Annuler</Button>
            <Button onClick={handleAddInscription} disabled={!selectedContactId || adding}>
              {adding ? "Inscription..." : "Inscrire"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code modal */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent onClose={() => setQrOpen(false)}>
          <DialogHeader>
            <DialogTitle>QR Code d&apos;inscription</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(inscriptionLink)}`}
              alt="QR Code inscription"
              width={250}
              height={250}
              className="rounded-lg border border-gray-700"
            />
            <code className="text-xs bg-gray-900 px-3 py-2 rounded border border-gray-700 text-gray-300 max-w-full break-all text-center">
              {inscriptionLink}
            </code>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQrOpen(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
