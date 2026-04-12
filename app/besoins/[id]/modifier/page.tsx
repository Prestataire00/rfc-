"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { AIButton } from "@/components/shared/AIButton";

type Option = { id: string; nom: string; titre?: string };

export default function ModifierBesoinPage() {
  const router = useRouter();
  const { id } = useParams();
  const [entreprises, setEntreprises] = useState<Option[]>([]);
  const [formations, setFormations] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    titre: "",
    description: "",
    origine: "client",
    priorite: "normale",
    statut: "nouveau",
    nbStagiaires: "",
    datesSouhaitees: "",
    budget: "",
    notes: "",
    entrepriseId: "",
    formationId: "",
  });

  useEffect(() => {
    Promise.all([
      fetch(`/api/besoins/${id}`).then((r) => r.ok ? r.json() : null),
      fetch("/api/entreprises").then((r) => r.ok ? r.json() : []),
      fetch("/api/formations").then((r) => r.ok ? r.json() : []),
    ]).then(([besoin, ent, form]) => {
      if (besoin) {
        setForm({
          titre: besoin.titre || "",
          description: besoin.description || "",
          origine: besoin.origine || "client",
          priorite: besoin.priorite || "normale",
          statut: besoin.statut || "nouveau",
          nbStagiaires: besoin.nbStagiaires?.toString() || "",
          datesSouhaitees: besoin.datesSouhaitees || "",
          budget: besoin.budget?.toString() || "",
          notes: besoin.notes || "",
          entrepriseId: besoin.entrepriseId || "",
          formationId: besoin.formationId || "",
        });
      }
      setEntreprises(Array.isArray(ent) ? ent : ent.entreprises || []);
      setFormations(Array.isArray(form) ? form : form.formations || []);
      setLoading(false);
    });
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/besoins/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        router.push(`/besoins/${id}`);
      } else {
        const data = await res.json();
        const fieldErrors = data.error?.fieldErrors;
        if (fieldErrors) {
          setError(Object.values(fieldErrors).flat().join(", ") || "Erreur de validation");
        } else {
          setError(data.error?.message || data.error || "Erreur lors de la mise a jour");
        }
      }
    } catch {
      setError("Erreur de connexion au serveur");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <Link href={`/besoins/${id}`} className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-300 mb-4">
        <ArrowLeft className="h-4 w-4" /> Retour au besoin
      </Link>

      <PageHeader title="Modifier le besoin" description="Modifiez les informations du besoin de formation" />

      {error && (
        <div className="max-w-2xl mb-4 rounded-md bg-red-900/20 border border-red-700 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Titre *</label>
            <input
              type="text"
              required
              value={form.titre}
              onChange={(e) => setForm({ ...form, titre: e.target.value })}
              className="w-full h-10 rounded-md border border-gray-600 bg-gray-900 px-3 text-sm text-gray-100"
              placeholder="Ex: Formation Excel avancee pour equipe comptabilite"
            />
          </div>

          <div className="rounded-lg border border-red-700/30 bg-red-900/5 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-semibold text-gray-100">Descriptif de la demande</label>
                <p className="text-xs text-gray-400 mt-0.5">Contexte, objectifs, contraintes, delais, public cible...</p>
              </div>
              <AIButton
                endpoint="/api/ai/besoin"
                payload={{ action: "brief", titre: form.titre, description: form.description, origine: form.origine, nbStagiaires: form.nbStagiaires, entrepriseId: form.entrepriseId }}
                onResult={(t) => setForm({ ...form, description: t })}
                label="Generer un brief IA"
              />
            </div>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-md border border-gray-600 bg-gray-900 px-3 py-2.5 text-sm text-gray-100 resize-y min-h-[140px]"
              rows={6}
              placeholder="Contexte, objectifs, contraintes, delais..."
            />
            <p className="text-xs text-gray-500 text-right">{form.description.length} caracteres</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Origine</label>
              <select
                value={form.origine}
                onChange={(e) => setForm({ ...form, origine: e.target.value })}
                className="w-full h-10 rounded-md border border-gray-600 bg-gray-900 px-3 text-sm text-gray-100"
              >
                <option value="client">Client</option>
                <option value="stagiaire">Stagiaire</option>
                <option value="centre">Centre</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Priorite</label>
              <select
                value={form.priorite}
                onChange={(e) => setForm({ ...form, priorite: e.target.value })}
                className="w-full h-10 rounded-md border border-gray-600 bg-gray-900 px-3 text-sm text-gray-100"
              >
                <option value="basse">Basse</option>
                <option value="normale">Normale</option>
                <option value="haute">Haute</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Statut</label>
            <select
              value={form.statut}
              onChange={(e) => setForm({ ...form, statut: e.target.value })}
              className="w-full h-10 rounded-md border border-gray-600 bg-gray-900 px-3 text-sm text-gray-100"
            >
              <option value="nouveau">Nouveau</option>
              <option value="qualification">Qualification</option>
              <option value="propose">Propose</option>
              <option value="accepte">Accepte</option>
              <option value="refuse">Refuse</option>
              <option value="planifie">Planifie</option>
              <option value="termine">Termine</option>
              <option value="annule">Annule</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Entreprise</label>
              <select
                value={form.entrepriseId}
                onChange={(e) => setForm({ ...form, entrepriseId: e.target.value })}
                className="w-full h-10 rounded-md border border-gray-600 bg-gray-900 px-3 text-sm text-gray-100"
              >
                <option value="">-- Aucune --</option>
                {entreprises.map((e) => (
                  <option key={e.id} value={e.id}>{e.nom}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Formation</label>
              <select
                value={form.formationId}
                onChange={(e) => setForm({ ...form, formationId: e.target.value })}
                className="w-full h-10 rounded-md border border-gray-600 bg-gray-900 px-3 text-sm text-gray-100"
              >
                <option value="">-- Aucune --</option>
                {formations.map((f: any) => (
                  <option key={f.id} value={f.id}>{f.titre}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Nb stagiaires</label>
              <input
                type="number"
                value={form.nbStagiaires}
                onChange={(e) => setForm({ ...form, nbStagiaires: e.target.value })}
                className="w-full h-10 rounded-md border border-gray-600 bg-gray-900 px-3 text-sm text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Budget</label>
              <input
                type="number"
                step="0.01"
                value={form.budget}
                onChange={(e) => setForm({ ...form, budget: e.target.value })}
                className="w-full h-10 rounded-md border border-gray-600 bg-gray-900 px-3 text-sm text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Dates souhaitees</label>
              <input
                type="text"
                value={form.datesSouhaitees}
                onChange={(e) => setForm({ ...form, datesSouhaitees: e.target.value })}
                className="w-full h-10 rounded-md border border-gray-600 bg-gray-900 px-3 text-sm text-gray-100"
                placeholder="Ex: Mars 2026"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full rounded-md border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-100"
              rows={2}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-red-600 px-6 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {saving ? "Enregistrement..." : "Enregistrer les modifications"}
          </button>
          <Link
            href={`/besoins/${id}`}
            className="rounded-md border border-gray-600 px-6 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700"
          >
            Annuler
          </Link>
        </div>
      </form>
    </div>
  );
}
