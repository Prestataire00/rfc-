"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";

type Option = { id: string; nom: string; titre?: string };

export default function NouveauBesoinPage() {
  const router = useRouter();
  const [entreprises, setEntreprises] = useState<Option[]>([]);
  const [formations, setFormations] = useState<Option[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    titre: "",
    description: "",
    origine: "client",
    priorite: "normale",
    nbStagiaires: "",
    datesSouhaitees: "",
    budget: "",
    notes: "",
    entrepriseId: "",
    formationId: "",
  });

  useEffect(() => {
    fetch("/api/entreprises").then((r) => r.ok ? r.json() : []).then((d) => setEntreprises(Array.isArray(d) ? d : d.entreprises || []));
    fetch("/api/formations").then((r) => r.ok ? r.json() : []).then((d) => setFormations(Array.isArray(d) ? d : d.formations || []));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/besoins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const besoin = await res.json();
        router.push(`/besoins/${besoin.id}`);
      } else {
        const data = await res.json();
        const fieldErrors = data.error?.fieldErrors;
        if (fieldErrors) {
          setError(Object.values(fieldErrors).flat().join(", ") || "Erreur de validation");
        } else {
          setError(data.error?.message || data.error || "Erreur lors de la création");
        }
      }
    } catch {
      setError("Erreur de connexion au serveur");
    }
    setSaving(false);
  }

  return (
    <div>
      <PageHeader title="Nouveau besoin de formation" description="Qualifiez une demande de formation" />

      {error && (
        <div className="max-w-2xl mb-4 rounded-md bg-red-900/20 border border-red-700 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        <div className="rounded-lg border bg-gray-800 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Titre *</label>
            <input
              type="text"
              required
              value={form.titre}
              onChange={(e) => setForm({ ...form, titre: e.target.value })}
              className="w-full h-10 rounded-md border border-gray-600 px-3 text-sm"
              placeholder="Ex: Formation Excel avancée pour équipe comptabilité"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-md border border-gray-600 px-3 py-2 text-sm"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Origine</label>
              <select
                value={form.origine}
                onChange={(e) => setForm({ ...form, origine: e.target.value })}
                className="w-full h-10 rounded-md border border-gray-600 px-3 text-sm"
              >
                <option value="client">Client</option>
                <option value="stagiaire">Stagiaire</option>
                <option value="centre">Centre</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Priorité</label>
              <select
                value={form.priorite}
                onChange={(e) => setForm({ ...form, priorite: e.target.value })}
                className="w-full h-10 rounded-md border border-gray-600 px-3 text-sm"
              >
                <option value="basse">Basse</option>
                <option value="normale">Normale</option>
                <option value="haute">Haute</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Entreprise</label>
              <select
                value={form.entrepriseId}
                onChange={(e) => setForm({ ...form, entrepriseId: e.target.value })}
                className="w-full h-10 rounded-md border border-gray-600 px-3 text-sm"
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
                className="w-full h-10 rounded-md border border-gray-600 px-3 text-sm"
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
                className="w-full h-10 rounded-md border border-gray-600 px-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Budget</label>
              <input
                type="number"
                step="0.01"
                value={form.budget}
                onChange={(e) => setForm({ ...form, budget: e.target.value })}
                className="w-full h-10 rounded-md border border-gray-600 px-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Dates souhaitées</label>
              <input
                type="text"
                value={form.datesSouhaitees}
                onChange={(e) => setForm({ ...form, datesSouhaitees: e.target.value })}
                className="w-full h-10 rounded-md border border-gray-600 px-3 text-sm"
                placeholder="Ex: Mars 2026"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full rounded-md border border-gray-600 px-3 py-2 text-sm"
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
            {saving ? "Enregistrement..." : "Créer le besoin"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-md border border-gray-600 px-6 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700"
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}
