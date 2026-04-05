"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { Button } from "@/components/ui/button";
import { FACTURE_STATUTS } from "@/lib/constants";

type Facture = {
  id: string;
  numero: string;
  statut: string;
  montantHT: number;
  montantTTC: number;
  dateEmission: string;
  dateEcheance: string;
  datePaiement: string | null;
  notes: string | null;
};

export default function FactureModifierPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [facture, setFacture] = useState<Facture | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [statut, setStatut] = useState("");
  const [datePaiement, setDatePaiement] = useState("");
  const [notes, setNotes] = useState("");

  const fetchFacture = useCallback(async () => {
    try {
      const res = await fetch(`/api/factures/${id}`);
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const data = await res.json();
      setFacture(data);
      setStatut(data.statut);
      setDatePaiement(
        data.datePaiement
          ? new Date(data.datePaiement).toISOString().split("T")[0]
          : ""
      );
      setNotes(data.notes || "");
    } catch {
      setError("Erreur lors du chargement de la facture.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchFacture();
  }, [fetchFacture]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const body: Record<string, unknown> = { statut, notes: notes || null };
      if (datePaiement) {
        body.datePaiement = datePaiement;
      } else {
        body.datePaiement = null;
      }

      const res = await fetch(`/api/factures/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erreur lors de la mise à jour.");
        setSaving(false);
        return;
      }

      router.push(`/commercial/factures/${id}`);
    } catch {
      setError("Erreur lors de la mise à jour de la facture.");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
      </div>
    );
  }

  if (!facture) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Facture non trouvée</p>
        <Link
          href="/commercial"
          className="mt-4 inline-flex items-center gap-1 text-red-600 hover:underline text-sm"
        >
          <ArrowLeft className="h-4 w-4" /> Retour au commercial
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Breadcrumb items={[
          { label: "Commercial", href: "/commercial" },
          { label: "Facture", href: `/commercial/factures/${id}` },
          { label: "Modifier" },
        ]} />
        <h1 className="text-2xl font-bold text-gray-100">
          Modifier la facture {facture.numero}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-xl space-y-6">
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-6 space-y-5">
          {/* Statut */}
          <div>
            <label
              htmlFor="statut"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Statut
            </label>
            <select
              id="statut"
              value={statut}
              onChange={(e) => setStatut(e.target.value)}
              className="w-full rounded-md border border-gray-700 bg-gray-900 text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
            >
              {Object.entries(FACTURE_STATUTS).map(([key, val]) => (
                <option key={key} value={key}>
                  {val.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date de paiement */}
          <div>
            <label
              htmlFor="datePaiement"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Date de paiement
            </label>
            <input
              id="datePaiement"
              type="date"
              value={datePaiement}
              onChange={(e) => setDatePaiement(e.target.value)}
              className="w-full rounded-md border border-gray-700 bg-gray-900 text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
            />
            {datePaiement && (
              <button
                type="button"
                onClick={() => setDatePaiement("")}
                className="mt-1 text-xs text-gray-400 hover:text-gray-300 underline"
              >
                Effacer la date
              </button>
            )}
          </div>

          {/* Notes */}
          <div>
            <label
              htmlFor="notes"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Notes
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-gray-700 bg-gray-900 text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent resize-vertical"
              placeholder="Notes internes sur cette facture..."
            />
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-red-700 bg-red-900/30 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving} className="bg-red-600 hover:bg-red-700 text-white">
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
          <Link
            href={`/commercial/factures/${id}`}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-400 hover:text-gray-300"
          >
            Annuler
          </Link>
        </div>
      </form>
    </div>
  );
}
