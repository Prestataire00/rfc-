"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, FileText } from "lucide-react";
import { notify } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { TVA_RATE } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { AIButton } from "@/components/shared/AIButton";
import { useApi, useApiMutation, ApiError } from "@/hooks/useApi";
import { api } from "@/lib/fetcher";

type Entreprise = { id: string; nom: string };
type Contact = { id: string; nom: string; prenom: string; email: string; entrepriseId?: string | null };
type BesoinDetail = {
  titre?: string;
  formation?: { titre: string; tarif: number } | null;
  entrepriseId?: string | null;
  nbStagiaires?: number | null;
};
type DevisCreated = { id: string; numero: string };

type Ligne = {
  designation: string;
  quantite: number;
  prixUnitaire: number;
  montant: number;
};

function createLigne(): Ligne {
  return { designation: "", quantite: 1, prixUnitaire: 0, montant: 0 };
}

function formatLigneValue(val: number): string {
  return val === 0 ? "" : String(val);
}

function NouveauDevisForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const besoinId = searchParams.get("besoinId");
  const paramEntrepriseId = searchParams.get("entrepriseId");
  const paramContactId = searchParams.get("contactId");
  const [error, setError] = useState("");
  const [besoinTitre, setBesoinTitre] = useState<string | null>(null);

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
  const [avecTVA, setAvecTVA] = useState(true);

  const { data: entreprisesRaw } = useApi<Entreprise[]>("/api/entreprises");
  const { data: contactsRaw } = useApi<{ data: Contact[] } | Contact[]>("/api/contacts?limit=100");
  const { data: besoin } = useApi<BesoinDetail>(besoinId ? `/api/besoins/${besoinId}` : null);
  const { trigger: createDevis, isMutating: loading } = useApiMutation<Record<string, unknown>, DevisCreated>(
    "/api/devis",
    "POST"
  );

  const entreprises: Entreprise[] = Array.isArray(entreprisesRaw) ? entreprisesRaw : [];
  const contacts: Contact[] = Array.isArray(contactsRaw)
    ? contactsRaw
    : Array.isArray(contactsRaw?.data)
      ? contactsRaw.data
      : [];

  // Pre-fill from URL params (once)
  useEffect(() => {
    if (paramEntrepriseId) {
      setClientType("entreprise");
      setEntrepriseId(paramEntrepriseId);
    }
    if (paramContactId) {
      setContactId(paramContactId);
    }
  }, [paramEntrepriseId, paramContactId]);

  useEffect(() => {
    if (!besoin) return;
    setBesoinTitre(besoin.titre || null);
    // Pré-remplir l'objet
    setObjet(besoin.formation?.titre ? `Formation ${besoin.formation.titre}` : besoin.titre || "");
    // Pré-remplir l'entreprise
    if (besoin.entrepriseId) {
      setClientType("entreprise");
      setEntrepriseId(besoin.entrepriseId);
    }
    // Pré-remplir une ligne si une formation est liée
    if (besoin.formation) {
      const qty = besoin.nbStagiaires || 1;
      const prix = besoin.formation.tarif;
      setLignes([{
        designation: besoin.formation.titre,
        quantite: qty,
        prixUnitaire: prix,
        montant: Math.round(qty * prix * 100) / 100,
      }]);
    }
  }, [besoin]);

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

    const payload = {
      objet,
      entrepriseId: clientType === "entreprise" ? entrepriseId : null,
      contactId: contactId || null,
      dateValidite,
      tauxTVA: tauxTVA,
      notes: notes || null,
      lignes: lignes.map((l) => ({
        designation: l.designation,
        quantite: l.quantite,
        prixUnitaire: l.prixUnitaire,
        montant: l.montant,
      })),
    };

    try {
      const data = await createDevis(payload);
      // Lier le devis au besoin et passer le statut à "devis_envoye"
      if (besoinId) {
        try {
          await api.patch(`/api/besoins/${besoinId}`, { devisId: data.id, statut: "devis_envoye" });
        } catch {
          // non-bloquant
        }
      }
      notify.success("Devis cree", data.numero);
      router.push(`/commercial/devis/${data.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as { error?: unknown } | null;
        const errBody = body?.error;
        if (errBody && typeof errBody === "object" && "fieldErrors" in errBody) {
          const msgs = Object.values((errBody as { fieldErrors: Record<string, string[]> }).fieldErrors)
            .flat()
            .join(", ");
          setError(msgs || "Erreur de validation");
        } else if (errBody && typeof errBody === "object" && "formErrors" in errBody) {
          const fe = (errBody as { formErrors: string[] }).formErrors;
          setError(fe?.length ? fe.join(", ") : err.message || "Une erreur est survenue.");
        } else if (typeof errBody === "string") {
          setError(errBody);
        } else {
          setError(err.message || "Une erreur est survenue.");
        }
      } else {
        setError("Une erreur est survenue.");
      }
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
        <h1 className="text-2xl font-bold text-gray-100">Nouveau devis</h1>
        <p className="text-gray-400">Créez un nouveau devis pour un client</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {besoinTitre && (
          <div className="rounded-md bg-blue-900/20 border border-blue-700 px-4 py-3 text-sm text-blue-300 flex items-center gap-2">
            <FileText className="h-4 w-4 shrink-0" />
            Formulaire pré-rempli depuis le besoin : <span className="font-semibold">{besoinTitre}</span>
          </div>
        )}
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
            {/* Objet */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="objet">Objet du devis *</Label>
                <AIButton endpoint="/api/ai/devis" payload={{ action: "objet", entrepriseId: entrepriseId || undefined }} onResult={(t) => setObjet(t)} />
              </div>
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
                    className="text-red-600"
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
                    className="text-red-600"
                  />
                  <span className="text-sm font-medium">Contact individuel</span>
                </label>
              </div>
            </div>

            {/* Sélection client */}
            {clientType === "entreprise" ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="entrepriseId">Entreprise *</Label>
                  <select
                    id="entrepriseId"
                    value={entrepriseId}
                    onChange={(e) => { setEntrepriseId(e.target.value); setContactId(""); }}
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
                {entrepriseId && (
                  <div className="space-y-1.5">
                    <Label htmlFor="contactId">Contact de l'entreprise (optionnel)</Label>
                    <select
                      id="contactId"
                      value={contactId}
                      onChange={(e) => setContactId(e.target.value)}
                      className="w-full h-10 rounded-md border border-gray-600 bg-gray-800 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="">-- Aucun contact --</option>
                      {contacts
                        .filter((c) => c.entrepriseId === entrepriseId || !entrepriseId)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.prenom} {c.nom} — {c.email}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="contactId">Contact *</Label>
                <select
                  id="contactId"
                  value={contactId}
                  onChange={(e) => setContactId(e.target.value)}
                  className="w-full h-10 rounded-md border border-gray-600 bg-gray-800 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
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
                          value={formatLigneValue(ligne.prixUnitaire)}
                          onChange={(e) => updateLigne(index, "prixUnitaire", parseFloat(e.target.value) || 0)}
                          className="text-right"
                          placeholder="0.00"
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
            <div className="flex items-center justify-between">
              <CardTitle>Notes</CardTitle>
              <AIButton endpoint="/api/ai/devis" payload={{ action: "notes", entrepriseId: entrepriseId || undefined }} onResult={(t) => setNotes(t)} />
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Conditions particulieres, informations complementaires..."
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
            {loading ? "Création..." : "Créer le devis"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function NouveauDevisPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" /></div>}>
      <NouveauDevisForm />
    </Suspense>
  );
}
