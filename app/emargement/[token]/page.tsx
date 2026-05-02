"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, AlertTriangle, Clock, MapPin, User, FileText } from "lucide-react";
import { SignaturePad } from "@/components/shared/SignaturePad";
import { StatutSelector, type PresenceStatut } from "@/components/emargement/StatutSelector";
import { useApi, useApiMutation, ApiError } from "@/hooks/useApi";

type Stagiaire = {
  id: string;
  nom: string;
  prenom: string;
  presence: { statut: string | null; signed: boolean } | null;
};

type SessionInfo = {
  sessionId: string;
  date: string;
  creneau: string;
  isOtp: boolean;
  formation: { titre: string; duree: number };
  formateur: { nom: string; prenom: string } | null;
  lieu: string | null;
  stagiaires: Stagiaire[];
};

export default function EmargementPublicPage({ params }: { params: { token: string } }) {
  const { data, error: fetchError, isLoading } = useApi<SessionInfo>(
    params.token ? `/api/emargement/public/${params.token}` : null
  );
  const submitMutation = useApiMutation<{
    contactId: string;
    statut: PresenceStatut;
    signature: string | null;
    retardMinutes?: number;
    departMinutes?: number;
  }>(`/api/emargement/public/${params.token}`, "POST");
  const [submitError, setSubmitError] = useState("");

  // Signing state
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [statut, setStatut] = useState<PresenceStatut | null>(null);
  const [retardMinutes, setRetardMinutes] = useState(0);
  const [departMinutes, setDepartMinutes] = useState(0);
  const [signature, setSignature] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const loading = isLoading;
  const submitting = submitMutation.isMutating;

  // Compute load error (preserve 410 vs invalid distinction)
  const loadError = fetchError
    ? (fetchError.status === 410 ? "Ce lien a expire." : "Lien invalide.")
    : "";
  const error = submitError || loadError;

  // OTP pre-selection (preserve original useEffect behaviour at first data arrival)
  useEffect(() => {
    if (!data) return;
    if (data.isOtp && data.stagiaires.length === 1) {
      setSelectedContact((prev) => prev ?? data.stagiaires[0].id);
    }
  }, [data]);

  const handleSubmit = async () => {
    if (!selectedContact || !statut || !data) return;
    setSubmitError("");
    try {
      await submitMutation.trigger({
        contactId: selectedContact,
        statut,
        signature,
        retardMinutes: statut === "en_retard" ? retardMinutes : undefined,
        departMinutes: statut === "depart_anticipe" ? departMinutes : undefined,
      });
      setSubmitted(true);
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        setSubmitError(e.message || "Erreur");
      } else {
        setSubmitError(e instanceof Error ? e.message : "Erreur lors de la signature");
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-xl p-6 max-w-sm w-full text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-3" />
          <p className="text-gray-100 font-semibold mb-1">Impossible d&apos;acceder a l&apos;emargement</p>
          <p className="text-sm text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-xl p-6 max-w-sm w-full text-center">
          <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto mb-3" />
          <p className="text-gray-100 text-lg font-semibold mb-1">Signature enregistree</p>
          <p className="text-sm text-gray-400">Merci. Votre presence a ete validee.</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const creneauLabel = data.creneau === "matin" ? "Matin" : "Apres-midi";
  const selected = data.stagiaires.find((s) => s.id === selectedContact);

  return (
    <div className="min-h-screen bg-gray-950 p-4">
      <div className="max-w-lg mx-auto">
        {/* En-tete session */}
        <div className="bg-gray-800 rounded-xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-lg bg-red-600 flex items-center justify-center">
              <FileText className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-100">Emargement</h1>
              <p className="text-xs text-gray-400">{creneauLabel} — {data.date}</p>
            </div>
          </div>
          <p className="text-sm font-semibold text-gray-200 mb-2">{data.formation.titre}</p>
          <div className="flex flex-wrap gap-3 text-xs text-gray-400">
            {data.formateur && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" /> {data.formateur.prenom} {data.formateur.nom}
              </span>
            )}
            {data.lieu && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {data.lieu}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {data.formation.duree}h
            </span>
          </div>
        </div>

        {/* Choix du stagiaire (si QR general) */}
        {!data.isOtp && !selectedContact && (
          <div className="bg-gray-800 rounded-xl p-5 mb-4">
            <p className="text-sm font-semibold text-gray-200 mb-3">Selectionnez votre nom</p>
            <div className="space-y-2">
              {data.stagiaires.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedContact(s.id)}
                  disabled={s.presence?.signed}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                    s.presence?.signed
                      ? "border-gray-700 bg-gray-800/50 opacity-50"
                      : "border-gray-600 bg-gray-900 hover:bg-gray-700 hover:border-gray-500"
                  }`}
                >
                  <span className="text-sm font-medium text-gray-100">{s.prenom} {s.nom}</span>
                  {s.presence?.signed && (
                    <span className="text-xs text-emerald-400 ml-2">Deja signe</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Formulaire de signature */}
        {selectedContact && (
          <div className="bg-gray-800 rounded-xl p-5 space-y-5">
            <div>
              <p className="text-sm text-gray-400 mb-1">Stagiaire</p>
              <p className="text-base font-semibold text-gray-100">
                {selected?.prenom} {selected?.nom}
                {!data.isOtp && (
                  <button onClick={() => setSelectedContact(null)} className="ml-2 text-xs text-red-400 underline">
                    Changer
                  </button>
                )}
              </p>
            </div>

            {/* Statut */}
            <div>
              <p className="text-sm font-medium text-gray-300 mb-2">Statut de presence</p>
              <StatutSelector
                value={statut}
                onChange={setStatut}
                retardMinutes={retardMinutes}
                departMinutes={departMinutes}
                onRetardChange={setRetardMinutes}
                onDepartChange={setDepartMinutes}
              />
            </div>

            {/* Signature */}
            {statut && (
              <div>
                <p className="text-sm font-medium text-gray-300 mb-2">Signature</p>
                <SignaturePad
                  width={380}
                  height={140}
                  onSignatureChange={setSignature}
                />
              </div>
            )}

            {/* Bouton valider */}
            <button
              onClick={handleSubmit}
              disabled={!statut || submitting}
              className="w-full rounded-lg bg-red-600 hover:bg-red-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 transition-colors"
            >
              {submitting ? "Enregistrement..." : "Valider ma presence"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
