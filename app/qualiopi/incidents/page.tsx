"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Download, Pencil, Trash2, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

type Statut = "Ouvert" | "Clos";
type Source = "Entreprise" | "Apprenant" | "Formateur";
type Sujet = "Pedagogique" | "Administratif" | "Technique";
type Gravite = "Faible" | "Modere" | "Grave";

interface Incident {
  id: string;
  date: string;
  nom: string;
  description: string;
  statut: Statut;
  source: Source;
  sujet: Sujet;
  gravite: Gravite;
  formation: string;
  action_menee: string;
  date_cloture: string;
}

const STATUT_COLORS: Record<Statut, string> = {
  Ouvert: "bg-amber-900/30 text-amber-400 border-amber-700",
  Clos: "bg-emerald-900/30 text-emerald-400 border-emerald-700",
};

const GRAVITE_COLORS: Record<Gravite, string> = {
  Faible: "bg-blue-900/30 text-blue-400 border-blue-700",
  Modere: "bg-amber-900/30 text-amber-400 border-amber-700",
  Grave: "bg-red-900/30 text-red-400 border-red-700",
};

const EMPTY_FORM: Omit<Incident, "id"> = {
  date: new Date().toISOString().split("T")[0],
  nom: "", description: "", statut: "Ouvert", source: "Entreprise",
  sujet: "Pedagogique", gravite: "Faible", formation: "", action_menee: "", date_cloture: "",
};

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Omit<Incident, "id">>({ ...EMPTY_FORM });
  const [editItem, setEditItem] = useState<Incident | null>(null);
  const [error, setError] = useState("");
  const [filterStatut, setFilterStatut] = useState<string>("");

  const filtered = incidents.filter((i) => !filterStatut || i.statut === filterStatut);
  const ouverts = incidents.filter((i) => i.statut === "Ouvert").length;
  const clos = incidents.filter((i) => i.statut === "Clos").length;

  const handleAdd = () => {
    if (!form.nom.trim()) { setError("Le nom est requis."); return; }
    setError("");
    setIncidents((prev) => [{ id: Date.now().toString(), ...form }, ...prev]);
    setForm({ ...EMPTY_FORM });
    setModalOpen(false);
  };

  const handleSaveEdit = () => {
    if (!editItem) return;
    setIncidents((prev) => prev.map((i) => (i.id === editItem.id ? editItem : i)));
    setEditItem(null);
  };

  const handleDelete = (id: string) => {
    if (!window.confirm("Supprimer cet incident ?")) return;
    setIncidents((prev) => prev.filter((i) => i.id !== id));
  };

  const handleExportCSV = () => {
    const headers = ["Date", "Nom", "Description", "Statut", "Source", "Sujet", "Gravite", "Formation", "Action menee", "Date cloture"];
    const csvRows = [headers.join(";"), ...filtered.map((i) => [i.date, i.nom, i.description, i.statut, i.source, i.sujet, i.gravite, i.formation, i.action_menee, i.date_cloture].join(";"))];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "incidents.csv"; a.click();
  };

  const SelectField = ({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full h-10 rounded-md border border-gray-600 bg-gray-800 px-3 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  const FormFields = ({ data, onChange }: { data: Omit<Incident, "id">; onChange: (d: Omit<Incident, "id">) => void }) => (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={data.date} onChange={(e) => onChange({ ...data, date: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Nom <span className="text-red-500">*</span></Label><Input value={data.nom} onChange={(e) => onChange({ ...data, nom: e.target.value })} placeholder="Titre de l'incident" /></div>
      </div>
      <div className="space-y-1.5"><Label>Description</Label><Textarea value={data.description} onChange={(e) => onChange({ ...data, description: e.target.value })} placeholder="Details de l'incident..." rows={3} /></div>
      <div className="grid grid-cols-2 gap-4">
        <SelectField label="Statut" value={data.statut} onChange={(v) => onChange({ ...data, statut: v as Statut })} options={["Ouvert", "Clos"]} />
        <SelectField label="Source" value={data.source} onChange={(v) => onChange({ ...data, source: v as Source })} options={["Entreprise", "Apprenant", "Formateur"]} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <SelectField label="Sujet" value={data.sujet} onChange={(v) => onChange({ ...data, sujet: v as Sujet })} options={["Pedagogique", "Administratif", "Technique"]} />
        <SelectField label="Gravite" value={data.gravite} onChange={(v) => onChange({ ...data, gravite: v as Gravite })} options={["Faible", "Modere", "Grave"]} />
      </div>
      <div className="space-y-1.5"><Label>Formation concernee</Label><Input value={data.formation} onChange={(e) => onChange({ ...data, formation: e.target.value })} placeholder="Nom de la formation..." /></div>
      <div className="space-y-1.5"><Label>Action menee</Label><Textarea value={data.action_menee} onChange={(e) => onChange({ ...data, action_menee: e.target.value })} placeholder="Action corrective..." rows={2} /></div>
      {data.statut === "Clos" && (
        <div className="space-y-1.5"><Label>Date de cloture</Label><Input type="date" value={data.date_cloture} onChange={(e) => onChange({ ...data, date_cloture: e.target.value })} /></div>
      )}
    </div>
  );

  return (
    <div className="p-6">
      <Link href="/qualiopi" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-300 mb-4">
        <ArrowLeft className="h-4 w-4" /> Retour Qualiopi
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Incidents & Reclamations</h1>
          <p className="text-sm text-gray-400 mt-1">Gestion des incidents et reclamations — Qualiopi</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { setForm({ ...EMPTY_FORM }); setError(""); setModalOpen(true); }} className="gap-2 bg-red-600 hover:bg-red-700">
            <Plus className="h-4 w-4" /> Nouvel incident
          </Button>
          <button onClick={handleExportCSV} className="inline-flex items-center gap-2 rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors">
            <Download className="h-4 w-4" /> CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="cursor-pointer hover:border-gray-500" onClick={() => setFilterStatut("")}>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-gray-100">{incidents.length}</p>
            <p className="text-xs text-gray-400">Total</p>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer hover:border-gray-500 ${filterStatut === "Ouvert" ? "border-amber-700" : ""}`} onClick={() => setFilterStatut(filterStatut === "Ouvert" ? "" : "Ouvert")}>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-amber-400">{ouverts}</p>
            <p className="text-xs text-gray-400">Ouverts</p>
          </CardContent>
        </Card>
        <Card className={`cursor-pointer hover:border-gray-500 ${filterStatut === "Clos" ? "border-emerald-700" : ""}`} onClick={() => setFilterStatut(filterStatut === "Clos" ? "" : "Clos")}>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-emerald-400">{clos}</p>
            <p className="text-xs text-gray-400">Clos</p>
          </CardContent>
        </Card>
      </div>

      {/* Tableau */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-900 border-b border-gray-700">
              <th className="px-4 py-3 text-left font-semibold text-gray-400">Date</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-400">Nom</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-400">Source</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-400">Sujet</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-400">Gravite</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-400">Statut</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-16 text-center text-gray-500">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                <p className="text-sm">Aucun incident enregistre</p>
              </td></tr>
            ) : filtered.map((item) => (
              <tr key={item.id} className="border-b border-gray-700 hover:bg-gray-750 transition-colors">
                <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{item.date}</td>
                <td className="px-4 py-3 text-gray-200 font-medium max-w-[200px] truncate">{item.nom}</td>
                <td className="px-4 py-3 text-gray-400">{item.source}</td>
                <td className="px-4 py-3 text-gray-400">{item.sujet}</td>
                <td className="px-4 py-3"><span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${GRAVITE_COLORS[item.gravite]}`}>{item.gravite}</span></td>
                <td className="px-4 py-3"><span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUT_COLORS[item.statut]}`}>{item.statut}</span></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setEditItem({ ...item })} className="text-red-500 hover:underline text-xs font-medium">Modifier</button>
                    <button onClick={() => handleDelete(item.id)} className="text-gray-400 hover:text-red-400 text-xs">Supprimer</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Ajout */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-lg mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-100">Nouvel incident</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-200"><X className="h-5 w-5" /></button>
            </div>
            {error && <div className="mb-3 rounded-md bg-red-900/20 border border-red-700 px-3 py-2 text-sm text-red-400">{error}</div>}
            <FormFields data={form} onChange={(d) => setForm(d)} />
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-400">Annuler</button>
              <Button onClick={handleAdd} className="bg-red-600 hover:bg-red-700">Ajouter</Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edition */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-lg mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-100">Modifier l&apos;incident</h2>
              <button onClick={() => setEditItem(null)} className="text-gray-400 hover:text-gray-200"><X className="h-5 w-5" /></button>
            </div>
            <FormFields data={editItem} onChange={(d) => setEditItem({ ...editItem, ...d } as Incident)} />
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setEditItem(null)} className="px-4 py-2 text-sm text-gray-400">Annuler</button>
              <Button onClick={handleSaveEdit} className="bg-red-600 hover:bg-red-700">Enregistrer</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
