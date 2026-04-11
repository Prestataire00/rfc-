"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Download, Filter, Pencil, Trash2, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Amelioration {
  id: string;
  date: string;
  description: string;
  action_taken: string;
  result: string;
  responsible: string;
}

const EMPTY_FORM = {
  date: new Date().toISOString().split("T")[0],
  description: "",
  action_taken: "",
  result: "",
  responsible: "",
};

export default function AmeliorationPage() {
  const [items, setItems] = useState<Amelioration[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [editItem, setEditItem] = useState<Amelioration | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [error, setError] = useState("");

  const filtered = items.filter((item) => {
    if (dateFrom && item.date < dateFrom) return false;
    if (dateTo && item.date > dateTo) return false;
    return true;
  });

  const handleAdd = () => {
    if (!form.description.trim()) { setError("La description est requise."); return; }
    setError("");
    const newItem: Amelioration = { id: Date.now().toString(), ...form };
    setItems((prev) => [newItem, ...prev]);
    setForm({ ...EMPTY_FORM });
    setModalOpen(false);
  };

  const handleEdit = (item: Amelioration) => {
    setEditItem({ ...item });
    setModalOpen(false);
  };

  const handleSaveEdit = () => {
    if (!editItem) return;
    setItems((prev) => prev.map((i) => (i.id === editItem.id ? editItem : i)));
    setEditItem(null);
  };

  const handleDelete = (id: string) => {
    if (!window.confirm("Supprimer cette amelioration ?")) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleExportCSV = () => {
    const headers = ["Date", "Description", "Action menee", "Resultat", "Responsable"];
    const csvRows = [headers.join(";"), ...filtered.map((i) => [i.date, i.description, i.action_taken, i.result, i.responsible].join(";"))];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "amelioration-continue.csv"; a.click();
  };

  const FormFields = ({ data, onChange }: { data: typeof EMPTY_FORM; onChange: (d: typeof EMPTY_FORM) => void }) => (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Date</Label>
        <Input type="date" value={data.date} onChange={(e) => onChange({ ...data, date: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>Description <span className="text-red-500">*</span></Label>
        <Textarea value={data.description} onChange={(e) => onChange({ ...data, description: e.target.value })} placeholder="Decrivez le constat ou le probleme identifie..." rows={3} />
      </div>
      <div className="space-y-1.5">
        <Label>Action menee</Label>
        <Textarea value={data.action_taken} onChange={(e) => onChange({ ...data, action_taken: e.target.value })} placeholder="Action corrective ou preventive mise en place..." rows={2} />
      </div>
      <div className="space-y-1.5">
        <Label>Resultat</Label>
        <Input value={data.result} onChange={(e) => onChange({ ...data, result: e.target.value })} placeholder="Resultat observe apres l'action..." />
      </div>
      <div className="space-y-1.5">
        <Label>Responsable</Label>
        <Input value={data.responsible} onChange={(e) => onChange({ ...data, responsible: e.target.value })} placeholder="Nom du responsable..." />
      </div>
    </div>
  );

  return (
    <div className="p-6">
      <Link href="/qualiopi" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-300 mb-4">
        <ArrowLeft className="h-4 w-4" /> Retour Qualiopi
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Amelioration Continue</h1>
          <p className="text-sm text-gray-400 mt-1">Suivi des actions d&apos;amelioration — Critere Qualiopi n°32</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { setForm({ ...EMPTY_FORM }); setError(""); setModalOpen(true); }} className="gap-2 bg-red-600 hover:bg-red-700">
            <Plus className="h-4 w-4" /> Ajouter
          </Button>
          <button onClick={handleExportCSV} className="inline-flex items-center gap-2 rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors">
            <Download className="h-4 w-4" /> Exporter CSV
          </button>
        </div>
      </div>

      {/* Filtres date */}
      <Card className="mb-6">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Date de debut</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-auto" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date de fin</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-auto" />
            </div>
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(""); setDateTo(""); }} className="text-sm text-gray-400 hover:text-gray-300">Effacer</button>
            )}
          </div>
        </CardContent>
      </Card>

      <p className="text-sm text-gray-400 mb-3">{filtered.length} amelioration{filtered.length !== 1 ? "s" : ""}</p>

      {/* Tableau */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-900 border-b border-gray-700">
              <th className="px-4 py-3 text-left font-semibold text-gray-400">Date</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-400">Description</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-400">Action menee</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-400">Resultat</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-400">Responsable</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-16 text-center text-gray-500">
                <p className="text-3xl font-bold mb-2">0</p>
                <p className="text-sm">Aucune amelioration enregistree</p>
              </td></tr>
            ) : filtered.map((item) => (
              <tr key={item.id} className="border-b border-gray-700 hover:bg-gray-750 transition-colors">
                <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{item.date}</td>
                <td className="px-4 py-3 text-gray-300 max-w-[200px] truncate" title={item.description}>{item.description}</td>
                <td className="px-4 py-3 text-gray-400 max-w-[180px] truncate" title={item.action_taken}>{item.action_taken || "—"}</td>
                <td className="px-4 py-3 text-gray-400 max-w-[150px] truncate" title={item.result}>{item.result || "—"}</td>
                <td className="px-4 py-3 text-gray-400">{item.responsible || "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleEdit(item)} className="text-red-500 hover:underline text-xs font-medium">Modifier</button>
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
              <h2 className="text-lg font-semibold text-gray-100">Ajouter une amelioration</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-200"><X className="h-5 w-5" /></button>
            </div>
            {error && <div className="mb-3 rounded-md bg-red-900/20 border border-red-700 px-3 py-2 text-sm text-red-400">{error}</div>}
            <FormFields data={form} onChange={(d) => setForm(d)} />
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200">Annuler</button>
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
              <h2 className="text-lg font-semibold text-gray-100">Modifier l&apos;amelioration</h2>
              <button onClick={() => setEditItem(null)} className="text-gray-400 hover:text-gray-200"><X className="h-5 w-5" /></button>
            </div>
            <FormFields data={editItem} onChange={(d) => setEditItem({ ...editItem, ...d })} />
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setEditItem(null)} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200">Annuler</button>
              <Button onClick={handleSaveEdit} className="bg-red-600 hover:bg-red-700">Enregistrer</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
