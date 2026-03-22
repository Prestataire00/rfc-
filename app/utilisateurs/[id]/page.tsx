"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil, KeyRound, UserCheck, UserX, Building2, GraduationCap, Mail, Shield, Calendar } from "lucide-react";

type User = {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  role: string;
  actif: boolean;
  createdAt: string;
  formateurId?: string | null;
  entrepriseId?: string | null;
  formateur?: { id: string; nom: string; prenom: string } | null;
  entreprise?: { id: string; nom: string } | null;
};

const roleBadge: Record<string, { label: string; class: string }> = {
  admin: { label: "Administrateur", class: "bg-purple-900/30 text-purple-400" },
  formateur: { label: "Formateur", class: "bg-red-900/30 text-red-400" },
  client: { label: "Client", class: "bg-green-900/30 text-green-400" },
};

export default function UtilisateurDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showResetModal, setShowResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [resetMsg, setResetMsg] = useState("");
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    fetch(`/api/utilisateurs/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Utilisateur non trouvé");
        return r.json();
      })
      .then((data) => {
        setUser(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Erreur de chargement");
        setLoading(false);
      });
  }, [id]);

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) return;
    setResetting(true);
    setResetMsg("");
    try {
      const res = await fetch(`/api/utilisateurs/${id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      if (res.ok) {
        setResetMsg("Mot de passe modifié avec succès");
        setNewPassword("");
        setTimeout(() => {
          setShowResetModal(false);
          setResetMsg("");
        }, 2000);
      } else {
        const data = await res.json();
        setResetMsg(data.error || "Erreur lors de la réinitialisation");
      }
    } catch {
      setResetMsg("Erreur réseau");
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/utilisateurs" className="p-2 hover:bg-gray-700 rounded-lg">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-100">Utilisateur</h1>
        </div>
        <div className="bg-red-900/20 border border-red-700 text-red-400 px-4 py-3 rounded-lg text-sm">
          {error || "Utilisateur non trouvé"}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/utilisateurs" className="p-2 hover:bg-gray-700 rounded-lg">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-100">
              {user.prenom} {user.nom}
            </h1>
            <p className="text-sm text-gray-400">{user.email}</p>
          </div>
        </div>
        <Link
          href={`/utilisateurs/${id}/modifier`}
          className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm font-medium"
        >
          <Pencil className="h-4 w-4" />
          Modifier
        </Link>
      </div>

      {/* Info card */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-red-900/30 flex items-center justify-center text-red-400 font-bold text-lg">
            {user.prenom[0]}{user.nom[0]}
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-100">{user.prenom} {user.nom}</p>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${roleBadge[user.role]?.class || "bg-gray-700 text-gray-300"}`}>
              {roleBadge[user.role]?.label || user.role}
            </span>
          </div>
        </div>

        <div className="border-t border-gray-700" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-gray-500" />
            <div>
              <p className="text-xs text-gray-500">Email</p>
              <p className="text-sm text-gray-200">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Shield className="h-4 w-4 text-gray-500" />
            <div>
              <p className="text-xs text-gray-500">Rôle</p>
              <p className="text-sm text-gray-200">{roleBadge[user.role]?.label || user.role}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user.actif ? (
              <UserCheck className="h-4 w-4 text-green-500" />
            ) : (
              <UserX className="h-4 w-4 text-red-500" />
            )}
            <div>
              <p className="text-xs text-gray-500">Statut</p>
              <p className={`text-sm ${user.actif ? "text-green-400" : "text-red-400"}`}>
                {user.actif ? "Actif" : "Inactif"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-gray-500" />
            <div>
              <p className="text-xs text-gray-500">Créé le</p>
              <p className="text-sm text-gray-200">
                {new Date(user.createdAt).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Linked formateur or entreprise */}
        {user.formateur && (
          <>
            <div className="border-t border-gray-700" />
            <div className="flex items-center gap-3">
              <GraduationCap className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Formateur rattaché</p>
                <Link
                  href={`/formateurs/${user.formateur.id}`}
                  className="text-sm text-red-400 hover:underline"
                >
                  {user.formateur.prenom} {user.formateur.nom}
                </Link>
              </div>
            </div>
          </>
        )}

        {user.entreprise && (
          <>
            <div className="border-t border-gray-700" />
            <div className="flex items-center gap-3">
              <Building2 className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Entreprise rattachée</p>
                <Link
                  href={`/entreprises/${user.entreprise.id}`}
                  className="text-sm text-red-400 hover:underline"
                >
                  {user.entreprise.nom}
                </Link>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            setShowResetModal(true);
            setNewPassword("");
            setResetMsg("");
          }}
          className="flex items-center gap-2 bg-gray-700 text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-600 text-sm font-medium"
        >
          <KeyRound className="h-4 w-4" />
          Réinitialiser le mot de passe
        </button>
        <Link
          href="/utilisateurs"
          className="flex items-center gap-2 text-gray-400 hover:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-700 text-sm font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Link>
      </div>

      {/* Reset Password Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <h3 className="font-semibold text-gray-100 flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-red-600" />
              Réinitialiser le mot de passe
            </h3>
            <p className="text-sm text-gray-400">
              Pour {user.prenom} {user.nom}
            </p>
            <input
              type="password"
              placeholder="Nouveau mot de passe (min. 6 car.)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full border border-gray-600 bg-gray-700 text-gray-100 rounded-lg px-3 py-2 text-sm placeholder-gray-500"
            />
            {resetMsg && (
              <p className={`text-sm ${resetMsg.includes("succès") ? "text-green-400" : "text-red-400"}`}>
                {resetMsg}
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 text-sm text-gray-400 hover:bg-gray-700 rounded-lg"
              >
                Annuler
              </button>
              <button
                onClick={handleResetPassword}
                disabled={newPassword.length < 6 || resetting}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {resetting ? "En cours..." : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
