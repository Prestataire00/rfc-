"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { useApi, useApiMutation } from "@/hooks/useApi";
import { ApiError } from "@/lib/fetcher";

type UserData = {
  email: string;
  nom: string;
  prenom: string;
  role: string;
  actif: boolean;
  formateurId?: string | null;
  entrepriseId?: string | null;
};

export default function ModifierUtilisateurPage() {
  const { id } = useParams() as { id: string };
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
  const [error, setError] = useState("");

  const { data: user, error: userError, isLoading: userLoading } = useApi<UserData>(`/api/utilisateurs/${id}`);
  const { data: formateursData, isLoading: formateursLoading } = useApi<{ id: string; nom: string; prenom: string }[]>("/api/formateurs");
  const { data: entreprisesData, isLoading: entreprisesLoading } = useApi<{ id: string; nom: string }[]>("/api/entreprises");
  const { trigger: updateUser, isMutating: saving } = useApiMutation<typeof form>(`/api/utilisateurs/${id}`, "PUT");
  const { trigger: deleteUser } = useApiMutation(`/api/utilisateurs/${id}`, "DELETE");

  const formateurs = Array.isArray(formateursData) ? formateursData : [];
  const entreprises = Array.isArray(entreprisesData) ? entreprisesData : [];
  const loading = userLoading || formateursLoading || entreprisesLoading;

  useEffect(() => {
    if (!user) return;
    setForm({
      email: user.email,
      nom: user.nom,
      prenom: user.prenom,
      role: user.role,
      actif: user.actif,
      formateurId: user.formateurId || "",
      entrepriseId: user.entrepriseId || "",
    });
  }, [user]);

  useEffect(() => {
    if (userError) setError("Utilisateur non trouvé");
  }, [userError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      await updateUser(form);
      router.push("/utilisateurs");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "Erreur lors de la modification");
      } else {
        setError("Erreur lors de la modification");
      }
    }
  };

  const handleDelete = async () => {
    if (!confirm("Supprimer ce compte utilisateur ? Cette action est irréversible.")) return;
    await deleteUser();
    router.push("/utilisateurs");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/utilisateurs" className="p-2 hover:bg-gray-700 rounded-lg">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-100">Modifier le compte</h1>
        </div>
        <button
          onClick={handleDelete}
          className="flex items-center gap-2 text-red-600 hover:bg-red-900/20 px-3 py-2 rounded-lg text-sm"
        >
          <Trash2 className="h-4 w-4" />
          Supprimer
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-gray-800 border rounded-xl p-6 space-y-4">
        {error && (
          <div className="bg-red-900/20 border border-red-700 text-red-400 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Prénom</label>
            <input
              type="text"
              required
              value={form.prenom}
              onChange={(e) => setForm({ ...form, prenom: e.target.value })}
              className="w-full border border-gray-600 bg-gray-900 text-gray-100 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Nom</label>
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
          <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full border border-gray-600 bg-gray-900 text-gray-100 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Rôle</label>
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
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

        <div className="flex items-center gap-3 pt-2">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={form.actif}
              onChange={(e) => setForm({ ...form, actif: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-red-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-800 after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
          </label>
          <span className="text-sm text-gray-300">Compte actif</span>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 text-sm font-medium disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
}
