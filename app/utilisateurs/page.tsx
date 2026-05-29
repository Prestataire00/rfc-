"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Users, UserCheck, UserX, KeyRound } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/fetcher";

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
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetMsg, setResetMsg] = useState("");

  const { data, isLoading, mutate } = useApi<User[]>("/api/utilisateurs");
  const users = Array.isArray(data) ? data : [];
  const loading = isLoading;

  const toggleActif = async (user: User) => {
    try {
      await api.put(`/api/utilisateurs/${user.id}`, { actif: !user.actif });
      await mutate();
    } catch { /* silent */ }
  };

  // Règles serveur (audit §2.4) : 12+ caractères avec min/maj/chiffre/spécial.
  const passwordChecks = [
    { key: "len", label: "12 caractères ou plus", test: (p: string) => p.length >= 12 },
    { key: "low", label: "au moins une minuscule", test: (p: string) => /[a-z]/.test(p) },
    { key: "up", label: "au moins une majuscule", test: (p: string) => /[A-Z]/.test(p) },
    { key: "num", label: "au moins un chiffre", test: (p: string) => /\d/.test(p) },
    { key: "sym", label: "au moins un caractère spécial (!@#$…)", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
  ] as const;
  const passwordValid = passwordChecks.every((c) => c.test(newPassword));

  const handleResetPassword = async () => {
    if (!resetUserId || !passwordValid) return;
    try {
      await api.post(`/api/utilisateurs/${resetUserId}/reset-password`, { password: newPassword });
      setResetMsg("Mot de passe modifié avec succès");
      setNewPassword("");
      setTimeout(() => {
        setResetUserId(null);
        setResetMsg("");
      }, 2000);
    } catch (e) {
      const err = e as { message?: string; body?: { error?: string; issues?: { password?: string[] } } };
      const issues = err?.body?.issues?.password;
      if (issues && issues.length > 0) {
        setResetMsg(issues.join(" · "));
      } else {
        setResetMsg(err?.body?.error || err?.message || "Erreur");
      }
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
      <PageHeader
        title="Gestion des utilisateurs"
        description={`${users.length} compte(s)`}
        actionLabel="Nouveau compte"
        actionHref="/utilisateurs/nouveau"
      />

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par nom ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-600 bg-gray-900 text-gray-100 rounded-lg text-sm"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="border border-gray-600 bg-gray-900 text-gray-100 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Tous les roles</option>
          <option value="admin">Admin</option>
          <option value="formateur">Formateur</option>
          <option value="client">Client</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-gray-800 border rounded-xl overflow-x-auto">
        <table className="min-w-[640px] w-full text-sm">
          <thead className="bg-gray-900 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-400">Utilisateur</th>
              <th className="text-left px-4 py-3 font-medium text-gray-400">Email</th>
              <th className="text-left px-4 py-3 font-medium text-gray-400">Role</th>
              <th className="text-left px-4 py-3 font-medium text-gray-400 hidden sm:table-cell">Rattachement</th>
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
                      {(user.prenom || "")[0] || ""}
                      {(user.nom || "")[0] || ""}
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
                <td className="px-4 py-3 text-gray-400 text-xs hidden sm:table-cell">
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
                <td colSpan={6} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Users className="h-8 w-8 text-gray-500" />
                    <p className="text-sm text-gray-400">Aucun utilisateur trouve</p>
                    <Link
                      href="/utilisateurs/nouveau"
                      className="text-sm text-red-500 hover:text-red-400 font-medium"
                    >
                      Creer un compte
                    </Link>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Reset Password Modal */}
      {resetUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-6 w-full max-w-md space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-red-600" />
              Réinitialiser le mot de passe
            </h3>
            <input
              type="password"
              autoFocus
              placeholder="Nouveau mot de passe"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 text-sm placeholder-gray-400 dark:placeholder-gray-500"
            />
            {/* Checklist live des règles serveur — alignée sur §2.4 */}
            <ul className="space-y-1 text-xs">
              {passwordChecks.map((c) => {
                const ok = c.test(newPassword);
                return (
                  <li
                    key={c.key}
                    className={`flex items-center gap-2 ${
                      newPassword === ""
                        ? "text-gray-500 dark:text-gray-400"
                        : ok
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    <span className="font-mono">{newPassword === "" ? "·" : ok ? "✓" : "✗"}</span>
                    {c.label}
                  </li>
                );
              })}
            </ul>
            {resetMsg && (
              <p className={`text-sm ${resetMsg.includes("succès") ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                {resetMsg}
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setResetUserId(null)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Annuler
              </button>
              <button
                onClick={handleResetPassword}
                disabled={!passwordValid}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
