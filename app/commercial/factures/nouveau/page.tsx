"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { TVA_RATE } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

type Entreprise = { id: string; nom: string };
type Devis = { id: string; numero: string; objet: string; montantHT: number };

type Ligne = {
  designation: string;
  quantite: number;
  prixUnitaire: number;
  montant: number;
};

function createLigne(): Ligne {
  return { designation: "", quantite: 1, prixUnitaire: 0, montant: 0 };
}

export default function NouvelleFacturePage() {
  const router = useRouter();
  const [entreprises, setEntreprises] = useState<Entreprise[]>([]);
  const [devisList, setDevisList] = useState<Devis[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [entrepriseId, setEntrepriseId] = useState("");
  const [devisId, setDevisId] = useState("");
  const [dateEcheance, setDateEcheance] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });
  const [lignes, setLignes] = useState<Ligne[]>([createLigne()]);
  const [notes, setNotes] = useState("");
  const [avecTVA, setAvecTVA] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/entreprises").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/devis?statut=signe&limit=100").then((r) => (r.ok ? r.json() : { data: [] })),
    ]).then(([e, d]) => {
      setEntreprises(Array.isArray(e) ? e : []);
      setDevisList(Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : []);
    });
  }, []);

  const updateLigne = (index: number, field: keyof Ligne, value: string | number) => {
    setLignes((prev) => {
      const next = [...prev];
      const ligne = { ...next[index], [field]: value };
      if (field === "quantite" || field === "prixUnitaire") {
        const q = field === "quantite" ? Number(value) : ligne.quantite;
        const p = field === "prixUnitaire" ? Number(value) : ligne.prixUnitaire;
        ligne.montant = Math.round(q * p * 100) / 100;
      }
      next[index] = ligne;
      return next;
    });
  };

  const addLigne = () => setLignes((prev) => [...prev, createLigne()]);

  const removeLigne = (index: number) => {
    setLignes((prev) => prev.filter((_, i) => i !== index));
  };

  const montantHT = lignes.reduce((sum, l) => sum + l.montant, 0);
  const tauxTVA = avecTVA ? TVA_RATE : 0;
  const montantTVA = montantHT * (tauxTVA / 100);
  const montantTTC = montantHT + montantTVA;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!entrepriseId) {
      setError("Veuillez sélectionner une entreprise.");
      return;
    }
    if (lignes.length === 0) {
      setError("Veuillez ajouter au moins une ligne.");
      return;
    }
    const hasEmptyDesignation = lignes.some((l) => !l.designation.trim());
    if (hasEmptyDesignation) {
      setError("Toutes les lignes doivent avoir une désignation.");
      return;
    }

    setLoading(true);

    const payload: Record<string, unknown> = {
      entrepriseId,
      dateEcheance,
      tauxTVA: tauxTVA,
      montantHT: Math.round(montantHT * 100) / 100,
      montantTTC: Math.round(montantTTC * 100) / 100,
      notes: notes || null,
      lignes: lignes.map((l) => ({
        designation: l.designation,
        quantite: l.quantite,
        prixUnitaire: l.prixUnitaire,
        montant: l.montant,
      })),
    };

    if (devisId) {
      payload.devisId = devisId;
    }

    try {
      const res = await fetch("/api/factures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/commercial/factures/${data.id}`);
      } else {
        const data = await res.json();
        setError(typeof data.error === "string" ? data.error : "Une erreur est survenue.");
        setLoading(false);
      }
    } catch {
      setError("Une erreur est survenue lors de la création.");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link
          href="/commercial"
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-300 mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Retour au commercial
        </Link>
        <h1 className="text-2xl font-bold text-gray-100">Nouvelle facture</h1>
        <p className="text-gray-400">Créez une nouvelle facture pour un client</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-md bg-red-900/20 border border-red-700 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Informations générales */}
        <Card>
          <CardHeader>
            <CardTitle>Informations générales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Entreprise */}
            <div className="space-y-1.5">
              <Label htmlFor="entrepriseId">Entreprise *</Label>
              <select
                id="entrepriseId"
                value={entrepriseId}
                onChange={(e) => setEntrepriseId(e.target.value)}
                className="w-full h-10 rounded-md border border-gray-600 bg-gray-800 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">-- Sélectionner une entreprise --</option>
                {entreprises.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nom}
                  </option>
                ))}
              </select>
            </div>

            {/* Devis associé */}
            <div className="space-y-1.5">
              <Label htmlFor="devisId">Devis associé (optionnel)</Label>
              <select
                id="devisId"
                value={devisId}
                onChange={(e) => setDevisId(e.target.value)}
                className="w-full h-10 rounded-md border border-gray-600 bg-gray-800 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">-- Aucun devis associé --</option>
                {devisList.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.numero} — {d.objet}
                  </option>
                ))}
              </select>
            </div>

            {/* Date d'échéance */}
            <div className="space-y-1.5">
              <Label htmlFor="dateEcheance">Date d&apos;échéance *</Label>
              <Input
                id="dateEcheance"
                type="date"
                value={dateEcheance}
                onChange={(e) => setDateEcheance(e.target.value)}
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Lignes de facture */}
        <Card>
          <CardHeader>
            <CardTitle>Lignes de facture</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm mb-4">
                <thead>
                  <tr className="border-b">
                    <th className="text-left pb-2 font-medium text-gray-400 pr-2">Désignation</th>
                    <th className="text-right pb-2 font-medium text-gray-400 w-20 pr-2">Qté</th>
                    <th className="text-right pb-2 font-medium text-gray-400 w-32 pr-2">Prix unit. HT</th>
                    <th className="text-right pb-2 font-medium text-gray-400 w-28 pr-2">Montant HT</th>
                    <th className="pb-2 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {lignes.map((ligne, index) => (
                    <tr key={index} className="border-b last:border-0">
                      <td className="py-2 pr-2">
                        <Input
                          placeholder="Description de la prestation"
                          value={ligne.designation}
                          onChange={(e) => updateLigne(index, "designation", e.target.value)}
                          required
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <Input
                          type="number"
                          min={1}
                          value={ligne.quantite}
                          onChange={(e) => updateLigne(index, "quantite", parseFloat(e.target.value) || 1)}
                          className="text-right"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={ligne.prixUnitaire}
                          onChange={(e) => updateLigne(index, "prixUnitaire", parseFloat(e.target.value) || 0)}
                          className="text-right"
                        />
                      </td>
                      <td className="py-2 pr-2 text-right font-medium text-gray-200">
                        {formatCurrency(ligne.montant)}
                      </td>
                      <td className="py-2">
                        <button
                          type="button"
                          onClick={() => removeLigne(index)}
                          disabled={lignes.length === 1}
                          className="text-gray-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={addLigne}
              className="inline-flex items-center gap-2 text-sm text-red-600 hover:text-red-400 font-medium"
            >
              <Plus className="h-4 w-4" /> Ajouter une ligne
            </button>

            {/* TVA toggle + Totaux */}
            <div className="mt-6 border-t pt-4">
              <div className="flex items-center gap-3 mb-4">
                <input
                  id="avecTVA"
                  type="checkbox"
                  checked={avecTVA}
                  onChange={(e) => setAvecTVA(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-600 text-red-600"
                />
                <label htmlFor="avecTVA" className="text-sm font-medium text-gray-300 cursor-pointer">
                  Appliquer la TVA ({TVA_RATE}%)
                </label>
              </div>
              <div className="flex flex-col items-end gap-1 text-sm">
                <div className="flex gap-8">
                  <span className="text-gray-400">Montant HT</span>
                  <span className="font-medium text-gray-200 w-32 text-right">
                    {formatCurrency(montantHT)}
                  </span>
                </div>
                {avecTVA && (
                  <div className="flex gap-8">
                    <span className="text-gray-400">TVA ({TVA_RATE}%)</span>
                    <span className="font-medium text-gray-200 w-32 text-right">
                      {formatCurrency(montantTVA)}
                    </span>
                  </div>
                )}
                <div className="flex gap-8 pt-2 border-t border-gray-700 mt-1">
                  <span className="font-semibold text-gray-100 text-base">{avecTVA ? "Total TTC" : "Total HT"}</span>
                  <span className="font-bold text-lg text-gray-100 w-32 text-right">
                    {formatCurrency(montantTTC)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Conditions de paiement, informations complémentaires..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link
            href="/commercial"
            className="inline-flex items-center rounded-md border border-gray-600 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors"
          >
            Annuler
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? "Création..." : "Créer la facture"}
          </Button>
        </div>
      </form>
    </div>
  );
}
