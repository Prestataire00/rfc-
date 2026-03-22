"use client";

import { useState, useEffect, use } from "react";
import { CheckCircle, AlertCircle, CalendarDays, Clock, MapPin } from "lucide-react";

export default function InscriptionStagiairePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [info, setInfo] = useState<{
    formation: string;
    duree: number;
    description: string | null;
    dateDebut: string;
    dateFin: string;
    lieu: string | null;
    placesRestantes: number;
  } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ nom: "", prenom: "", email: "", telephone: "", entreprise: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch(`/api/inscription-publique/${token}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) setError("Impossible de charger les données");
        else if (data.error) setError(data.error);
        else setInfo(data);
        setLoading(false);
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const res = await fetch(`/api/inscription-publique/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (res.ok) {
      setSubmitted(true);
    } else {
      setError(data.error || "Erreur");
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
      </div>
    );
  }

  if (error && !info) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center max-w-md">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-100 mb-2">Inscription enregistrée !</h1>
          <p className="text-gray-400">
            Votre inscription à la formation <strong>&quot;{info?.formation}&quot;</strong> a bien été prise en compte.
            Vous recevrez une confirmation prochainement.
          </p>
        </div>
      </div>
    );
  }

  const dateDebut = info ? new Date(info.dateDebut).toLocaleDateString("fr-FR") : "";
  const dateFin = info ? new Date(info.dateFin).toLocaleDateString("fr-FR") : "";

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-red-600 text-white rounded-t-xl p-6">
          <h1 className="text-xl font-bold">Rescue Formation Conseil</h1>
          <p className="text-red-100 text-sm mt-1">Inscription à une formation</p>
        </div>

        <div className="bg-gray-800 border border-t-0 rounded-b-xl p-6 space-y-6">
          {/* Formation info */}
          <div className="bg-red-900/20 rounded-lg p-4 space-y-2">
            <h2 className="font-semibold text-lg text-gray-100">{info?.formation}</h2>
            {info?.description && <p className="text-sm text-gray-400">{info.description}</p>}
            <div className="flex flex-wrap gap-4 text-sm text-gray-400 mt-2">
              <span className="flex items-center gap-1">
                <CalendarDays className="h-4 w-4" /> Du {dateDebut} au {dateFin}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" /> {info?.duree}h
              </span>
              {info?.lieu && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" /> {info.lieu}
                </span>
              )}
            </div>
            <p className={`text-sm font-medium ${info && info.placesRestantes > 0 ? "text-green-600" : "text-red-600"}`}>
              {info && info.placesRestantes > 0
                ? `${info.placesRestantes} place(s) restante(s)`
                : "Complet"}
            </p>
          </div>

          {info && info.placesRestantes <= 0 ? (
            <p className="text-center text-gray-400 py-4">
              Désolé, cette session est complète.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="font-medium text-gray-100">Vos informations</h3>

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
                <label className="block text-sm font-medium text-gray-300 mb-1">Téléphone</label>
                <input
                  type="tel"
                  value={form.telephone}
                  onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                  className="w-full border border-gray-600 bg-gray-900 text-gray-100 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Entreprise</label>
                <input
                  type="text"
                  value={form.entreprise}
                  onChange={(e) => setForm({ ...form, entreprise: e.target.value })}
                  className="w-full border border-gray-600 bg-gray-900 text-gray-100 rounded-lg px-3 py-2 text-sm"
                  placeholder="Nom de votre entreprise"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? "Inscription en cours..." : "M'inscrire à cette formation"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
