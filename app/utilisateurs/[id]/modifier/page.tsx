"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import Link from "next/link";

export default function ModifierUtilisateurPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    nom: "",
    prenom: "",
    role: "admin",
    actif: true,
    formateurId: "",
    entrepriseId: "",
  });
  const [formateurs, setFormateurs] = useState<{ id: string; nom: string; prenom: string }[]>([]);
  const [entreprises, setEntreprises] = useState<{ id: string; nom: string }[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/utilisateurs/${id}`).then((r) => r.json()),
      fetch("/api/formateurs").then((r) => r.json()),
      fetch("/api/entreprises").then((r) => r.json()),
    ]).then(([user, f, e]) => {
      setForm({
        email: user.email,
        nom: user.nom,
        prenom: user.prenom,
        role: user.role,
        actif: user.actif,
        formateurId: user.formateurId || "",
        entrepriseId: user.entrepriseId || "",
      });
      setFormateurs(f);
      setEntreprises(e);
      setLoading(false);
    });
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    const res = await fetch(`/api/utilisateurs/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      router.push("/utilisateurs");
    } else {
      const data = await res.json();
      setError(data.error || "Erreur lors de la modification");
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Supprimer ce compte utilisateur ? Cette action est irreversible.")) return;
    await fetch(`/api/utilisateurs/${id}`, { method: "DELETE" });
    router.push("/utilisateurs");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/utilisateurs" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Modifier le compte</h1>
        </div>
        <button
          onClick={handleDelete}
          className="flex items-center gap-2 text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg text-sm"
        >
          <Trash2 className="h-4 w-4" />
          Supprimer
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-6 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prenom</label>
            <input
              type="text"
              required
              value={form.prenom}
              onChange={(e) => setForm({ ...form, prenom: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
            <input
              type="text"
              required
              value={form.nom}
              onChange={(e) => setForm({ ...form, nom: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          >
            <option value="admin">Administrateur</option>
            <option value="formateur">Formateur</option>
            <option value="client">Client</option>
          </select>
        </div>

        {form.role === "formateur" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rattacher au formateur</label>
            <select
              value={form.formateurId}
              onChange={(e) => setForm({ ...form, formateurId: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Rattacher a l&apos;entreprise</label>
            <select
              value={form.entrepriseId}
              onChange={(e) => setForm({ ...form, entrepriseId: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
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

        <div className="flex items-center gap-3 pt-2">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={form.actif}
              onChange={(e) => setForm({ ...form, actif: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
          </label>
          <span className="text-sm text-gray-700">Compte actif</span>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
}
