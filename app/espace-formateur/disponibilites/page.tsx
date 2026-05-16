"use client";

import { useState } from "react";
import { CalendarDays, LayoutList, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatDate, cn } from "@/lib/utils";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/fetcher";
import { notify } from "@/lib/toast";
import { DispoCalendar } from "@/components/formateur/DispoCalendar";

type Dispo = {
  id: string;
  dateDebut: string;
  dateFin: string;
  type: string;
  notes: string | null;
};

type ViewMode = "calendar" | "list";

export default function DisponibilitesPage() {
  const [view, setView] = useState<ViewMode>("calendar");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ dateDebut: "", dateFin: "", type: "disponible", notes: "" });
  const [saving, setSaving] = useState(false);

  const { data, isLoading, mutate } = useApi<Dispo[]>("/api/formateur/disponibilites");
  const dispos: Dispo[] = data ?? [];
  const loading = isLoading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      // Validation basique côté UI : dateDebut <= dateFin
      if (!form.dateDebut || !form.dateFin) {
        notify.error("Renseignez date début et date fin");
        return;
      }
      if (new Date(form.dateDebut) > new Date(form.dateFin)) {
        notify.error("La date de début doit être avant la date de fin");
        return;
      }
      await api.post("/api/formateur/disponibilites", form);
      notify.success("Créneau ajouté");
      setShowForm(false);
      setForm({ dateDebut: "", dateFin: "", type: "disponible", notes: "" });
      await mutate();
    } catch (err) {
      // Affiche l'erreur réelle pour aider au diagnostic (avant : catch vide
      // qui masquait tout — typique cas "No formateur linked" sur un compte
      // formateur sans Formateur lié en BD).
      const msg =
        err instanceof Error && err.message
          ? err.message
          : "Impossible d'enregistrer le créneau";
      notify.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.delete(`/api/formateur/disponibilites/${id}`);
      await mutate();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Suppression impossible";
      notify.error(msg);
    }
  }

  // Ouvre le formulaire pré-rempli sur la date cliquée (workflow calendrier).
  function handleAddSlot(date: Date) {
    const iso = format(date, "yyyy-MM-dd");
    setForm({
      dateDebut: `${iso}T09:00`,
      dateFin: `${iso}T17:00`,
      type: "disponible",
      notes: "",
    });
    setShowForm(true);
  }

  return (
    <div>
      <PageHeader title="Mes Disponibilités" description="Gérez vos créneaux de disponibilité et d'indisponibilité" />

      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        {/* Toggle vue Calendrier / Liste */}
        <div className="inline-flex rounded-md border border-gray-700 overflow-hidden">
          <button
            onClick={() => setView("calendar")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors",
              view === "calendar"
                ? "bg-red-600 text-white"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700",
            )}
          >
            <CalendarDays className="h-4 w-4" /> Calendrier
          </button>
          <button
            onClick={() => setView("list")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors border-l border-gray-700",
              view === "list"
                ? "bg-red-600 text-white"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700",
            )}
          >
            <LayoutList className="h-4 w-4" /> Liste
          </button>
        </div>

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
      ) : view === "calendar" ? (
        <DispoCalendar dispos={dispos} onAddSlot={handleAddSlot} onDelete={handleDelete} />
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
