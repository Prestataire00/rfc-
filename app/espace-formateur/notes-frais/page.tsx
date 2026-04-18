"use client";

import { useState, useEffect } from "react";
import { Receipt, Plus, CheckCircle2, Clock, XCircle, CreditCard, Upload } from "lucide-react";

type NoteFrais = {
  id: string;
  categorie: string;
  description: string;
  montant: number;
  date: string;
  lieu: string | null;
  justificatifUrl: string | null;
  justificatifNom: string | null;
  statut: string;
  commentaireAdmin: string | null;
  createdAt: string;
};

const CATEGORIES = [
  { value: "transport", label: "Transport" },
  { value: "hebergement", label: "Hebergement" },
  { value: "repas", label: "Repas" },
  { value: "materiel", label: "Materiel" },
  { value: "autre", label: "Autre" },
];

const STATUT_STYLES: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  soumise: { icon: Clock, color: "text-amber-400", label: "Soumise" },
  approuvee: { icon: CheckCircle2, color: "text-emerald-400", label: "Approuvee" },
  rejetee: { icon: XCircle, color: "text-red-400", label: "Rejetee" },
  payee: { icon: CreditCard, color: "text-blue-400", label: "Payee" },
};

export default function NotesFraisPage() {
  const [notes, setNotes] = useState<NoteFrais[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form
  const [categorie, setCategorie] = useState("transport");
  const [description, setDescription] = useState("");
  const [montant, setMontant] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [lieu, setLieu] = useState("");

  const load = () => {
    fetch("/api/notes-frais").then((r) => r.ok ? r.json() : []).then((d) => {
      setNotes(Array.isArray(d) ? d : []);
      setLoading(false);
    });
  };

  useEffect(load, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/notes-frais", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categorie, description, montant: parseFloat(montant), date, lieu: lieu || null }),
    });
    if (res.ok) {
      setShowForm(false);
      setDescription("");
      setMontant("");
      setLieu("");
      load();
    }
    setSaving(false);
  };

  const totalEnAttente = notes.filter((n) => n.statut === "soumise").reduce((s, n) => s + n.montant, 0);

  if (loading) {
    return <div className="flex justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <Receipt className="h-6 w-6 text-red-500" /> Mes notes de frais
          </h1>
          {totalEnAttente > 0 && (
            <p className="text-sm text-amber-400 mt-1">{totalEnAttente.toFixed(2)} EUR en attente d&apos;approbation</p>
          )}
        </div>
        <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-2 rounded-md bg-red-600 hover:bg-red-700 px-4 py-2 text-sm font-medium text-white">
          <Plus className="h-4 w-4" /> Nouvelle note
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-lg border border-gray-700 bg-gray-800 p-5 mb-6 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Categorie</label>
              <select value={categorie} onChange={(e) => setCategorie(e.target.value)} className="w-full h-10 rounded-md border border-gray-600 bg-gray-900 text-sm text-gray-100 px-3">
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Montant (EUR)</label>
              <input type="number" step="0.01" min="0" value={montant} onChange={(e) => setMontant(e.target.value)} required className="w-full h-10 rounded-md border border-gray-600 bg-gray-900 text-sm text-gray-100 px-3" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="w-full h-10 rounded-md border border-gray-600 bg-gray-900 text-sm text-gray-100 px-3" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Lieu</label>
              <input value={lieu} onChange={(e) => setLieu(e.target.value)} className="w-full h-10 rounded-md border border-gray-600 bg-gray-900 text-sm text-gray-100 px-3" placeholder="ex: Toulon" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Description</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} required className="w-full h-10 rounded-md border border-gray-600 bg-gray-900 text-sm text-gray-100 px-3" placeholder="ex: Trajet aller-retour Marseille-Toulon" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200">Annuler</button>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-red-600 hover:bg-red-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              <Upload className="h-4 w-4" /> {saving ? "..." : "Soumettre"}
            </button>
          </div>
        </form>
      )}

      {notes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-600 bg-gray-800/50 p-12 text-center">
          <Receipt className="h-10 w-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">Aucune note de frais.</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-gray-800 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 border-b border-gray-700">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-400">Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-400">Categorie</th>
                <th className="text-left px-4 py-3 font-medium text-gray-400">Description</th>
                <th className="text-right px-4 py-3 font-medium text-gray-400">Montant</th>
                <th className="text-left px-4 py-3 font-medium text-gray-400">Statut</th>
              </tr>
            </thead>
            <tbody>
              {notes.map((n) => {
                const style = STATUT_STYLES[n.statut] || STATUT_STYLES.soumise;
                const Icon = style.icon;
                return (
                  <tr key={n.id} className="border-b border-gray-700 last:border-0">
                    <td className="px-4 py-3 text-gray-300">{new Date(n.date).toLocaleDateString("fr-FR")}</td>
                    <td className="px-4 py-3 text-gray-300 capitalize">{n.categorie}</td>
                    <td className="px-4 py-3 text-gray-200">{n.description}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-100">{n.montant.toFixed(2)} EUR</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${style.color}`}>
                        <Icon className="h-3 w-3" /> {style.label}
                      </span>
                      {n.commentaireAdmin && <p className="text-[10px] text-gray-500 mt-0.5">{n.commentaireAdmin}</p>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
