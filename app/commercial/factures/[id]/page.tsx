"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trash2, CheckCircle, FileText, Eye, Download, Plus, X, Mail } from "lucide-react";
import { StatutBadge } from "@/components/shared/StatutBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { FACTURE_STATUTS } from "@/lib/constants";
import { formatDate, formatCurrency } from "@/lib/utils";

type LigneDevis = {
  id: string;
  designation: string;
  quantite: number;
  prixUnitaire: number;
  montant: number;
};

type PaiementLigne = { mode: string; montant: number };

type Facture = {
  id: string;
  numero: string;
  statut: string;
  montantHT: number;
  tauxTVA: number;
  montantTTC: number;
  dateEmission: string;
  dateEcheance: string;
  datePaiement: string | null;
  paiements: PaiementLigne[] | null;
  notes: string | null;
  entreprise: { id: string; nom: string } | null;
  devis: { id: string; numero: string; objet: string; lignes: LigneDevis[] } | null;
};

const MODES = [
  { value: "virement", label: "🏦 Virement bancaire" },
  { value: "cpf",      label: "🎓 CPF" },
  { value: "opco",     label: "🏢 OPCO" },
  { value: "carte",    label: "💳 Carte bancaire" },
  { value: "especes",  label: "💶 Espèces" },
];

const MODES_LABELS: Record<string, string> = {
  virement: "🏦 Virement bancaire",
  cpf:      "🎓 CPF",
  opco:     "🏢 OPCO",
  carte:    "💳 Carte bancaire",
  especes:  "💶 Espèces",
};

