"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, Shield, UserCheck, UserX, KeyRound } from "lucide-react";

type User = {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  role: string;
  actif: boolean;
  createdAt: string;
  formateur?: { nom: string; prenom: string } | null;
  entreprise?: { nom: string } | null;
};

const roleBadge: Record<string, { label: string; class: string }> = {
  admin: { label: "Admin", class: "bg-purple-900/30 text-purple-400" },
  formateur: { label: "Formateur", class: "bg-red-900/30 text-red-400" },
  client: { label: "Client", class: "bg-green-900/30 text-green-400" },
};

export default function UtilisateursPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetMsg, setResetMsg] = useState("");

  useEffect(() => {
    fetch("/api/utilisateurs")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => {
        setUsers(data);
        setLoading(false);
      });
  }, []);

  const toggleActif = async (user: User) => {
    await fetch(`/api/utilisateurs/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actif: !user.actif }),
    });
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, actif: !u.actif } : u)));
  };

  const handleResetPassword = async () => {
    if (!resetUserId || !newPassword) return;
    const res = await fetch(`/api/utilisateurs/${resetUserId}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword }),
    });
    if (res.ok) {
      setResetMsg("Mot de passe modifie avec succes");
      setNewPassword("");
      setTimeout(() => {
        setResetUserId(null);
        setResetMsg("");
      }, 2000);
    } else {
      const data = await res.json();
      setResetMsg(data.error || "Erreur");
    }
  };

  const filtered = users.filter((u) => {
    const matchSearch =
      !search ||
      `${u.prenom} ${u.nom} ${u.email}`.toLowerCase().includes(search.toLowerCase());
    const matchRole = !roleFilter || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Gestion des utilisateurs</h1>
          <p className="text-sm text-gray-400 mt-1">{users.length} compte(s)</p>
        </div>
        <Link
          href="/utilisateurs/nouveau"
          className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          Nouveau compte
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par nom ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Tous les roles</option>
          <option value="admin">Admin</option>
          <option value="formateur">Formateur</option>
          <option value="client">Client</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-gray-800 border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-900 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-400">Utilisateur</th>
              <th className="text-left px-4 py-3 font-medium text-gray-400">Email</th>
              <th className="text-left px-4 py-3 font-medium text-gray-400">Role</th>
              <th className="text-left px-4 py-3 font-medium text-gray-400">Rattachement</th>
              <th className="text-left px-4 py-3 font-medium text-gray-400">Statut</th>
              <th className="text-right px-4 py-3 font-medium text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((user) => (
              <tr key={user.id} className="hover:bg-gray-700">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-red-900/30 flex items-center justify-center text-red-400 font-semibold text-xs">
                      {user.prenom[0]}
                      {user.nom[0]}
                    </div>
                    <span className="font-medium text-gray-100">
                      {user.prenom} {user.nom}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-400">{user.email}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleBadge[user.role]?.class || "bg-gray-700"}`}>
                    {roleBadge[user.role]?.label || user.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {user.formateur && `Formateur: ${user.formateur.prenom} ${user.formateur.nom}`}
                  {user.entreprise && `Entreprise: ${user.entreprise.nom}`}
                  {!user.formateur && !user.entreprise && "—"}
                </td>
                <td className="px-4 py-3">
                  {user.actif ? (
                    <span className="flex items-center gap-1 text-green-600 text-xs">
                      <UserCheck className="h-3.5 w-3.5" /> Actif
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-red-500 text-xs">
                      <UserX className="h-3.5 w-3.5" /> Inactif
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        setResetUserId(user.id);
                        setNewPassword("");
                        setResetMsg("");
                      }}
                      className="text-gray-400 hover:text-red-600 p-1"
                      title="Reinitialiser le mot de passe"
                    >
                      <KeyRound className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => toggleActif(user)}
                      className={`text-xs px-2 py-1 rounded ${
                        user.actif
                          ? "text-red-600 hover:bg-red-900/20"
                          : "text-green-600 hover:bg-green-900/20"
                      }`}
                    >
                      {user.actif ? "Desactiver" : "Activer"}
                    </button>
                    <Link
                      href={`/utilisateurs/${user.id}/modifier`}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Modifier
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Aucun utilisateur trouve
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Reset Password Modal */}
      {resetUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <h3 className="font-semibold text-gray-100 flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-red-600" />
              Reinitialiser le mot de passe
            </h3>
            <input
              type="password"
              placeholder="Nouveau mot de passe (min. 6 car.)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full border border-gray-600 bg-gray-900 text-gray-100 rounded-lg px-3 py-2 text-sm"
            />
            {resetMsg && (
              <p className={`text-sm ${resetMsg.includes("succes") ? "text-green-600" : "text-red-600"}`}>
                {resetMsg}
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setResetUserId(null)}
                className="px-4 py-2 text-sm text-gray-400 hover:bg-gray-700 rounded-lg"
              >
                Annuler
              </button>
              <button
                onClick={handleResetPassword}
                disabled={newPassword.length < 6}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
