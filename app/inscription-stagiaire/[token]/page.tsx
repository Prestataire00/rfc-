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
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error && !info) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Inscription enregistree !</h1>
          <p className="text-gray-600">
            Votre inscription a la formation <strong>&quot;{info?.formation}&quot;</strong> a bien ete prise en compte.
            Vous recevrez une confirmation prochainement.
          </p>
        </div>
      </div>
    );
  }

  const dateDebut = info ? new Date(info.dateDebut).toLocaleDateString("fr-FR") : "";
  const dateFin = info ? new Date(info.dateFin).toLocaleDateString("fr-FR") : "";

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-blue-600 text-white rounded-t-xl p-6">
          <h1 className="text-xl font-bold">FormaPro</h1>
          <p className="text-blue-100 text-sm mt-1">Inscription a une formation</p>
        </div>

        <div className="bg-white border border-t-0 rounded-b-xl p-6 space-y-6">
          {/* Formation info */}
          <div className="bg-blue-50 rounded-lg p-4 space-y-2">
            <h2 className="font-semibold text-lg text-gray-900">{info?.formation}</h2>
            {info?.description && <p className="text-sm text-gray-600">{info.description}</p>}
            <div className="flex flex-wrap gap-4 text-sm text-gray-500 mt-2">
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
            <p className="text-center text-gray-500 py-4">
              Desolee, cette session est complete.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="font-medium text-gray-900">Vos informations</h3>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prenom *</label>
                  <input
                    type="text"
                    required
                    value={form.prenom}
                    onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telephone</label>
                <input
                  type="tel"
                  value={form.telephone}
                  onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Entreprise</label>
                <input
                  type="text"
                  value={form.entreprise}
                  onChange={(e) => setForm({ ...form, entreprise: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Nom de votre entreprise"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? "Inscription en cours..." : "M'inscrire a cette formation"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