export default function FactureDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [facture, setFacture] = useState<Facture | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [updatingStatut, setUpdatingStatut] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [emailMsg, setEmailMsg] = useState("");
  const [paiements, setPaiements] = useState<PaiementLigne[]>([{ mode: "", montant: 0 }]);

  const fetchFacture = useCallback(async () => {
    const res = await fetch(`/api/factures/${id}`);
    if (res.ok) setFacture(await res.json());
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchFacture(); }, [fetchFacture]);

  const handleDelete = async () => {
    setDeleting(true);
    await fetch(`/api/factures/${id}`, { method: "DELETE" });
    router.push("/commercial");
  };

  const handleStatutChange = async (newStatut: string) => {
    setUpdatingStatut(true);
    const res = await fetch(`/api/factures/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut: newStatut }),
    });
    if (res.ok) await fetchFacture();
    setUpdatingStatut(false);
  };

  const handleMarkAsPaid = async () => {
    const validPaiements = paiements.filter((p) => p.mode && p.montant > 0);
    if (validPaiements.length === 0) return;
    setMarkingPaid(true);
    const today = new Date().toISOString().split("T")[0];
    const res = await fetch(`/api/factures/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut: "payee", datePaiement: today, paiements: validPaiements }),
    });
    if (res.ok) await fetchFacture();
    setMarkingPaid(false);
  };

  const handleSendEmail = async () => {
    setSending(true);
    const res = await fetch("/api/email/facture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ factureId: id }),
    });
    const data = await res.json();
    setEmailOpen(false);
    setSending(false);
    if (res.ok) {
      setEmailMsg(data.skipped ? "SMTP non configuré (voir .env)" : "Email envoyé avec succès !");
      fetchFacture();
    } else {
      setEmailMsg(data.error || "Erreur lors de l'envoi");
    }
    setTimeout(() => setEmailMsg(""), 4000);
  };

  const addLigne = () => setPaiements((p) => [...p, { mode: "", montant: 0 }]);

  const removeLigne = (i: number) => setPaiements((p) => p.filter((_, idx) => idx !== i));

  const updateLigne = (i: number, field: keyof PaiementLigne, value: string | number) => {
    setPaiements((p) => p.map((l, idx) => idx === i ? { ...l, [field]: value } : l));
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" /></div>;
  }

  if (!facture) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Facture non trouvée</p>
        <Link href="/commercial" className="mt-4 inline-flex items-center gap-1 text-red-600 hover:underline text-sm">
          <ArrowLeft className="h-4 w-4" /> Retour
        </Link>
      </div>
    );
  }

  const st = FACTURE_STATUTS[facture.statut as keyof typeof FACTURE_STATUTS];
  const montantTVA = facture.montantHT * (facture.tauxTVA / 100);
  const isPaid = facture.statut === "payee";
  const nextStatuts = Object.keys(FACTURE_STATUTS).filter((k) => k !== facture.statut);
  const isOverdue = !isPaid && facture.statut !== "annulee" && new Date(facture.dateEcheance) < new Date();

  const totalSaisi = paiements.reduce((s, p) => s + (Number(p.montant) || 0), 0);
  const restant = facture.montantTTC - totalSaisi;
  const validPaiements = paiements.filter((p) => p.mode && p.montant > 0);
  const canMarkPaid = validPaiements.length > 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link href="/commercial" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-300 mb-4">
          <ArrowLeft className="h-4 w-4" /> Retour au commercial
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-sm font-mono text-gray-400">{facture.numero}</span>
              {st && <StatutBadge label={st.label} color={st.color} />}
              {isOverdue && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-900/30 text-red-400 border border-red-700">
                  En retard
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-100 mb-1">{formatCurrency(facture.montantTTC)}</h1>
            {facture.entreprise && (
              <p className="text-gray-400">
                <Link href={`/entreprises/${facture.entreprise.id}`} className="text-red-600 hover:underline">
                  {facture.entreprise.nom}
                </Link>
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2 flex-wrap justify-end">
            {(facture.statut === "en_attente" || facture.statut === "envoyee") && (
              <button
                onClick={() => setEmailOpen(true)}
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                <Mail className="h-4 w-4" /> Envoyer par email
              </button>
            )}
            <a href={`/api/pdf/facture/${id}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors">
              <Eye className="h-4 w-4" /> Prévisualiser PDF
            </a>
            <a href={`/api/pdf/facture/${id}`} download={`facture-${facture.numero}.pdf`}
              className="inline-flex items-center gap-2 rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors">
              <Download className="h-4 w-4" /> Télécharger PDF
            </a>
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
        {/* Colonne gauche */}
        <div className="col-span-1 space-y-4">

          {/* Informations */}
          <div className="rounded-lg border bg-gray-800 p-4 space-y-3">
            <h2 className="font-semibold text-gray-100">Informations</h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-400">Date d'émission</p>
                <p className="font-medium">{formatDate(facture.dateEmission)}</p>
              </div>
              <div>
                <p className="text-gray-400">Date d'échéance</p>
                <p className={`font-medium ${isOverdue ? "text-red-600" : ""}`}>
                  {formatDate(facture.dateEcheance)}{isOverdue && " (dépassée)"}
                </p>
              </div>
              {facture.datePaiement && (
                <div>
                  <p className="text-gray-400">Date de paiement</p>
                  <p className="font-medium text-green-500">{formatDate(facture.datePaiement)}</p>
                </div>
              )}
              {/* Paiements enregistrés */}
              {facture.paiements && facture.paiements.length > 0 && (
                <div>
                  <p className="text-gray-400 mb-1">Modes de paiement</p>
                  <div className="space-y-1">
                    {facture.paiements.map((p, i) => (
                      <div key={i} className="flex justify-between items-center rounded bg-gray-700 px-2 py-1">
                        <span className="text-xs text-gray-200">{MODES_LABELS[p.mode] || p.mode}</span>
                        <span className="text-xs font-semibold text-green-400">{formatCurrency(p.montant)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {facture.entreprise && (
                <div>
                  <p className="text-gray-400">Entreprise</p>
                  <Link href={`/entreprises/${facture.entreprise.id}`} className="font-medium text-red-600 hover:underline">
                    {facture.entreprise.nom}
                  </Link>
                </div>
              )}
              {facture.devis && (
                <div>
                  <p className="text-gray-400">Devis associé</p>
                  <Link href={`/commercial/devis/${facture.devis.id}`} className="font-medium text-red-600 hover:underline">
                    {facture.devis.numero}
                  </Link>
                  {facture.devis.objet && <p className="text-gray-400 text-xs">{facture.devis.objet}</p>}
                </div>
              )}
              {facture.notes && (
                <div>
                  <p className="text-gray-400">Notes</p>
                  <p className="font-medium whitespace-pre-wrap">{facture.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Enregistrer le paiement */}
          {!isPaid && facture.statut !== "annulee" && (
            <div className="rounded-lg border bg-gray-800 p-4 space-y-3">
              <h2 className="font-semibold text-gray-100">Enregistrer le paiement</h2>

              <div className="space-y-2">
                {paiements.map((ligne, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex gap-2 items-center">
                      <select
                        value={ligne.mode}
                        onChange={(e) => updateLigne(i, "mode", e.target.value)}
                        className="flex-1 rounded-md border border-gray-600 bg-gray-700 text-gray-100 text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-green-500"
                      >
                        <option value="">— Mode —</option>
                        {MODES.map((m) => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                      {paiements.length > 1 && (
                        <button onClick={() => removeLigne(i)} className="text-gray-500 hover:text-red-400 transition-colors">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={ligne.montant || ""}
                        onChange={(e) => updateLigne(i, "montant", parseFloat(e.target.value) || 0)}
                        placeholder="Montant €"
                        className="w-full rounded-md border border-gray-600 bg-gray-700 text-gray-100 text-sm px-3 py-1.5 pr-8 focus:outline-none focus:ring-1 focus:ring-green-500"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">€</span>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={addLigne}
                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Ajouter un mode de paiement
              </button>

              {/* Récap montants */}
              <div className="rounded-md bg-gray-700 px-3 py-2 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total facture</span>
                  <span className="text-gray-100 font-medium">{formatCurrency(facture.montantTTC)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Montant saisi</span>
                  <span className="text-gray-100 font-medium">{formatCurrency(totalSaisi)}</span>
                </div>
                <div className={`flex justify-between border-t border-gray-600 pt-1 font-semibold ${restant < 0 ? "text-red-400" : restant === 0 ? "text-green-400" : "text-amber-400"}`}>
                  <span>Restant</span>
                  <span>{formatCurrency(restant)}</span>
                </div>
              </div>

              <Button
                onClick={handleMarkAsPaid}
                disabled={markingPaid || !canMarkPaid}
                className="w-full bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {markingPaid ? "Enregistrement..." : "Marquer comme payée"}
              </Button>
            </div>
          )}

          {/* Changer le statut */}
          <div className="rounded-lg border bg-gray-800 p-4 space-y-3">
            <h2 className="font-semibold text-gray-100">Changer le statut</h2>
            <div className="space-y-2">
              {nextStatuts.map((key) => {
                const s = FACTURE_STATUTS[key as keyof typeof FACTURE_STATUTS];
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
        </div>

        {/* Colonne droite : détail */}
        <div className="col-span-2">
          <div className="rounded-lg border bg-gray-800 overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="font-semibold text-gray-100">Détail de la facture</h2>
            </div>
            {facture.devis?.lignes && facture.devis.lignes.length > 0 ? (
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
                  {facture.devis.lignes.map((ligne) => (
                    <tr key={ligne.id} className="border-b last:border-0">
                      <td className="px-4 py-3 text-gray-200">{ligne.designation}</td>
                      <td className="px-4 py-3 text-right text-gray-400">{ligne.quantite}</td>
                      <td className="px-4 py-3 text-right text-gray-400">{formatCurrency(ligne.prixUnitaire)}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-200">{formatCurrency(ligne.montant)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-gray-400">
                <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>Aucun détail de lignes disponible</p>
              </div>
            )}

            {/* Totaux */}
            <div className="p-4 border-t bg-gray-900">
              <div className="flex flex-col items-end gap-1 text-sm">
                <div className="flex gap-8">
                  <span className="text-gray-400">Montant HT</span>
                  <span className="font-medium text-gray-200 w-32 text-right">{formatCurrency(facture.montantHT)}</span>
                </div>
                <div className="flex gap-8">
                  <span className="text-gray-400">TVA ({facture.tauxTVA}%)</span>
                  <span className="font-medium text-gray-200 w-32 text-right">{formatCurrency(montantTVA)}</span>
                </div>
                <div className="flex gap-8 pt-1 border-t border-gray-700 mt-1">
                  <span className="font-semibold text-gray-100">Montant TTC</span>
                  <span className="font-bold text-lg text-gray-100 w-32 text-right">{formatCurrency(facture.montantTTC)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={emailOpen}
        onOpenChange={setEmailOpen}
        title={`Envoyer la facture ${facture.numero} ?`}
        description={`Un email sera envoyé à ${facture.entreprise?.nom || "ce client"} avec la facture en pièce jointe. Le statut passera automatiquement à "Envoyée".`}
        onConfirm={handleSendEmail}
        loading={sending}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Supprimer la facture ?"
        description="Cette action est irréversible."
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
