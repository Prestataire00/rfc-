"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle, AlertCircle, CalendarDays, Clock, MapPin } from "lucide-react";
import { useApi, useApiMutation, ApiError } from "@/hooks/useApi";

type SessionInfo = {
  formation: string;
  duree: number;
  description: string | null;
  dateDebut: string;
  dateFin: string;
  lieu: string | null;
  placesRestantes: number;
};

export default function InscriptionStagiairePage() {
  const { token } = useParams() as { token: string };
  const { data: info, error: fetchError, isLoading } = useApi<SessionInfo>(
    token ? `/api/inscription-publique/${token}` : null
  );
  const submitMutation = useApiMutation<Record<string, unknown>>(
    `/api/inscription-publique/${token}`,
    "POST"
  );
  const [submitError, setSubmitError] = useState("");
  const [form, setForm] = useState({
    nom: "", prenom: "", email: "", telephone: "", entreprise: "",
    dateNaissance: "", numeroSecuriteSociale: "", besoinsAdaptation: "",
    consentementRGPD: false,
  });
  const [submitted, setSubmitted] = useState(false);

  const loading = isLoading;
  const submitting = submitMutation.isMutating;
  // Preserve original semantics: API errors surface via body.error,
  // network/parse failures fall back to "Impossible de charger les données"
  const loadError = fetchError
    ? (typeof fetchError.body === "object" && fetchError.body && "error" in fetchError.body && typeof (fetchError.body as { error: unknown }).error === "string"
        ? (fetchError.body as { error: string }).error
        : "Impossible de charger les données")
    : "";
  const error = submitError || loadError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.consentementRGPD) {
      setSubmitError("Le consentement RGPD est obligatoire");
      return;
    }
    setSubmitError("");
    const payload = {
      ...form,
      numeroSecuriteSociale: form.numeroSecuriteSociale ? form.numeroSecuriteSociale.replace(/\s/g, "") : undefined,
    };
    try {
      await submitMutation.trigger(payload);
      setSubmitted(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setSubmitError(err.message || "Erreur");
      } else {
        setSubmitError("Erreur");
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
      </div>
    );
  }

  if (loadError && !info) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
          <p className="text-gray-400">{loadError}</p>
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

              {/* Donnees Qualiopi */}
              <div className="pt-4 border-t border-gray-700">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Donnees obligatoires (Qualiopi)</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Date de naissance <span className="text-red-500">*</span></label>
                    <input
                      type="date"
                      required
                      value={form.dateNaissance}
                      onChange={(e) => setForm({ ...form, dateNaissance: e.target.value })}
                      className="w-full border border-gray-600 bg-gray-900 text-gray-100 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Numero de securite sociale</label>
                    <input
                      type="text"
                      value={form.numeroSecuriteSociale}
                      onChange={(e) => setForm({ ...form, numeroSecuriteSociale: e.target.value.replace(/[^0-9\s]/g, "") })}
                      maxLength={21}
                      placeholder="1 99 12 75 123 456 78"
                      className="w-full border border-gray-600 bg-gray-900 text-gray-100 rounded-lg px-3 py-2 text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Besoins d&apos;adaptation (optionnel)</label>
                    <textarea
                      value={form.besoinsAdaptation}
                      onChange={(e) => setForm({ ...form, besoinsAdaptation: e.target.value })}
                      rows={2}
                      placeholder="RQTH, contraintes physiques, amenagements..."
                      className="w-full border border-gray-600 bg-gray-900 text-gray-100 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Consentement RGPD */}
              <div className="flex items-start gap-3 p-3 rounded-md border border-red-700/50 bg-red-900/10">
                <input
                  type="checkbox"
                  id="rgpd"
                  checked={form.consentementRGPD}
                  onChange={(e) => setForm({ ...form, consentementRGPD: e.target.checked })}
                  className="mt-0.5 h-4 w-4"
                  required
                />
                <label htmlFor="rgpd" className="text-xs text-gray-300 cursor-pointer flex-1">
                  <strong>J&apos;accepte</strong> la collecte et le traitement de mes donnees personnelles pour la realisation de la formation, conformement au RGPD. *
                </label>
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
