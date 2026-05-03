"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Receipt } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useApi, useApiMutation, invalidate } from "@/hooks/useApi";
import { notify } from "@/lib/toast";
import { ApiError } from "@/lib/fetcher";
import { formatDate, formatCurrency } from "@/lib/utils";

interface Formateur {
  id: string;
  nom: string;
  prenom: string;
}

interface Facture {
  id: string;
  numero: string;
  formateurId: string;
  formateur?: { id: string; nom: string; prenom: string };
  sessionId: string | null;
  session?: { id: string; dateDebut: string; formationId: string } | null;
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

interface SessionItem {
  id: string;
  dateDebut: string;
  formation?: { titre: string };
}

const STATUTS = [
  { value: "", label: "Tous les statuts" },
  { value: "a_payer", label: "A payer" },
  { value: "paye", label: "Paye" },
  { value: "refuse", label: "Refuse" },
];

const STATUT_COLORS: Record<string, string> = {
  a_payer: "bg-amber-500/20 text-amber-300",
  paye: "bg-emerald-500/20 text-emerald-300",
  refuse: "bg-red-600/30 text-red-300",
};

export default function FacturesFormateurPage() {
  const [filterFormateur, setFilterFormateur] = useState("");
  const [filterStatut, setFilterStatut] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const url = useMemo(() => {
    const params = new URLSearchParams();
    if (filterFormateur) params.set("formateurId", filterFormateur);
    if (filterStatut) params.set("statut", filterStatut);
    return `/api/factures-formateur${params.toString() ? `?${params.toString()}` : ""}`;
  }, [filterFormateur, filterStatut]);

  const { data: factures } = useApi<Facture[]>(url);
  const { data: formateurs } = useApi<Formateur[]>("/api/formateurs");
  const { data: sessions } = useApi<SessionItem[]>("/api/sessions?limit=200");

  const filtered = useMemo(() => {
    let list = factures ?? [];
    if (dateFrom) list = list.filter((f) => f.datePrestation >= dateFrom);
    if (dateTo) list = list.filter((f) => f.datePrestation <= dateTo);
    return list;
  }, [factures, dateFrom, dateTo]);

  const totalAPayer = useMemo(
    () =>
      filtered
        .filter((f) => f.statut === "a_payer")
        .reduce((s, f) => s + f.montantTTC, 0),
    [filtered]
  );

  const formateurOptions = [
    { value: "", label: "Tous les formateurs" },
    ...((formateurs ?? []).map((f) => ({ value: f.id, label: `${f.prenom} ${f.nom}` }))),
  ];

  // Create modal
  const [openCreate, setOpenCreate] = useState(false);
  const [form, setForm] = useState({
    formateurId: "",
    sessionId: "",
    montantHT: "",
    tauxTVA: 20,
    datePrestation: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const { trigger: createFacture, isMutating: saving } = useApiMutation<Record<string, unknown>>(
    "/api/factures-formateur",
    "POST"
  );

  const handleCreate = async () => {
    if (!form.formateurId || !form.montantHT) {
      notify.error("Formateur et montant obligatoires");
      return;
    }
    const ht = Number(form.montantHT);
    const ttc = ht * (1 + form.tauxTVA / 100);
    try {
      await createFacture({
        formateurId: form.formateurId,
        sessionId: form.sessionId || null,
        montantHT: ht,
        tauxTVA: form.tauxTVA,
        montantTTC: Number(ttc.toFixed(2)),
        datePrestation: form.datePrestation,
        notes: form.notes || null,
      });
      await invalidate(url);
      notify.success("Facture creee");
      setOpenCreate(false);
      setForm({
        formateurId: "",
        sessionId: "",
        montantHT: "",
        tauxTVA: 20,
        datePrestation: new Date().toISOString().split("T")[0],
        notes: "",
      });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Erreur";
      notify.error("Erreur", msg);
    }
  };

  const sessionOptions = [
    { value: "", label: "Aucune session" },
    ...((sessions ?? []).map((s) => ({
      value: s.id,
      label: `${s.formation?.titre ?? "Session"} - ${formatDate(s.dateDebut)}`,
    }))),
  ];

  return (
    <div>
      <PageHeader title="Factures formateur" description="Factures emises par les formateurs a destination de RFC" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
          <p className="text-xs text-gray-400 uppercase font-semibold">A payer</p>
          <p className="text-2xl font-bold text-amber-400 mt-1">{formatCurrency(totalAPayer)}</p>
        </div>
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
          <p className="text-xs text-gray-400 uppercase font-semibold">Nb factures</p>
          <p className="text-2xl font-bold text-gray-100 mt-1">{filtered.length}</p>
        </div>
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
          <p className="text-xs text-gray-400 uppercase font-semibold">Cette periode</p>
          <p className="text-2xl font-bold text-gray-100 mt-1">
            {formatCurrency(filtered.reduce((s, f) => s + f.montantTTC, 0))}
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full sm:w-auto">
          <Select
            value={filterFormateur}
            onChange={(e) => setFilterFormateur(e.target.value)}
            options={formateurOptions}
            className="bg-gray-800 border-gray-700 h-9 text-xs"
          />
          <Select
            value={filterStatut}
            onChange={(e) => setFilterStatut(e.target.value)}
            options={STATUTS}
            className="bg-gray-800 border-gray-700 h-9 text-xs"
          />
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="bg-gray-800 border-gray-700 h-9 text-xs"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="bg-gray-800 border-gray-700 h-9 text-xs"
          />
        </div>
        <Button onClick={() => setOpenCreate(true)} className="bg-red-600 hover:bg-red-700">
          <Plus className="h-4 w-4" /> Nouvelle facture
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Receipt} title="Aucune facture" description="Aucune facture formateur ne correspond aux filtres." />
      ) : (
        <div className="rounded-xl border border-gray-700 bg-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 border-b border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">Numero</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">Formateur</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">Session</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">Date prestation</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400">Montant TTC</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filtered.map((f) => (
                <tr key={f.id} className="hover:bg-gray-750 cursor-pointer">
                  <td className="px-4 py-3">
                    <Link href={`/formateurs/factures/${f.id}`} className="text-red-400 hover:underline font-medium">
                      {f.numero}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {f.formateur ? `${f.formateur.prenom} ${f.formateur.nom}` : "-"}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {f.session ? (
                      <Link href={`/sessions/${f.session.id}`} className="text-gray-400 hover:text-red-400">
                        {formatDate(f.session.dateDebut)}
                      </Link>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-300">{formatDate(f.datePrestation)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-100">
                    {formatCurrency(f.montantTTC)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUT_COLORS[f.statut] ?? ""}`}>
                      {f.statut}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent
          onClose={() => setOpenCreate(false)}
          className="bg-gray-800 border-gray-700 text-gray-100"
        >
          <DialogHeader>
            <DialogTitle>Nouvelle facture formateur</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="space-y-1.5">
              <Label>Formateur *</Label>
              <Select
                value={form.formateurId}
                onChange={(e) => setForm({ ...form, formateurId: e.target.value })}
                options={[{ value: "", label: "-- Selectionner --" }, ...((formateurs ?? []).map((f) => ({ value: f.id, label: `${f.prenom} ${f.nom}` })))]}
                className="bg-gray-900 border-gray-700"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Session associee</Label>
              <Select
                value={form.sessionId}
                onChange={(e) => setForm({ ...form, sessionId: e.target.value })}
                options={sessionOptions}
                className="bg-gray-900 border-gray-700"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Montant HT *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.montantHT}
                  onChange={(e) => setForm({ ...form, montantHT: e.target.value })}
                  className="bg-gray-900 border-gray-700"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Taux TVA (%)</Label>
                <Input
                  type="number"
                  value={form.tauxTVA}
                  onChange={(e) => setForm({ ...form, tauxTVA: Number(e.target.value) })}
                  className="bg-gray-900 border-gray-700"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Date prestation</Label>
              <Input
                type="date"
                value={form.datePrestation}
                onChange={(e) => setForm({ ...form, datePrestation: e.target.value })}
                className="bg-gray-900 border-gray-700"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                className="bg-gray-900 border-gray-700"
              />
            </div>
            {form.montantHT && (
              <p className="text-xs text-gray-400">
                Montant TTC : <span className="font-semibold text-gray-100">
                  {formatCurrency(Number(form.montantHT) * (1 + form.tauxTVA / 100))}
                </span>
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>Annuler</Button>
            <Button onClick={handleCreate} disabled={saving} className="bg-red-600 hover:bg-red-700">
              {saving ? "Creation..." : "Creer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
