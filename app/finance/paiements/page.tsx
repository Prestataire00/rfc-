"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, CreditCard, Calendar, Building2, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useApi, useApiMutation, invalidate } from "@/hooks/useApi";
import { notify } from "@/lib/toast";
import { ApiError } from "@/lib/fetcher";
import { formatDate, formatCurrency } from "@/lib/utils";

interface Paiement {
  id: string;
  factureId: string;
  montant: number;
  datePaiement: string;
  mode: string;
  reference: string | null;
  notes: string | null;
}

interface Echeance {
  id: string;
  factureId: string;
  montant: number;
  dateEcheance: string;
  statut: string;
  datePaiement: string | null;
}

interface Transaction {
  id: string;
  montant: number;
  date: string;
  libelle: string;
  reference: string | null;
  sens: "credit" | "debit";
  categorie: string | null;
  factureId: string | null;
}

interface Facture {
  id: string;
  numero: string;
  montantTTC: number;
  entreprise?: { nom: string } | null;
}

const TABS = [
  { value: "paiements", label: "Paiements recus" },
  { value: "echeanciers", label: "Echeanciers" },
  { value: "transactions", label: "Transactions bancaires" },
] as const;

const MODES = [
  { value: "virement", label: "Virement" },
  { value: "carte", label: "Carte bancaire" },
  { value: "cpf", label: "CPF" },
  { value: "opco", label: "OPCO" },
  { value: "cheque", label: "Cheque" },
  { value: "especes", label: "Especes" },
];

