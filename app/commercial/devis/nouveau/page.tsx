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
type Contact = { id: string; nom: string; prenom: string; email: string };

type Ligne = {
  designation: string;
  quantite: number;
  prixUnitaire: number;
  montant: number;
};

function createLigne(): Ligne {
  return { designation: "", quantite: 1, prixUnitaire: 0, montant: 0 };
}

export default function NouveauDevisPage() {
  const router = useRouter();
  const [entreprises, setEntreprises] = useState<Entreprise[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [clientType, setClientType] = useState<"entreprise" | "contact">("entreprise");
  const [objet, setObjet] = useState("");
  const [entrepriseId, setEntrepriseId] = useState("");
  const [contactId, setContactId] = useState("");
  const [dateValidite, setDateValidite] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });
  const [lignes, setLignes] = useState<Ligne[]>([createLigne()]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/entreprises").then((r) => r.json()),
      fetch("/api/contacts").then((r) => r.json()),
    ]).then(([e, c]) => {
      setEntreprises(e);
      setContacts(c);
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
  const montantTVA = montantHT * (TVA_RATE / 100);
  const montantTTC = montantHT + montantTVA;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!objet.trim()) {
      setError("Veuillez renseigner l'objet du devis.");
      return;
    }
    if (clientType === "entreprise" && !entrepriseId) {
      setError("Veuillez sélectionner une entreprise.");
      return;
    }
    if (clientType === "contact" && !contactId) {
      setError("Veuillez sélectionner un contact.");
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

    const payload = {
      objet,
      entrepriseId: clientType === "entreprise" ? entrepriseId : null,
      contactId: clientType === "contact" ? contactId : null,
      dateValidite,
      tauxTVA: TVA_RATE,
      notes: notes || null,
      lignes: lignes.map((l) => ({
        designation: l.designation,
        quantite: l.quantite,
        prixUnitaire: l.prixUnitaire,
        montant: l.montant,
      })),
    };

    const res = await fetch("/api/devis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      router.push(`/commercial/devis/${data.id}`);
    } else {
      const data = await res.json();
      setError(data.error?.formErrors?.join(", ") || "Une erreur est survenue.");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link
          href="/commercial"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Retour au commercial
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Nouveau devis</h1>
        <p className="text-gray-500">Créez un nouveau devis pour un client</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Informations générales */}
        <Card>
          <CardHeader>
            <CardTitle>Informations générales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Objet */}
            <div className="space-y-1.5">
              <Label htmlFor="objet">Objet du devis *</Label>
              <Input
                id="objet"
                placeholder="Ex: Formation React pour l'équipe technique"
                value={objet}
                onChange={(e) => setObjet(e.target.value)}
                required
              />
            </div>

            {/* Type de client */}
            <div className="space-y-1.5">
              <Label>Type de client *</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="clientType"
                    value="entreprise"
                    checked={clientType === "entreprise"}
                    onChange={() => { setClientType("entreprise"); setContactId(""); }}
                    className="text-blue-600"
                  />
                  <span className="text-sm font-medium">Entreprise</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="clientType"
                    value="contact"
                    checked={clientType === "contact"}
                    onChange={() => { setClientType("contact"); setEntrepriseId(""); }}
                    className="text-blue-600"
                  />
                  <span className="text-sm font-medium">Contact</span>
                </label>
              </div>
            </div>

            {/* Sélection client */}
            {clientType === "entreprise" ? (
              <div className="space-y-1.5">
                <Label htmlFor="entrepriseId">Entreprise *</Label>
                <select
                  id="entrepriseId"
                  value={entrepriseId}
                  onChange={(e) => setEntrepriseId(e.target.value)}
                  className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Sélectionner une entreprise --</option>
                  {entreprises.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nom}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="contactId">Contact *</Label>
                <select
                  id="contactId"
                  value={contactId}
                  onChange={(e) => setContactId(e.target.value)}
                  className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Sélectionner un contact --</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.prenom} {c.nom} — {c.email}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Date de validité */}
            <div className="space-y-1.5">
              <Label htmlFor="dateValidite">Date de validité *</Label>
              <Input
                id="dateValidite"
                type="date"
                value={dateValidite}
                onChange={(e) => setDateValidite(e.target.value)}
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Lignes */}
        <Card>
          <CardHeader>
            <CardTitle>Lignes du devis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm mb-4">
                <thead>
                  <tr className="border-b">
                    <th className="text-left pb-2 font-medium text-gray-600 pr-2">Désignation</th>
                    <th className="text-right pb-2 font-medium text-gray-600 w-20 pr-2">Qté</th>
                    <th className="text-right pb-2 font-medium text-gray-600 w-32 pr-2">Prix unit. HT</th>
                    <th className="text-right pb-2 font-medium text-gray-600 w-28 pr-2">Montant HT</th>
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
                      <td className="py-2 pr-2 text-right font-medium text-gray-800">
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
              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              <Plus className="h-4 w-4" /> Ajouter une ligne
            </button>

            {/* Totaux */}
            <div className="mt-6 border-t pt-4">
              <div className="flex flex-col items-end gap-1 text-sm">
                <div className="flex gap-8">
                  <span className="text-gray-600">Montant HT</span>
                  <span className="font-medium text-gray-800 w-32 text-right">
                    {formatCurrency(montantHT)}
                  </span>
                </div>
                <div className="flex gap-8">
                  <span className="text-gray-600">TVA ({TVA_RATE}%)</span>
                  <span className="font-medium text-gray-800 w-32 text-right">
                    {formatCurrency(montantTVA)}
                  </span>
                </div>
                <div className="flex gap-8 pt-2 border-t border-gray-200 mt-1">
                  <span className="font-semibold text-gray-900 text-base">Total TTC</span>
                  <span className="font-bold text-lg text-gray-900 w-32 text-right">
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
              placeholder="Conditions particulières, informations complémentaires..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link
            href="/commercial"
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Annuler
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? "Création..." : "Créer le devis"}
          </Button>
        </div>
      </form>
    </div>
  );
}
