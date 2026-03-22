"use client";

import { useState, useEffect, useCallback } from "react";
import { CalendarDays, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatDate } from "@/lib/utils";

type Dispo = {
  id: string;
  dateDebut: string;
  dateFin: string;
  type: string;
  notes: string | null;
};

export default function DisponibilitesPage() {
  const [dispos, setDispos] = useState<Dispo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ dateDebut: "", dateFin: "", type: "disponible", notes: "" });
  const [saving, setSaving] = useState(false);

  const fetchDispos = useCallback(async () => {
    const res = await fetch("/api/formateur/disponibilites");
    if (res.ok) setDispos(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchDispos(); }, [fetchDispos]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/formateur/disponibilites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setShowForm(false);
      setForm({ dateDebut: "", dateFin: "", type: "disponible", notes: "" });
      fetchDispos();
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    await fetch(`/api/formateur/disponibilites/${id}`, { method: "DELETE" });
    fetchDispos();
  }

  return (
    <div>
      <PageHeader title="Mes Disponibilités" description="Gérez vos créneaux de disponibilité et d'indisponibilité" />

      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          <Plus className="h-4 w-4" /> Ajouter un créneau
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-lg border bg-gray-800 p-6 mb-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Date debut *</label>
              <input
                type="date"
                required
                value={form.dateDebut}
                onChange={(e) => setForm({ ...form, dateDebut: e.target.value })}
                className="w-full h-10 rounded-md border border-gray-600 px-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Date fin *</label>
              <input
                type="date"
                required
                value={form.dateFin}
                onChange={(e) => setForm({ ...form, dateFin: e.target.value })}
                className="w-full h-10 rounded-md border border-gray-600 px-3 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full h-10 rounded-md border border-gray-600 px-3 text-sm"
              >
                <option value="disponible">Disponible</option>
                <option value="indisponible">Indisponible</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full h-10 rounded-md border border-gray-600 px-3 text-sm"
                placeholder="Optionnel"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50">
              {saving ? "Enregistrement..." : "Ajouter"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-md border px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">
              Annuler
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" /></div>
      ) : dispos.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Aucun créneau enregistré</div>
      ) : (
        <div className="rounded-lg border bg-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-400">Date debut</th>
                <th className="text-left px-4 py-3 font-medium text-gray-400">Date fin</th>
                <th className="text-left px-4 py-3 font-medium text-gray-400">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-400">Notes</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {dispos.map((d) => (
                <tr key={d.id} className="border-b last:border-0">
                  <td className="px-4 py-3">{formatDate(d.dateDebut)}</td>
                  <td className="px-4 py-3">{formatDate(d.dateFin)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${d.type === "disponible" ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"}`}>
                      {d.type === "disponible" ? "Disponible" : "Indisponible"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{d.notes || "—"}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(d.id)} className="text-red-500 hover:text-red-400">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