export default function FinancePaiementsPage() {
  const [tab, setTab] = useState<typeof TABS[number]["value"]>("paiements");

  const { data: paiements } = useApi<Paiement[]>(tab === "paiements" ? "/api/paiements" : null);
  const { data: echeanciers } = useApi<Echeance[]>(tab === "echeanciers" ? "/api/echeanciers" : null);
  const [txDateFrom, setTxDateFrom] = useState("");
  const [txDateTo, setTxDateTo] = useState("");
  const txUrl =
    tab === "transactions"
      ? `/api/transactions-bancaires${
          txDateFrom || txDateTo
            ? `?${[
                txDateFrom ? `dateFrom=${txDateFrom}` : "",
                txDateTo ? `dateTo=${txDateTo}` : "",
              ]
                .filter(Boolean)
                .join("&")}`
            : ""
        }`
      : null;
  const { data: transactions } = useApi<Transaction[]>(txUrl);
  const { data: facturesData } = useApi<{ data: Facture[] }>("/api/factures?limit=200");
  const factures = facturesData?.data ?? [];

  // ---------- Paiement modal ----------
  const [openPaiement, setOpenPaiement] = useState(false);
  const [paiementForm, setPaiementForm] = useState({
    factureId: "",
    montant: "",
    mode: "virement",
    datePaiement: new Date().toISOString().split("T")[0],
    reference: "",
  });
  const { trigger: createPaiement, isMutating: savingPaiement } = useApiMutation<Record<string, unknown>>(
    "/api/paiements",
    "POST"
  );

  const handleCreatePaiement = async () => {
    if (!paiementForm.factureId || !paiementForm.montant) {
      notify.error("Facture et montant obligatoires");
      return;
    }
    try {
      await createPaiement({
        factureId: paiementForm.factureId,
        montant: Number(paiementForm.montant),
        datePaiement: paiementForm.datePaiement,
        mode: paiementForm.mode,
        reference: paiementForm.reference || null,
      });
      await invalidate("/api/paiements");
      notify.success("Paiement enregistre");
      setOpenPaiement(false);
      setPaiementForm({
        factureId: "",
        montant: "",
        mode: "virement",
        datePaiement: new Date().toISOString().split("T")[0],
        reference: "",
      });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Erreur";
      notify.error("Erreur", msg);
    }
  };

  // ---------- Transaction modal ----------
  const [openTx, setOpenTx] = useState(false);
  const [txForm, setTxForm] = useState({
    date: new Date().toISOString().split("T")[0],
    libelle: "",
    montant: "",
    sens: "credit" as "credit" | "debit",
    reference: "",
    factureId: "",
  });
  const { trigger: createTx, isMutating: savingTx } = useApiMutation<Record<string, unknown>>(
    "/api/transactions-bancaires",
    "POST"
  );

  const handleCreateTx = async () => {
    if (!txForm.libelle.trim() || !txForm.montant) {
      notify.error("Libelle et montant obligatoires");
      return;
    }
    try {
      await createTx({
        libelle: txForm.libelle.trim(),
        montant: Number(txForm.montant),
        sens: txForm.sens,
        date: txForm.date,
        reference: txForm.reference || null,
        factureId: txForm.factureId || null,
      });
      await invalidate("/api/transactions-bancaires");
      notify.success("Transaction enregistree");
      setOpenTx(false);
      setTxForm({
        date: new Date().toISOString().split("T")[0],
        libelle: "",
        montant: "",
        sens: "credit",
        reference: "",
        factureId: "",
      });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Erreur";
      notify.error("Erreur", msg);
    }
  };

  const factureOptions = [
    { value: "", label: "Aucune facture" },
    ...factures.map((f) => ({
      value: f.id,
      label: `${f.numero}${f.entreprise ? ` - ${f.entreprise.nom}` : ""} - ${formatCurrency(f.montantTTC)}`,
    })),
  ];

  const factureLink = (id: string) => {
    const f = factures.find((x) => x.id === id);
    return f ? f.numero : id.slice(0, 6);
  };

  // Group echeanciers by facture
  const echGrouped = (echeanciers ?? []).reduce<Record<string, Echeance[]>>((acc, e) => {
    (acc[e.factureId] ??= []).push(e);
    return acc;
  }, {});

  return (
    <div>
      <PageHeader title="Paiements et finance" description="Suivi des encaissements, echeanciers et transactions" />

      <div className="flex gap-1 bg-gray-50 dark:bg-gray-900 rounded-lg p-1 border border-gray-200 dark:border-gray-700 mb-5 w-fit">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
              tab === t.value
                ? "bg-red-600 text-white"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "paiements" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm text-gray-500 dark:text-gray-400">{(paiements ?? []).length} paiement(s)</h2>
            <Button onClick={() => setOpenPaiement(true)} className="bg-red-600 hover:bg-red-700">
              <Plus className="h-4 w-4" /> Enregistrer un paiement
            </Button>
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Facture</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Mode</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400">Montant</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {(paiements ?? []).length === 0 ? (
                  <tr><td colSpan={5} className="text-center text-gray-500 py-12">Aucun paiement</td></tr>
                ) : (
                  (paiements ?? []).map((p) => (
                    <tr key={p.id} className="hover:bg-gray-750">
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{formatDate(p.datePaiement)}</td>
                      <td className="px-4 py-3">
                        <Link href={`/commercial/factures/${p.factureId}`} className="text-red-400 hover:underline">
                          {factureLink(p.factureId)}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300">
                          <CreditCard className="h-3 w-3" /> {p.mode}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-400">
                        {formatCurrency(p.montant)}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{p.reference ?? "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "echeanciers" && (
        <div>
          <h2 className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {Object.keys(echGrouped).length} facture(s) avec echeancier
          </h2>
          {Object.keys(echGrouped).length === 0 ? (
            <p className="text-center text-gray-500 py-12">Aucun echeancier</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(echGrouped).map(([factureId, items]) => (
                <div key={factureId} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <Link
                      href={`/commercial/factures/${factureId}`}
                      className="text-sm font-semibold text-red-400 hover:underline flex items-center gap-1"
                    >
                      <Building2 className="h-3 w-3" /> {factureLink(factureId)}
                    </Link>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Total : {formatCurrency(items.reduce((s, e) => s + e.montant, 0))}
                    </span>
                  </div>
                  <table className="w-full text-xs">
                    <thead className="text-gray-500">
                      <tr>
                        <th className="px-2 py-1 text-left">Date echeance</th>
                        <th className="px-2 py-1 text-right">Montant</th>
                        <th className="px-2 py-1 text-left">Statut</th>
                        <th className="px-2 py-1 text-left">Date paiement</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((e) => (
                        <tr key={e.id} className="border-t border-gray-200 dark:border-gray-700">
                          <td className="px-2 py-2 text-gray-700 dark:text-gray-300">{formatDate(e.dateEcheance)}</td>
                          <td className="px-2 py-2 text-right text-gray-800 dark:text-gray-200">{formatCurrency(e.montant)}</td>
                          <td className="px-2 py-2">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                e.statut === "paye"
                                  ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                                  : e.statut === "en_retard"
                                  ? "bg-red-600/30 text-red-700 dark:text-red-300"
                                  : "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                              }`}
                            >
                              {e.statut}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-gray-500 dark:text-gray-400">
                            {e.datePaiement ? formatDate(e.datePaiement) : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "transactions" && (
        <div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={txDateFrom}
                onChange={(e) => setTxDateFrom(e.target.value)}
                className="w-auto bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 h-9 text-sm"
              />
              <span className="text-xs text-gray-500">a</span>
              <Input
                type="date"
                value={txDateTo}
                onChange={(e) => setTxDateTo(e.target.value)}
                className="w-auto bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 h-9 text-sm"
              />
            </div>
            <Button onClick={() => setOpenTx(true)} className="bg-red-600 hover:bg-red-700">
              <Plus className="h-4 w-4" /> Ajouter une transaction
            </Button>
          </div>
          <p className="text-[11px] text-gray-500 mb-3">
            Note : la synchronisation Qonto sera disponible en Phase 4.
          </p>
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Libelle</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Sens</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400">Montant</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Facture liee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {(transactions ?? []).length === 0 ? (
                  <tr><td colSpan={5} className="text-center text-gray-500 py-12">Aucune transaction</td></tr>
                ) : (
                  (transactions ?? []).map((t) => (
                    <tr key={t.id} className="hover:bg-gray-750">
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        <Calendar className="h-3 w-3 inline mr-1 text-gray-500" />
                        {formatDate(t.date)}
                      </td>
                      <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{t.libelle}</td>
                      <td className="px-4 py-3">
                        {t.sens === "credit" ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 text-xs">
                            <ArrowDownToLine className="h-3 w-3" /> Credit
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-400 text-xs">
                            <ArrowUpFromLine className="h-3 w-3" /> Debit
                          </span>
                        )}
                      </td>
                      <td className={`px-4 py-3 text-right font-semibold ${t.sens === "credit" ? "text-emerald-400" : "text-red-400"}`}>
                        {t.sens === "debit" ? "-" : ""}{formatCurrency(t.montant)}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {t.factureId ? (
                          <Link href={`/commercial/factures/${t.factureId}`} className="text-red-400 hover:underline">
                            {factureLink(t.factureId)}
                          </Link>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal paiement */}
      <Dialog open={openPaiement} onOpenChange={setOpenPaiement}>
        <DialogContent
          onClose={() => setOpenPaiement(false)}
          className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
        >
          <DialogHeader>
            <DialogTitle>Enregistrer un paiement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Facture *</Label>
              <Select
                value={paiementForm.factureId}
                onChange={(e) => setPaiementForm({ ...paiementForm, factureId: e.target.value })}
                options={factureOptions}
                placeholder="-- Selectionner --"
                className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Montant (EUR) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={paiementForm.montant}
                  onChange={(e) => setPaiementForm({ ...paiementForm, montant: e.target.value })}
                  className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={paiementForm.datePaiement}
                  onChange={(e) => setPaiementForm({ ...paiementForm, datePaiement: e.target.value })}
                  className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Mode</Label>
              <Select
                value={paiementForm.mode}
                onChange={(e) => setPaiementForm({ ...paiementForm, mode: e.target.value })}
                options={MODES}
                className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Reference</Label>
              <Input
                value={paiementForm.reference}
                onChange={(e) => setPaiementForm({ ...paiementForm, reference: e.target.value })}
                className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenPaiement(false)}>Annuler</Button>
            <Button
              onClick={handleCreatePaiement}
              disabled={savingPaiement}
              className="bg-red-600 hover:bg-red-700"
            >
              {savingPaiement ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal transaction */}
      <Dialog open={openTx} onOpenChange={setOpenTx}>
        <DialogContent
          onClose={() => setOpenTx(false)}
          className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
        >
          <DialogHeader>
            <DialogTitle>Ajouter une transaction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={txForm.date}
                  onChange={(e) => setTxForm({ ...txForm, date: e.target.value })}
                  className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Sens</Label>
                <Select
                  value={txForm.sens}
                  onChange={(e) => setTxForm({ ...txForm, sens: e.target.value as "credit" | "debit" })}
                  options={[
                    { value: "credit", label: "Credit (entree)" },
                    { value: "debit", label: "Debit (sortie)" },
                  ]}
                  className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Libelle *</Label>
              <Input
                value={txForm.libelle}
                onChange={(e) => setTxForm({ ...txForm, libelle: e.target.value })}
                className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Montant (EUR) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={txForm.montant}
                  onChange={(e) => setTxForm({ ...txForm, montant: e.target.value })}
                  className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Reference</Label>
                <Input
                  value={txForm.reference}
                  onChange={(e) => setTxForm({ ...txForm, reference: e.target.value })}
                  className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Facture liee</Label>
              <Select
                value={txForm.factureId}
                onChange={(e) => setTxForm({ ...txForm, factureId: e.target.value })}
                options={factureOptions}
                className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenTx(false)}>Annuler</Button>
            <Button onClick={handleCreateTx} disabled={savingTx} className="bg-red-600 hover:bg-red-700">
              {savingTx ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
