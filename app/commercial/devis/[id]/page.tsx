"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit, Trash2, FileText, Receipt, Eye, Download, Mail, Copy, CalendarPlus } from "lucide-react";
import { StatutBadge } from "@/components/shared/StatutBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { DEVIS_STATUTS, FACTURE_STATUTS, SESSION_STATUTS, TVA_RATE } from "@/lib/constants";
import { formatDate, formatCurrency } from "@/lib/utils";

type LigneDevis = {
  id: string;
  designation: string;
  quantite: number;
  prixUnitaire: number;
  montant: number;
};

type Facture = {
  id: string;
  numero: string;
  statut: string;
  montantTTC: number;
  dateEcheance: string;
};

type Session = {
  id: string;
  dateDebut: string;
  dateFin: string;
  statut: string;
};

type Devis = {
  id: string;
  numero: string;
  objet: string;
  statut: string;
  montantHT: number;
  tauxTVA: number;
  montantTTC: number;
  dateValidite: string;
  notes: string | null;
  createdAt: string;
  entreprise: { id: string; nom: string } | null;
  contact: { id: string; nom: string; prenom: string; email: string } | null;
  lignes: LigneDevis[];
  factures: Facture[];
  sessions: Session[];
};

export default function DevisDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [devis, setDevis] = useState<Devis | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [generatingFacture, setGeneratingFacture] = useState(false);
  const [genError, setGenError] = useState("");
  const [updatingStatut, setUpdatingStatut] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [emailMsg, setEmailMsg] = useState("");
  const [duplicating, setDuplicating] = useState(false);

  const fetchDevis = useCallback(async () => {
    const res = await fetch(`/api/devis/${id}`);
    if (res.ok) setDevis(await res.json());
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchDevis();
  }, [fetchDevis]);

  const handleDelete = async () => {
    setDeleting(true);
    await fetch(`/api/devis/${id}`, { method: "DELETE" });
    router.push("/commercial");
  };

  const handleStatutChange = async (newStatut: string) => {
    setUpdatingStatut(true);
    const res = await fetch(`/api/devis/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut: newStatut }),
    });
    if (res.ok) {
      await fetchDevis();
    }
    setUpdatingStatut(false);
  };

  const handleDupliquer = async () => {
    setDuplicating(true);
    const res = await fetch(`/api/devis/${id}/dupliquer`, { method: "POST" });
    if (res.ok) {
      const copie = await res.json();
      router.push(`/commercial/devis/${copie.id}`);
    } else {
      setDuplicating(false);
    }
  };

  const handleSendEmail = async () => {
    setSending(true);
    const res = await fetch("/api/email/devis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ devisId: id }),
    });
    const data = await res.json();
    setEmailOpen(false);
    setSending(false);
    if (res.ok) {
      setEmailMsg(data.skipped ? "SMTP non configuré (voir .env)" : "Email envoyé avec succès !");
      fetchDevis();
    } else {
      setEmailMsg(data.error || "Erreur lors de l'envoi");
    }
    setTimeout(() => setEmailMsg(""), 4000);
  };

  const handleGenererFacture = async () => {
    setGeneratingFacture(true);
    setGenError("");
    const res = await fetch(`/api/devis/${id}/generer-facture`, { method: "POST" });
    if (res.ok) {
      const facture = await res.json();
      router.push(`/commercial/factures/${facture.id}`);
    } else {
      const data = await res.json();
      setGenError(data.error || "Erreur lors de la génération de la facture");
      setGeneratingFacture(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
      </div>
    );
  }

  if (!devis) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Devis non trouvé</p>
        <Link href="/commercial" className="mt-4 inline-flex items-center gap-1 text-red-600 hover:underline text-sm">
          <ArrowLeft className="h-4 w-4" /> Retour au commercial
        </Link>
      </div>
    );
  }

  const st = DEVIS_STATUTS[devis.statut as keyof typeof DEVIS_STATUTS];
  const montantTVA = devis.montantHT * (devis.tauxTVA / 100);
  const hasFacture = devis.factures.length > 0;
  const canGenererFacture = (devis.statut === "accepte" || devis.statut === "signe") && !hasFacture;
  const hasSession = devis.sessions && devis.sessions.length > 0;
  const canPlanifierSession = (devis.statut === "accepte" || devis.statut === "signe") && !hasSession;

  const nextStatuts = Object.keys(DEVIS_STATUTS).filter((k) => k !== devis.statut);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/commercial"
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-300 mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Retour au commercial
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-sm font-mono text-gray-400">{devis.numero}</span>
              {st && <StatutBadge label={st.label} color={st.color} />}
            </div>
            <h1 className="text-2xl font-bold text-gray-100 mb-1">{devis.objet}</h1>
            <p className="text-gray-400">
              {devis.entreprise ? (
                <Link href={`/entreprises/${devis.entreprise.id}`} className="text-red-600 hover:underline">
                  {devis.entreprise.nom}
                </Link>
              ) : devis.contact ? (
                <Link href={`/contacts/${devis.contact.id}`} className="text-red-600 hover:underline">
                  {devis.contact.prenom} {devis.contact.nom}
                </Link>
              ) : (
                "Aucun client"
              )}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2 flex-wrap justify-end">
            {devis.contact?.email && (devis.statut === "brouillon" || devis.statut === "envoye") && (
              <button
                onClick={() => setEmailOpen(true)}
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                <Mail className="h-4 w-4" /> Envoyer par email
              </button>
            )}
            <a
              href={`/api/pdf/devis/${id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors"
            >
              <Eye className="h-4 w-4" /> Prévisualiser PDF
            </a>
            <a
              href={`/api/pdf/devis/${id}`}
              download={`devis-${devis?.numero || id}.pdf`}
              className="inline-flex items-center gap-2 rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors"
            >
              <Download className="h-4 w-4" /> Télécharger PDF
            </a>
            <Link
              href={`/commercial/devis/${id}/modifier`}
              className="inline-flex items-center gap-2 rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors"
            >
              <Edit className="h-4 w-4" /> Modifier
            </Link>
            <button
              onClick={handleDupliquer}
              disabled={duplicating}
              className="inline-flex items-center gap-2 rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              <Copy className="h-4 w-4" /> {duplicating ? "Duplication..." : "Dupliquer"}
            </button>
            {canPlanifierSession && (
              <Link
                href={`/sessions/nouveau?devisId=${id}`}
                className="inline-flex items-center gap-2 rounded-md bg-green-700 px-3 py-2 text-sm font-medium text-white hover:bg-green-600 transition-colors"
              >
                <CalendarPlus className="h-4 w-4" /> Planifier une session
              </Link>
            )}
            <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4 mr-1" /> Supprimer
            </Button>
          </div>
          {emailMsg && (
            <p className={`text-xs ${emailMsg.includes("envoyé") ? "text-green-500" : emailMsg.includes("SMTP") ? "text-amber-500" : "text-red-500"}`}>
              {emailMsg}
            </p>
          )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Infos + Actions */}
        <div className="col-span-1 space-y-4">
          {/* Info card */}
          <div className="rounded-lg border bg-gray-800 p-4 space-y-3">
            <h2 className="font-semibold text-gray-100">Informations</h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-400">Date de validité</p>
                <p className="font-medium">{formatDate(devis.dateValidite)}</p>
              </div>
              <div>
                <p className="text-gray-400">Créé le</p>
                <p className="font-medium">{formatDate(devis.createdAt)}</p>
              </div>
              {devis.entreprise && (
                <div>
                  <p className="text-gray-400">Entreprise</p>
                  <Link href={`/entreprises/${devis.entreprise.id}`} className="font-medium text-red-600 hover:underline">
                    {devis.entreprise.nom}
                  </Link>
                </div>
              )}
              {devis.contact && (
                <div>
                  <p className="text-gray-400">Contact</p>
                  <Link href={`/contacts/${devis.contact.id}`} className="font-medium text-red-600 hover:underline">
                    {devis.contact.prenom} {devis.contact.nom}
                  </Link>
                  <p className="text-gray-400 text-xs">{devis.contact.email}</p>
                </div>
              )}
              {devis.notes && (
                <div>
                  <p className="text-gray-400">Notes</p>
                  <p className="font-medium whitespace-pre-wrap">{devis.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Actions statut */}
          <div className="rounded-lg border bg-gray-800 p-4 space-y-3">
            <h2 className="font-semibold text-gray-100">Changer le statut</h2>
            <div className="space-y-2">
              {nextStatuts.map((key) => {
                const s = DEVIS_STATUTS[key as keyof typeof DEVIS_STATUTS];
                return (
                  <button
                    key={key}
                    onClick={() => handleStatutChange(key)}
                    disabled={updatingStatut}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium border transition-colors hover:opacity-80 disabled:opacity-50 ${s.color}`}
                  >
                    Marquer comme {s.label.toLowerCase()}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Session planifiée */}
          {(hasSession || canPlanifierSession) && (
            <div className="rounded-lg border bg-gray-800 p-4 space-y-3">
              <h2 className="font-semibold text-gray-100">Session de formation</h2>
              {hasSession ? (
                <div className="space-y-2">
                  {devis.sessions.map((s) => {
                    const sst = SESSION_STATUTS[s.statut as keyof typeof SESSION_STATUTS];
                    return (
                      <Link
                        key={s.id}
                        href={`/sessions/${s.id}`}
                        className="flex items-center justify-between p-2 rounded-md border border-gray-700 hover:bg-gray-700 transition-colors"
                      >
                        <div>
                          <p className="text-sm font-medium">{formatDate(s.dateDebut)}</p>
                          <p className="text-xs text-gray-400">→ {formatDate(s.dateFin)}</p>
                        </div>
                        {sst && <StatutBadge label={sst.label} color={sst.color} />}
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <Link
                  href={`/sessions/nouveau?devisId=${id}`}
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-green-700 px-3 py-2 text-sm font-medium text-white hover:bg-green-600 transition-colors"
                >
                  <CalendarPlus className="h-4 w-4" /> Planifier une session
                </Link>
              )}
            </div>
          )}

          {/* Générer facture */}
          {(canGenererFacture || hasFacture) && (
            <div className="rounded-lg border bg-gray-800 p-4 space-y-3">
              <h2 className="font-semibold text-gray-100">Facturation</h2>
              {genError && (
                <p className="text-sm text-red-600">{genError}</p>
              )}
              {hasFacture ? (
                <div className="space-y-2">
                  {devis.factures.map((f) => {
                    const fst = FACTURE_STATUTS[f.statut as keyof typeof FACTURE_STATUTS];
                    return (
                      <Link
                        key={f.id}
                        href={`/commercial/factures/${f.id}`}
                        className="flex items-center justify-between p-2 rounded-md border border-gray-700 hover:bg-gray-700 transition-colors"
                      >
                        <div>
                          <p className="text-sm font-medium font-mono">{f.numero}</p>
                          <p className="text-xs text-gray-400">{formatCurrency(f.montantTTC)}</p>
                        </div>
                        {fst && <StatutBadge label={fst.label} color={fst.color} />}
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <Button
                  onClick={handleGenererFacture}
                  disabled={generatingFacture}
                  className="w-full"
                >
                  <Receipt className="h-4 w-4 mr-2" />
                  {generatingFacture ? "Génération..." : "Générer une facture"}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Lignes devis */}
        <div className="col-span-2">
          <div className="rounded-lg border bg-gray-800 overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="font-semibold text-gray-100">Lignes du devis</h2>
            </div>
            {devis.lignes.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>Aucune ligne</p>
              </div>
            ) : (
              <>
                <table className="w-full text-sm">
                  <thead className="bg-gray-900 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-400">Désignation</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-400">Qté</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-400">Prix unitaire HT</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-400">Montant HT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {devis.lignes.map((ligne) => (
                      <tr key={ligne.id} className="border-b last:border-0">
                        <td className="px-4 py-3 text-gray-200">{ligne.designation}</td>
                        <td className="px-4 py-3 text-right text-gray-400">{ligne.quantite}</td>
                        <td className="px-4 py-3 text-right text-gray-400">
                          {formatCurrency(ligne.prixUnitaire)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-200">
                          {formatCurrency(ligne.montant)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totaux */}
                <div className="p-4 border-t bg-gray-900">
                  <div className="flex flex-col items-end gap-1 text-sm">
                    <div className="flex gap-8">
                      <span className="text-gray-400">Montant HT</span>
                      <span className="font-medium text-gray-200 w-28 text-right">
                        {formatCurrency(devis.montantHT)}
                      </span>
                    </div>
                    <div className="flex gap-8">
                      <span className="text-gray-400">TVA ({devis.tauxTVA}%)</span>
                      <span className="font-medium text-gray-200 w-28 text-right">
                        {formatCurrency(montantTVA)}
                      </span>
                    </div>
                    <div className="flex gap-8 pt-1 border-t border-gray-700 mt-1">
                      <span className="font-semibold text-gray-100">Montant TTC</span>
                      <span className="font-bold text-lg text-gray-100 w-28 text-right">
                        {formatCurrency(devis.montantTTC)}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={emailOpen}
        onOpenChange={setEmailOpen}
        title={`Envoyer le devis ${devis.numero} ?`}
        description={`Un email sera envoyé à ${devis.contact?.email}. Le statut passera automatiquement à "Envoyé".`}
        onConfirm={handleSendEmail}
        loading={sending}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Supprimer le devis ?"
        description="Cette action est irréversible. Le devis sera définitivement supprimé."
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
