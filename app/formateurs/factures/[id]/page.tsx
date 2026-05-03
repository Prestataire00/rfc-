"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2, Trash2, Check, Ban, FileText, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useApi, useApiMutation, invalidate } from "@/hooks/useApi";
import { notify } from "@/lib/toast";
import { ApiError } from "@/lib/fetcher";
import { formatDate, formatCurrency } from "@/lib/utils";

interface Facture {
  id: string;
  numero: string;
  formateurId: string;
  formateur?: { id: string; nom: string; prenom: string };
  sessionId: string | null;
  session?: { id: string; dateDebut: string; formation?: { titre: string } } | null;
  montantHT: number;
  tauxTVA: number;
  montantTTC: number;
  datePrestation: string;
  dateEmission: string;
  datePaiement: string | null;
  statut: string;
  fichierUrl: string | null;
  notes: string | null;
}

const STATUTS = [
  { value: "a_payer", label: "A payer" },
  { value: "paye", label: "Paye" },
  { value: "refuse", label: "Refuse" },
];

export default function FactureFormateurDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();

  const { data: facture, isLoading, mutate } = useApi<Facture>(id ? `/api/factures-formateur/${id}` : null);

  const [form, setForm] = useState({
    montantHT: 0,
    tauxTVA: 20,
    montantTTC: 0,
    datePrestation: "",
    datePaiement: "",
    statut: "a_payer",
    fichierUrl: "",
    notes: "",
  });

  useEffect(() => {
    if (facture) {
      setForm({
        montantHT: facture.montantHT,
        tauxTVA: facture.tauxTVA,
        montantTTC: facture.montantTTC,
        datePrestation: facture.datePrestation.split("T")[0],
        datePaiement: facture.datePaiement ? facture.datePaiement.split("T")[0] : "",
        statut: facture.statut,
        fichierUrl: facture.fichierUrl ?? "",
        notes: facture.notes ?? "",
      });
    }
  }, [facture]);

  const { trigger: updateFacture, isMutating: saving } = useApiMutation<Record<string, unknown>>(
    `/api/factures-formateur/${id}`,
    "PUT"
  );
  const { trigger: deleteFacture } = useApiMutation(`/api/factures-formateur/${id}`, "DELETE");

  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = async (overrides: Partial<typeof form> = {}) => {
    if (!facture) return;
    const data = { ...form, ...overrides };
    try {
      await updateFacture({
        formateurId: facture.formateurId,
        sessionId: facture.sessionId,
        montantHT: Number(data.montantHT),
        tauxTVA: Number(data.tauxTVA),
        montantTTC: Number(data.montantTTC),
        datePrestation: data.datePrestation,
        datePaiement: data.datePaiement || null,
        statut: data.statut,
        fichierUrl: data.fichierUrl || null,
        notes: data.notes || null,
      });
      await mutate();
      await invalidate("/api/factures-formateur");
      notify.success("Facture mise a jour");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Erreur";
      notify.error("Erreur", msg);
    }
  };

  const handleMarkPaid = () =>
    handleSave({
      statut: "paye",
      datePaiement: new Date().toISOString().split("T")[0],
    });

  const handleMarkRefused = () => handleSave({ statut: "refuse" });

  const handleDelete = async () => {
    try {
      await deleteFacture();
      await invalidate("/api/factures-formateur");
      notify.success("Facture supprimee");
      router.push("/formateurs/factures");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Erreur";
      notify.error("Erreur", msg);
    }
  };

  if (isLoading || !facture) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/formateurs/factures"
        className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Retour aux factures formateur
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{facture.numero}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {facture.formateur ? `${facture.formateur.prenom} ${facture.formateur.nom}` : "Formateur inconnu"}
            {facture.session && ` - Session du ${formatDate(facture.session.dateDebut)}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {facture.statut !== "paye" && (
            <Button onClick={handleMarkPaid} className="bg-emerald-600 hover:bg-emerald-700">
              <Check className="h-4 w-4" /> Marquer payee
            </Button>
          )}
          {facture.statut !== "refuse" && (
            <Button variant="outline" onClick={handleMarkRefused}>
              <Ban className="h-4 w-4" /> Refuser
            </Button>
          )}
          <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-base text-gray-900 dark:text-gray-100">Details de la facture</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Montant HT *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.montantHT}
                  onChange={(e) => setForm({ ...form, montantHT: Number(e.target.value) })}
                  className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Taux TVA (%)</Label>
                <Input
                  type="number"
                  value={form.tauxTVA}
                  onChange={(e) => setForm({ ...form, tauxTVA: Number(e.target.value) })}
                  className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Montant TTC *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.montantTTC}
                  onChange={(e) => setForm({ ...form, montantTTC: Number(e.target.value) })}
                  className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date prestation</Label>
                <Input
                  type="date"
                  value={form.datePrestation}
                  onChange={(e) => setForm({ ...form, datePrestation: e.target.value })}
                  className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Date paiement</Label>
                <Input
                  type="date"
                  value={form.datePaiement}
                  onChange={(e) => setForm({ ...form, datePaiement: e.target.value })}
                  className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Statut</Label>
                <Select
                  value={form.statut}
                  onChange={(e) => setForm({ ...form, statut: e.target.value })}
                  options={STATUTS}
                  className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Fichier (URL)</Label>
                <Input
                  value={form.fichierUrl}
                  onChange={(e) => setForm({ ...form, fichierUrl: e.target.value })}
                  placeholder="https://..."
                  className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={4}
                className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={() => handleSave()} disabled={saving} className="bg-red-600 hover:bg-red-700">
                <Save className="h-4 w-4" /> {saving ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-base text-gray-900 dark:text-gray-100">Recapitulatif</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Date d'emission</p>
              <p className="text-gray-900 dark:text-gray-100">{formatDate(facture.dateEmission)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Montant TTC</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(facture.montantTTC)}</p>
            </div>
            {facture.fichierUrl && (
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Piece jointe</p>
                <a
                  href={facture.fichierUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-red-400 hover:underline text-sm"
                >
                  <FileText className="h-4 w-4" /> Ouvrir <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Supprimer cette facture ?"
        description="Cette action est irreversible."
        onConfirm={handleDelete}
      />
    </div>
  );
}
