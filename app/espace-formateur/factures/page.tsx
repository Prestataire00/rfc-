"use client";

import { useState } from "react";
import {
  FileText, Plus, CheckCircle2, Clock, XCircle, Euro,
} from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/fetcher";
import { notify } from "@/lib/toast";
import { formatDate } from "@/lib/utils";

type Facture = {
  id: string;
  numero: string;
  montantHT: number;
  tauxTVA: number;
  montantTTC: number;
  datePrestation: string;
  dateEmission: string;
  datePaiement: string | null;
  statut: string;
  fichierUrl: string | null;
  notes: string | null;
  createdAt: string;
  session: {
    id: string;
    dateDebut: string;
    formation: { titre: string };
  } | null;
};

type MesSession = {
  id: string;
  dateDebut: string;
  formation: { titre: string };
};

const STATUT_STYLES: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  a_payer: { icon: Clock, color: "text-amber-400 bg-amber-900/30", label: "À payer" },
  paye:    { icon: CheckCircle2, color: "text-emerald-400 bg-emerald-900/30", label: "Payée" },
  refuse:  { icon: XCircle, color: "text-red-400 bg-red-900/30", label: "Refusée" },
};

const fmtMoney = (n: number) =>
  n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

export default function FacturesFormateurPage() {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form
  const [sessionId, setSessionId] = useState<string>("");
  const [montantHT, setMontantHT] = useState("");
  const [tauxTVA, setTauxTVA] = useState("20");
  const [datePrestation, setDatePrestation] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [fichier, setFichier] = useState<File | null>(null);
  const [notesText, setNotesText] = useState("");

  const { data: facturesData, isLoading, mutate } =
    useApi<Facture[]>("/api/formateur/factures");
  const { data: sessionsData } =
    useApi<MesSession[]>("/api/formateur/mes-sessions");
  const factures: Facture[] = Array.isArray(facturesData) ? facturesData : [];
  const mesSessions: MesSession[] = Array.isArray(sessionsData) ? sessionsData : [];

  const totalAPayer = factures
    .filter((f) => f.statut === "a_payer")
    .reduce((s, f) => s + f.montantTTC, 0);
  const totalPaye = factures
    .filter((f) => f.statut === "paye")
    .reduce((s, f) => s + f.montantTTC, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const ht = parseFloat(montantHT);
      const tva = parseFloat(tauxTVA);
      if (isNaN(ht) || ht <= 0) {
        notify.error("Montant HT invalide");
        return;
      }
      if (isNaN(tva) || tva < 0) {
        notify.error("Taux TVA invalide");
        return;
      }
      const ttc = +(ht * (1 + tva / 100)).toFixed(2);

      // Upload optionnel du fichier (PDF facture)
      let fichierUrl: string | null = null;
      if (fichier) {
        const fd = new FormData();
        fd.append("file", fichier);
        fd.append("type", "facture_formateur");
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Échec upload");
        }
        const doc = await res.json();
        fichierUrl = doc.chemin;
      }

      await api.post("/api/formateur/factures", {
        sessionId: sessionId || null,
        montantHT: ht,
        tauxTVA: tva,
        montantTTC: ttc,
        datePrestation,
        fichierUrl,
        notes: notesText || null,
      });
      notify.success("Facture soumise");
      setShowForm(false);
      setSessionId("");
      setMontantHT("");
      setTauxTVA("20");
      setFichier(null);
      setNotesText("");
      await mutate();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Échec";
      notify.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Mes factures</h1>
          <p className="text-gray-400 mt-1">
            Factures émises à destination de RFC pour vos prestations
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white rounded-md px-4 py-2 text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          {showForm ? "Annuler" : "Nouvelle facture"}
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-lg border bg-gray-800 p-5 flex items-center gap-4">
          <div className="rounded-full p-3 bg-red-900/30">
            <FileText className="h-6 w-6 text-red-500" />
          </div>
          <div>
            <p className="text-sm text-gray-400">Total factures</p>
            <p className="text-2xl font-bold text-gray-100">{factures.length}</p>
          </div>
        </div>
        <div className="rounded-lg border bg-gray-800 p-5 flex items-center gap-4">
          <div className="rounded-full p-3 bg-amber-900/30">
            <Clock className="h-6 w-6 text-amber-400" />
          </div>
          <div>
            <p className="text-sm text-gray-400">En attente de paiement</p>
            <p className="text-2xl font-bold text-gray-100">{fmtMoney(totalAPayer)}</p>
          </div>
        </div>
        <div className="rounded-lg border bg-gray-800 p-5 flex items-center gap-4">
          <div className="rounded-full p-3 bg-emerald-900/30">
            <Euro className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm text-gray-400">Payé (cumul)</p>
            <p className="text-2xl font-bold text-gray-100">{fmtMoney(totalPaye)}</p>
          </div>
        </div>
      </div>

      {/* Formulaire */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border bg-gray-800 p-6 mb-6 space-y-4"
        >
          <h2 className="font-semibold text-gray-100">Nouvelle facture</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Session liée (facultatif)
              </label>
              <select
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                className="w-full rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-gray-100"
              >
                <option value="">— Aucune —</option>
                {mesSessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.formation.titre} — {formatDate(s.dateDebut)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Date de prestation
              </label>
              <input
                type="date"
                value={datePrestation}
                onChange={(e) => setDatePrestation(e.target.value)}
                required
                className="w-full rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Montant HT (€)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={montantHT}
                onChange={(e) => setMontantHT(e.target.value)}
                required
                className="w-full rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Taux TVA (%)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={tauxTVA}
                onChange={(e) => setTauxTVA(e.target.value)}
                required
                className="w-full rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-gray-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Justificatif PDF (facultatif)
            </label>
            <input
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => setFichier(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-gray-300 file:mr-3 file:rounded file:border-0 file:bg-gray-700 file:px-3 file:py-1 file:text-gray-100 hover:file:bg-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Notes</label>
            <textarea
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              rows={2}
              className="w-full rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-gray-100"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-md border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-red-600 hover:bg-red-700 disabled:opacity-50 px-4 py-2 text-sm font-medium text-white"
            >
              {saving ? "Envoi…" : "Soumettre"}
            </button>
          </div>
        </form>
      )}

      {/* Liste factures */}
      <div className="rounded-lg border bg-gray-800 overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="font-semibold text-gray-100">Historique</h2>
        </div>
        {isLoading ? (
          <div className="p-12 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
          </div>
        ) : factures.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">
            Aucune facture pour le moment
          </div>
        ) : (
          <div className="divide-y">
            {factures.map((f) => {
              const st = STATUT_STYLES[f.statut] ?? STATUT_STYLES.a_payer;
              const StatutIcon = st.icon;
              return (
                <div
                  key={f.id}
                  className="px-6 py-4 grid grid-cols-12 gap-4 items-center"
                >
                  <div className="col-span-3">
                    <p className="font-medium text-gray-100">{f.numero}</p>
                    <p className="text-xs text-gray-400">
                      Émise le {formatDate(f.dateEmission)}
                    </p>
                  </div>
                  <div className="col-span-4">
                    <p className="text-sm text-gray-200 truncate">
                      {f.session?.formation.titre ?? "—"}
                    </p>
                    <p className="text-xs text-gray-400">
                      Prestation : {formatDate(f.datePrestation)}
                    </p>
                  </div>
                  <div className="col-span-2 text-right">
                    <p className="font-semibold text-gray-100">
                      {fmtMoney(f.montantTTC)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {fmtMoney(f.montantHT)} HT
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${st.color}`}
                    >
                      <StatutIcon className="h-3.5 w-3.5" />
                      {st.label}
                    </span>
                  </div>
                  <div className="col-span-1 text-right">
                    {f.fichierUrl ? (
                      <a
                        href={f.fichierUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        PDF
                      </a>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
