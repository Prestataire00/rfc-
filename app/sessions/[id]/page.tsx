"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UserPlus, Trash2, Edit, CalendarDays, Download, FileText, Upload, Mail, Send, ClipboardList, Link2, Users, AlertTriangle, QrCode, Zap, Accessibility, BadgeCheck, CheckCircle2 } from "lucide-react";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { StatutBadge } from "@/components/shared/StatutBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { SESSION_STATUTS, INSCRIPTION_STATUTS, DEVIS_STATUTS } from "@/lib/constants";
import { formatDate, formatCurrency, cn } from "@/lib/utils";
import { EmargementGrid } from "@/components/emargement/EmargementGrid";
import { notify } from "@/lib/toast";
import { StatusPipeline } from "@/components/shared/StatusPipeline";
import type { Contact, Session, BesoinClient, BesoinStagiaire } from "./types";
import { AddInscriptionDialog } from "./AddInscriptionDialog";
import { QRCodeDialog } from "./QRCodeDialog";
import { PasseportPreventionDialog } from "./PasseportPreventionDialog";
import { FichesBesoinSection } from "./FichesBesoinSection";

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
  const [confirmTerminee, setConfirmTerminee] = useState(false);
  const [pendingStatut, setPendingStatut] = useState<string | null>(null);
  const [presenceMap, setPresenceMap] = useState<Record<string, { matin: boolean; apresMidi: boolean }>>({});
  const [besoinsClient, setBesoinsClient] = useState<BesoinClient[]>([]);
  const [besoinsStagiaire, setBesoinsStagiaire] = useState<BesoinStagiaire[]>([]);
  const [sendingFiches, setSendingFiches] = useState(false);
  const [fichesMsg, setFichesMsg] = useState("");
  const [passeportOpen, setPasseportOpen] = useState(false);
  const [automations, setAutomations] = useState<Array<{
    type: string;
    label: string;
    description: string | null;
    ordre: number;
    enabled: boolean;
    relativeTo: string;
    offsetDays: number;
    offsetHours: number;
    timeOfDay: string | null;
    executedAt: string | null;
    executionLog: string | null;
    isOverride: boolean;
  }>>([]);
  const [autoSaving, setAutoSaving] = useState<string | null>(null);
  const [declarationChecked, setDeclarationChecked] = useState(false);

  const fetchSession = useCallback(async () => {
    const res = await fetch(`/api/sessions/${id}`);
    if (res.ok) setSession(await res.json());
    setLoading(false);
  }, [id]);

  const fetchPresence = useCallback(async () => {
    const res = await fetch(`/api/sessions/${id}/presence`);
    if (!res.ok) return;
    const data: Array<{ contactId: string; date: string; matin: boolean; apresMidi: boolean }> = await res.json();
    const map: Record<string, { matin: boolean; apresMidi: boolean }> = {};
    for (const fp of data) {
      const dateStr = fp.date.split("T")[0];
      map[`${fp.contactId}_${dateStr}`] = { matin: fp.matin, apresMidi: fp.apresMidi };
    }
    setPresenceMap(map);
  }, [id]);

  const fetchBesoins = useCallback(async () => {
    const [rc, rs] = await Promise.all([
      fetch(`/api/besoin-client?sessionId=${id}`).then((r) => r.ok ? r.json() : []),
      fetch(`/api/besoin-stagiaire?sessionId=${id}`).then((r) => r.ok ? r.json() : []),
    ]);
    setBesoinsClient(Array.isArray(rc) ? rc : []);
    setBesoinsStagiaire(Array.isArray(rs) ? rs : []);
  }, [id]);

  const fetchAutomations = useCallback(async () => {
    const r = await fetch(`/api/sessions/${id}/automations`);
    if (r.ok) setAutomations(await r.json());
  }, [id]);

  const saveAutomation = async (type: string, patch: Partial<{ enabled: boolean; relativeTo: string; offsetDays: number; offsetHours: number; timeOfDay: string | null }>) => {
    setAutoSaving(type);
    const current = automations.find((a) => a.type === type);
    if (!current) { setAutoSaving(null); return; }
    const merged = {
      enabled: current.enabled,
      relativeTo: current.relativeTo,
      offsetDays: current.offsetDays,
      offsetHours: current.offsetHours,
      timeOfDay: current.timeOfDay,
      canalEmail: true,
      ...patch,
    };
    setAutomations((prev) => prev.map((a) => a.type === type ? { ...a, ...patch, isOverride: true } : a));
    await fetch(`/api/sessions/${id}/automations/${type}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(merged),
    });
    setAutoSaving(null);
  };

  const resetAutomation = async (type: string) => {
    setAutoSaving(type);
    await fetch(`/api/sessions/${id}/automations/${type}`, { method: "DELETE" });
    await fetchAutomations();
    setAutoSaving(null);
  };

  useEffect(() => { fetchSession(); fetchPresence(); fetchBesoins(); fetchAutomations(); }, [fetchSession, fetchPresence, fetchBesoins, fetchAutomations]);

  const fetchContacts = async () => {
    const res = await fetch("/api/contacts");
    if (res.ok) setContacts(await res.json());
  };

  const handleUpdateStatut = (newStatut: string) => {
    // Blocage Passeport Prevention pour formations certifiantes
    if (newStatut === "terminee" && session?.formation.certifiante && !session?.declarationPasseportPrevention) {
      setDeclarationChecked(false);
      setPasseportOpen(true);
      return;
    }
    if (newStatut === "terminee") {
      setPendingStatut(newStatut);
      setConfirmTerminee(true);
    } else {
      applyStatut(newStatut);
    }
  };

  const confirmPasseportAndFinalize = async () => {
    if (!declarationChecked) return;
    await fetch(`/api/sessions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        declarationPasseportPrevention: true,
        datePasseportPrevention: new Date().toISOString(),
      }),
    });
    setPasseportOpen(false);
    setPendingStatut("terminee");
    setConfirmTerminee(true);
  };

  const handleSendFichesBesoin = async (override?: { destinataireEmail?: string; destinataireNom?: string }) => {
    setSendingFiches(true);
    setFichesMsg("");
    try {
      const res = await fetch(`/api/sessions/${id}/envoyer-fiches-besoin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(override || {}),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setFichesMsg(typeof d.error === "string" ? d.error : "Erreur envoi");
      } else {
        const data = await res.json();
        const nbStagiaires = data.fichesStagiaires?.filter((f: { envoye: boolean }) => f.envoye).length || 0;
        const parts: string[] = [];
        if (data.ficheClient) {
          parts.push(data.ficheClient.envoye ? "Fiche client envoyee" : "Fiche client creee");
        }
        parts.push(`${nbStagiaires} fiche(s) stagiaire envoyee(s)`);
        if (Array.isArray(data.warnings) && data.warnings.length > 0) {
          parts.push(...data.warnings);
        }
        setFichesMsg(parts.join(" · "));
        fetchBesoins();
      }
    } catch {
      setFichesMsg("Erreur reseau");
    }
    setSendingFiches(false);
    setTimeout(() => setFichesMsg(""), 10000);
  };

  const handleResendFiche = async (type: "client" | "stagiaire", ficheId: string) => {
    await fetch(`/api/besoin-${type}/${ficheId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "envoyer" }),
    });
    fetchBesoins();
  };

  const applyStatut = async (newStatut: string) => {
    await fetch(`/api/sessions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut: newStatut }),
    });
    fetchSession();
  };

  const handleDelete = async () => {
    setDeleting(true);
    await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    notify.success("Session supprimee");
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
      notify.success("Inscription ajoutee");
      fetchSession();
    } else {
      const data = await res.json();
      setAddError(data.error || "Erreur lors de l'inscription");
      notify.error("Erreur", data.error || "Inscription impossible");
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
    notify.success("Inscription retiree");
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

  const handleOuvrirQR = async () => {
    if (!inscriptionLink) {
      const res = await fetch(`/api/sessions/${id}/lien-inscription`, { method: "POST" });
      const data = await res.json();
      if (data.lien) setInscriptionLink(data.lien);
    }
    setQrOpen(true);
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
    if (data.skipped) { setEmailMsg("SMTP non configure"); notify.info("SMTP non configure"); }
    else if (res.ok) { setEmailMsg("Convocation envoyee !"); notify.success("Convocation envoyee"); }
    else { setEmailMsg(data.error || "Erreur d'envoi"); notify.error("Erreur envoi", data.error); }
    setSendingEmail(null);
    setTimeout(() => setEmailMsg(""), 3000);
  };

  const handleTogglePresence = async (contactId: string, jour: Date, field: "matin" | "apresMidi", value: boolean) => {
    const dateStr = jour.toISOString().split("T")[0];
    const key = `${contactId}_${dateStr}`;
    const current = presenceMap[key] || { matin: false, apresMidi: false };
    const updated = { ...current, [field]: value };
    // Mise à jour optimiste
    setPresenceMap((prev) => ({ ...prev, [key]: updated }));
    await fetch(`/api/sessions/${id}/presence`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId, date: dateStr, ...updated }),
    });
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

  // Jours ouvrés entre dateDebut et dateFin (lundi–vendredi, UTC)
  const joursOuvres = useMemo(() => {
    if (!session) return [];
    const jours: Date[] = [];
    const debut = new Date(session.dateDebut);
    const fin = new Date(session.dateFin);
    const current = new Date(Date.UTC(debut.getUTCFullYear(), debut.getUTCMonth(), debut.getUTCDate()));
    const end = new Date(Date.UTC(fin.getUTCFullYear(), fin.getUTCMonth(), fin.getUTCDate()));
    while (current <= end) {
      if (current.getUTCDay() !== 0 && current.getUTCDay() !== 6) {
        jours.push(new Date(current));
      }
      current.setUTCDate(current.getUTCDate() + 1);
    }
    return jours;
  }, [session]);

  const JOURS_LABEL = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  const formatJour = (date: Date) =>
    `${JOURS_LABEL[date.getUTCDay()]} ${String(date.getUTCDate()).padStart(2, "0")}/${String(date.getUTCMonth() + 1).padStart(2, "0")}`;

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
        <Breadcrumb items={[
          { label: "Sessions", href: "/sessions" },
          { label: session.formation.titre },
        ]} />
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-100">
                <Link href={`/formations/${session.formation.id}`} className="hover:text-red-600">
                  {session.formation.titre}
                </Link>
              </h1>
              <select
                value={session.statut}
                onChange={(e) => handleUpdateStatut(e.target.value)}
                className={cn(
                  "rounded-md border px-2 py-1 text-xs font-medium cursor-pointer",
                  st?.color || "bg-gray-700 text-gray-300 border-gray-600"
                )}
              >
                {Object.entries(SESSION_STATUTS).map(([v, s]) => (
                  <option key={v} value={v}>{s.label}</option>
                ))}
              </select>
            </div>
            <p className="text-gray-400">{formatDate(session.dateDebut)} - {formatDate(session.dateFin)}</p>
            <div className="mt-3">
              <StatusPipeline
                steps={[
                  { value: "planifiee", label: "Planifiee" },
                  { value: "confirmee", label: "Confirmee" },
                  { value: "en_cours", label: "En cours" },
                  { value: "terminee", label: "Terminee" },
                  { value: "annulee", label: "Annulee" },
                ]}
                currentStatus={session.statut}
                lostStatus="annulee"
                successStatus="terminee"
              />
            </div>
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

      {/* Alertes contextuelles (RQTH, secteur SST, express) */}
      {(() => {
        const hasRQTH = besoinsStagiaire.some((b) => b.estRQTH);
        const secteurRepondu = besoinsClient.find((b) => b.secteurActivite)?.secteurActivite;
        const isSST = session.formation.categorie?.toLowerCase().includes("sst") || session.formation.categorie?.toLowerCase().includes("secouriste");
        const hasAny = hasRQTH || (isSST && secteurRepondu) || session.modeExpress;
        if (!hasAny) return null;
        return (
          <div className="mb-6 space-y-2">
            {session.modeExpress && (
              <div className="flex items-center gap-2 rounded-md border border-amber-700 bg-amber-900/20 px-4 py-2.5 text-sm text-amber-300">
                <Zap className="h-4 w-4" />
                <span>Session express : les automatisations temporelles sont desactivees, les fiches besoin sont marquees optionnelles.</span>
              </div>
            )}
            {hasRQTH && (
              <div className="flex items-center gap-2 rounded-md border border-orange-700 bg-orange-900/20 px-4 py-2.5 text-sm text-orange-300">
                <Accessibility className="h-4 w-4" />
                <span><strong>Stagiaires RQTH</strong> identifies. Prevoir les amenagements pedagogiques dans la convention.</span>
              </div>
            )}
            {isSST && secteurRepondu && (
              <div className="flex items-center gap-2 rounded-md border border-blue-700 bg-blue-900/20 px-4 py-2.5 text-sm text-blue-300">
                <ClipboardList className="h-4 w-4" />
                <span>Formation SST : adapter les cas pratiques au secteur <strong>{secteurRepondu.replace(/_/g, " ")}</strong>.</span>
              </div>
            )}
          </div>
        );
      })()}

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

          {/* Fiches besoin (client + stagiaires) */}
          <FichesBesoinSection
            besoinsClient={besoinsClient}
            besoinsStagiaire={besoinsStagiaire}
            sendingFiches={sendingFiches}
            fichesMsg={fichesMsg}
            inscriptionsCount={session.inscriptions.length}
            onSendFiches={() => handleSendFichesBesoin()}
            onResendFiche={handleResendFiche}
          />

          {/* Automatisations */}
          <div className="rounded-lg border bg-gray-800 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-100 flex items-center gap-2">
                <Zap className="h-4 w-4 text-red-500" /> Automatisations
              </h2>
              <Link href="/parametres/automations" className="text-xs text-red-500 hover:underline">Defauts</Link>
            </div>
            {automations.length === 0 ? (
              <p className="text-xs text-gray-500 italic">Chargement...</p>
            ) : (
              <div className="space-y-2">
                {automations.map((a) => {
                  const done = !!a.executedAt;
                  const rel = a.relativeTo === "dateDebut" ? "debut"
                    : a.relativeTo === "dateFin" ? "fin"
                    : a.relativeTo === "inscription" ? "insc."
                    : "creation";
                  const offsetLabel = a.offsetDays === 0 && a.offsetHours === 0
                    ? `Jour ${rel}`
                    : a.offsetDays !== 0
                      ? `${a.offsetDays < 0 ? "J-" : "J+"}${Math.abs(a.offsetDays)} ${rel}`
                      : `${Math.abs(a.offsetHours)}h ${a.offsetHours < 0 ? "avant" : "apres"} ${rel}`;
                  return (
                    <details key={a.type} className="group rounded-md border border-gray-700 bg-gray-900/50">
                      <summary className="flex items-center gap-2 px-3 py-2 cursor-pointer text-xs list-none">
                        <input
                          type="checkbox"
                          checked={a.enabled}
                          onChange={(e) => { e.stopPropagation(); saveAutomation(a.type, { enabled: e.target.checked }); }}
                          onClick={(e) => e.stopPropagation()}
                          className="h-3.5 w-3.5 shrink-0"
                        />
                        <span className={`flex-1 min-w-0 truncate ${a.enabled ? "text-gray-200" : "text-gray-500 line-through"}`}>
                          {a.label}
                        </span>
                        <span className={`shrink-0 text-[10px] ${done ? "text-emerald-400" : "text-gray-500"}`}>
                          {done ? "✓ Fait" : offsetLabel}
                        </span>
                        {a.isOverride && !done && (
                          <span className="shrink-0 text-[9px] text-amber-400" title="Surcharge pour cette session">●</span>
                        )}
                      </summary>
                      <div className="px-3 pb-3 pt-1 border-t border-gray-700 space-y-2">
                        {a.description && <p className="text-[10px] text-gray-500">{a.description}</p>}
                        <div className="grid grid-cols-4 gap-1.5">
                          <select
                            value={a.relativeTo}
                            onChange={(e) => saveAutomation(a.type, { relativeTo: e.target.value })}
                            className="h-7 rounded border border-gray-600 bg-gray-900 text-[10px] text-gray-200 px-1"
                          >
                            <option value="dateDebut">Debut</option>
                            <option value="dateFin">Fin</option>
                            <option value="inscription">Inscription</option>
                            <option value="creation_session">Creation</option>
                          </select>
                          <input
                            type="number"
                            value={a.offsetDays}
                            onChange={(e) => saveAutomation(a.type, { offsetDays: parseInt(e.target.value) || 0 })}
                            placeholder="Jours"
                            title="Jours (negatif=avant)"
                            className="h-7 rounded border border-gray-600 bg-gray-900 text-[10px] text-gray-200 px-1"
                          />
                          <input
                            type="number"
                            value={a.offsetHours}
                            onChange={(e) => saveAutomation(a.type, { offsetHours: parseInt(e.target.value) || 0 })}
                            placeholder="Heures"
                            title="Heures (negatif=avant)"
                            className="h-7 rounded border border-gray-600 bg-gray-900 text-[10px] text-gray-200 px-1"
                          />
                          <input
                            type="time"
                            value={a.timeOfDay || ""}
                            onChange={(e) => saveAutomation(a.type, { timeOfDay: e.target.value || null })}
                            className="h-7 rounded border border-gray-600 bg-gray-900 text-[10px] text-gray-200 px-1"
                          />
                        </div>
                        {done && (
                          <div className="text-[10px] text-gray-400 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                            Execute le {formatDate(a.executedAt!)} — {a.executionLog || "OK"}
                          </div>
                        )}
                        {a.isOverride && (
                          <button
                            onClick={() => resetAutomation(a.type)}
                            disabled={autoSaving === a.type}
                            className="text-[10px] text-amber-400 hover:underline"
                          >
                            ← Revenir au defaut global
                          </button>
                        )}
                      </div>
                    </details>
                  );
                })}
              </div>
            )}
          </div>

          {/* Passeport Prevention (formations certifiantes uniquement) */}
          {session.formation.certifiante && (
            <div className="rounded-lg border bg-gray-800 p-4 space-y-2">
              <h2 className="font-semibold text-gray-100 flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-amber-500" /> Passeport Prevention
              </h2>
              <p className="text-xs text-gray-400">Obligation legale (decret 2022-1434). Requis avant archivage de la session.</p>
              {session.declarationPasseportPrevention ? (
                <div className="flex items-center gap-2 rounded-md bg-emerald-900/20 border border-emerald-700 p-2 text-xs text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                  Declare{session.datePasseportPrevention ? ` le ${formatDate(session.datePasseportPrevention)}` : ""}
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-md bg-amber-900/20 border border-amber-700 p-2 text-xs text-amber-300">
                  <AlertTriangle className="h-4 w-4" />
                  Non declare — bloquera le passage en &quot;terminee&quot;
                </div>
              )}
            </div>
          )}

          {/* Devis associé */}
          {session.devis && (
            <div className="rounded-lg border bg-gray-800 p-4 space-y-2">
              <h2 className="font-semibold text-gray-100">Devis associé</h2>
              {(() => {
                const dst = DEVIS_STATUTS[session.devis.statut as keyof typeof DEVIS_STATUTS];
                return (
                  <Link
                    href={`/commercial/devis/${session.devis.id}`}
                    className="flex items-center justify-between p-2 rounded-md border border-gray-700 hover:bg-gray-700 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-mono font-medium">{session.devis.numero}</p>
                      <p className="text-xs text-gray-400 truncate max-w-[150px]">{session.devis.objet}</p>
                      <p className="text-xs text-gray-400">{formatCurrency(session.devis.montantTTC)}</p>
                    </div>
                    {dst && <StatutBadge label={dst.label} color={dst.color} />}
                  </Link>
                );
              })()}
            </div>
          )}

          {/* Documents PDF */}
          <div className="rounded-lg border bg-gray-800 p-4">
            <h2 className="font-semibold text-gray-100 mb-3">Documents</h2>
            <div className="space-y-2">
              {(() => {
                // Entreprises distinctes parmi les inscrits
                const entreprisesMap = new Map<string, { id: string; nom: string }>();
                for (const insc of session.inscriptions) {
                  const e = insc.contact.entreprise;
                  if (e && !entreprisesMap.has(e.id)) entreprisesMap.set(e.id, e);
                }
                const entreprises = Array.from(entreprisesMap.values());

                if (entreprises.length <= 1) {
                  // Cas simple : 0 ou 1 entreprise
                  const qs = entreprises.length === 1 ? `?entrepriseId=${entreprises[0].id}` : "";
                  return (
                    <a
                      href={`/api/pdf/convention/${id}${qs}`}
                      target="_blank"
                      className="flex items-center gap-2 rounded-md border border-gray-700 px-3 py-2 text-sm hover:bg-gray-700 transition-colors"
                    >
                      <FileText className="h-4 w-4 text-red-600" />
                      <span className="flex-1 text-gray-300">Convention de formation</span>
                      <Download className="h-4 w-4 text-gray-400" />
                    </a>
                  );
                }

                // Cas multi-entreprises : un lien par entreprise
                return (
                  <div className="space-y-1">
                    <p className="text-xs text-gray-400 font-medium">Convention par entreprise :</p>
                    {entreprises.map((e) => (
                      <a
                        key={e.id}
                        href={`/api/pdf/convention/${id}?entrepriseId=${e.id}`}
                        target="_blank"
                        className="flex items-center gap-2 rounded-md border border-gray-700 px-3 py-2 text-sm hover:bg-gray-700 transition-colors"
                      >
                        <FileText className="h-4 w-4 text-red-600" />
                        <span className="flex-1 text-gray-300 truncate">Convention — {e.nom}</span>
                        <Download className="h-4 w-4 text-gray-400" />
                      </a>
                    ))}
                  </div>
                );
              })()}
              <a
                href={`/api/pdf/feuille-presence/${id}`}
                target="_blank"
                className="flex items-center gap-2 rounded-md border border-gray-700 px-3 py-2 text-sm hover:bg-gray-700 transition-colors"
              >
                <FileText className="h-4 w-4 text-green-600" />
                <span className="flex-1 text-gray-300">Feuille de présence</span>
                <Download className="h-4 w-4 text-gray-400" />
              </a>

              {session.statut === "terminee" &&
                session.inscriptions.some((i) => i.statut === "presente") && (
                <a
                  href={`/api/pdf/attestation/${id}`}
                  target="_blank"
                  className="flex items-center gap-2 rounded-md border border-gray-700 bg-green-900/20 px-3 py-2 text-sm hover:bg-green-900/40 transition-colors"
                >
                  <FileText className="h-4 w-4 text-green-500" />
                  <span className="flex-1 text-green-400 font-medium">Toutes les attestations (PDF)</span>
                  <Download className="h-4 w-4 text-green-500" />
                </a>
              )}

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
                  onClick={handleOuvrirQR}
                  className="inline-flex items-center gap-1.5 rounded-md border border-purple-700 bg-purple-900/30 px-3 py-1.5 text-sm font-medium text-purple-300 hover:bg-purple-900/50 transition-colors"
                  title="Afficher le QR Code d'inscription"
                >
                  <QrCode className="h-4 w-4" /> QR Code
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

      {/* ── Feuille de présence / Emargement V2 ─────────────────────────── */}
      {["confirmee", "en_cours", "terminee"].includes(session.statut) &&
        session.inscriptions.length > 0 && (
          <div className="mt-6 rounded-lg border border-gray-700 bg-gray-800 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h2 className="font-semibold text-gray-100 flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-green-500" />
                Emargement
              </h2>
            </div>
            <div className="p-4">
              <EmargementGrid
                sessionId={session.id}
                dateDebut={session.dateDebut}
                dateFin={session.dateFin}
                inscriptions={session.inscriptions}
                formationTitre={session.formation.titre}
              />
            </div>
          </div>
        )}

      {/* Confirm passage à "Terminée" */}
      <ConfirmDialog
        open={confirmTerminee}
        onOpenChange={(open) => { if (!open) { setConfirmTerminee(false); setPendingStatut(null); } }}
        title="Marquer la session comme terminée ?"
        description="Ce changement de statut enverra automatiquement le questionnaire d'évaluation à chaud à tous les participants confirmés. Cette action est irréversible."
        onConfirm={async () => {
          if (pendingStatut) await applyStatut(pendingStatut);
          setConfirmTerminee(false);
          setPendingStatut(null);
        }}
      />

      {/* Blocage Passeport Prevention */}
      <PasseportPreventionDialog
        open={passeportOpen}
        onOpenChange={setPasseportOpen}
        declarationChecked={declarationChecked}
        setDeclarationChecked={setDeclarationChecked}
        onConfirm={confirmPasseportAndFinalize}
      />

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
      <AddInscriptionDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        availableContacts={availableContacts}
        selectedContactId={selectedContactId}
        setSelectedContactId={setSelectedContactId}
        contactSearch={contactSearch}
        setContactSearch={setContactSearch}
        adding={adding}
        addError={addError}
        onSubmit={handleAddInscription}
        contactsCount={contacts.length}
      />

      {/* QR Code modal */}
      <QRCodeDialog
        open={qrOpen}
        onOpenChange={setQrOpen}
        inscriptionLink={inscriptionLink}
        sessionId={id}
        formationTitre={session?.formation.titre}
        dateDebut={session?.dateDebut}
        dateFin={session?.dateFin}
      />
    </div>
  );
}
