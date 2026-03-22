"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";

export default function NouvelUtilisateurPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    password: "",
    nom: "",
    prenom: "",
    role: "admin",
    formateurId: "",
    entrepriseId: "",
  });
  const [formateurs, setFormateurs] = useState<{ id: string; nom: string; prenom: string }[]>([]);
  const [entreprises, setEntreprises] = useState<{ id: string; nom: string }[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/formateurs").then((r) => r.ok ? r.json() : []),
      fetch("/api/entreprises").then((r) => r.ok ? r.json() : []),
    ]).then(([f, e]) => {
      setFormateurs(f);
      setEntreprises(e);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    const res = await fetch("/api/utilisateurs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      router.push("/utilisateurs");
    } else {
      const data = await res.json();
      setError(data.error || "Erreur lors de la création");
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/utilisateurs" className="p-2 hover:bg-gray-700 rounded-lg">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-100">Nouveau compte utilisateur</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-gray-800 border rounded-xl p-6 space-y-4">
        {error && (
          <div className="bg-red-900/20 border border-red-700 text-red-400 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Prénom *</label>
            <input
              type="text"
              required
              value={form.prenom}
              onChange={(e) => setForm({ ...form, prenom: e.target.value })}
              className="w-full border border-gray-600 bg-gray-900 text-gray-100 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Nom *</label>
            <input
              type="text"
              required
              value={form.nom}
              onChange={(e) => setForm({ ...form, nom: e.target.value })}
              className="w-full border border-gray-600 bg-gray-900 text-gray-100 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Email *</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full border border-gray-600 bg-gray-900 text-gray-100 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Mot de passe *</label>
          <input
            type="password"
            required
            minLength={6}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full border border-gray-600 bg-gray-900 text-gray-100 rounded-lg px-3 py-2 text-sm"
            placeholder="Minimum 6 caractères"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Rôle *</label>
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value, formateurId: "", entrepriseId: "" })}
            className="w-full border border-gray-600 bg-gray-900 text-gray-100 rounded-lg px-3 py-2 text-sm"
          >
            <option value="admin">Administrateur</option>
            <option value="formateur">Formateur</option>
            <option value="client">Client</option>
          </select>
        </div>

        {form.role === "formateur" && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Rattacher au formateur</label>
            <select
              value={form.formateurId}
              onChange={(e) => setForm({ ...form, formateurId: e.target.value })}
              className="w-full border border-gray-600 bg-gray-900 text-gray-100 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">— Aucun —</option>
              {formateurs.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.prenom} {f.nom}
                </option>
              ))}
            </select>
          </div>
        )}

        {form.role === "client" && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Rattacher à l&apos;entreprise</label>
            <select
              value={form.entrepriseId}
              onChange={(e) => setForm({ ...form, entrepriseId: e.target.value })}
              className="w-full border border-gray-600 bg-gray-900 text-gray-100 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">— Aucune —</option>
              {entreprises.map((ent) => (
                <option key={ent.id} value={ent.id}>
                  {ent.nom}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 text-sm font-medium disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "Création..." : "Créer le compte"}
          </button>
        </div>
      </form>
    </div>
  );
}
