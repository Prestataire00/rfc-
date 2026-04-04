"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Star, CheckCircle, AlertCircle, ChevronRight, ChevronLeft } from "lucide-react";
import Image from "next/image";

type Question = { key: string; label: string };
type Section = { id: string; titre: string; questions: Question[] };

const NOTE_LABELS: Record<number, string> = {
  1: "Très insatisfait",
  2: "Insatisfait",
  3: "Correct",
  4: "Satisfait",
  5: "Très satisfait",
};

// ── Composant étoiles ──────────────────────────────────────────────────────
function StarRating({
  value,
  onChange,
  size = "md",
}: {
  value: number;
  onChange: (n: number) => void;
  size?: "sm" | "md" | "lg";
}) {
  const [hovered, setHovered] = useState(0);
  const sz = size === "lg" ? "h-10 w-10" : size === "sm" ? "h-5 w-5" : "h-7 w-7";
  const active = hovered || value;
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          className="focus:outline-none transition-transform hover:scale-110"
        >
          <Star
            className={`${sz} transition-colors ${
              n <= active ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
            }`}
          />
        </button>
      ))}
      {active > 0 && (
        <span className="ml-2 text-sm text-gray-500 min-w-[110px]">
          {NOTE_LABELS[active]}
        </span>
      )}
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────────────
export default function EvaluationPubliquePage() {
  const { token } = useParams() as { token: string };

  const [info, setInfo] = useState<{
    type: string;
    estComplete: boolean;
    formation: string;
    stagiaire: string;
    sections: Section[];
  } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState(0);
  const [noteGlobale, setNoteGlobale] = useState(0);
  const [reponses, setReponses] = useState<Record<string, number>>({});
  const [commentaire, setCommentaire] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch(`/api/evaluations/public/${token}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data || data.error) {
          setError(data?.error || "Lien invalide ou expiré");
        } else {
          setInfo(data);
          if (data.estComplete) setSubmitted(true);
        }
        setLoading(false);
      });
  }, [token]);

  const sections: Section[] = info?.sections ?? [];
  const currentSection = step > 0 && step <= sections.length ? sections[step - 1] : null;
  const isLastStep = step === sections.length + 1;
  const progress = step === 0 ? 0 : Math.round((step / (sections.length + 1)) * 100);

  const isSectionComplete = (s: typeof sections[0]) =>
    s.questions.every((q) => reponses[q.key] !== undefined);

  const canNext =
    step === 0
      ? noteGlobale > 0
      : currentSection
      ? isSectionComplete(currentSection)
      : true;

  const handleSubmit = async () => {
    if (noteGlobale === 0) return;
    setSubmitting(true);
    const res = await fetch(`/api/evaluations/public/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteGlobale, reponses, commentaire }),
    });
    if (res.ok) {
      setSubmitted(true);
    } else {
      const data = await res.json();
      setError(data.error || "Erreur lors de l'envoi");
    }
    setSubmitting(false);
  };

  // ── Chargement ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-red-600 border-t-transparent" />
      </div>
    );
  }

  if (error && !info) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-sm">
          <AlertCircle className="h-14 w-14 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Lien invalide</h2>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  // ── Confirmation ──────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-red-50 to-white">
        <header className="bg-white border-b border-gray-100 shadow-sm">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
            <Image src="/logo-rfc.png" alt="RFC" width={44} height={44} className="rounded-lg shrink-0" />
            <span className="text-lg font-bold text-gray-900">RFC</span>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-10 w-10 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Merci pour votre retour !</h1>
            <p className="text-gray-500 text-base leading-relaxed mb-6">
              Votre évaluation a bien été enregistrée. Vos retours nous permettent d&apos;améliorer continuellement la qualité de nos formations.
            </p>
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm text-left">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Formation évaluée</p>
              <p className="font-semibold text-gray-800">{info?.formation}</p>
            </div>
            <p className="mt-8 text-sm text-gray-400">RFC — Rescue Formation Conseil</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Formulaire ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Image src="/logo-rfc.png" alt="RFC" width={44} height={44} className="rounded-lg shrink-0" />
          <span className="text-lg font-bold text-black flex-1">RFC</span>
          {step > 0 && (
            <span className="text-xs text-gray-400 font-medium">
              {step} / {sections.length + 1}
            </span>
          )}
        </div>
        {/* Barre de progression sticky */}
        {step > 0 && (
          <div className="h-1 bg-gray-100">
            <div
              className="h-full bg-red-600 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 flex flex-col gap-5">
        {/* Carte formation */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                {info?.type === "satisfaction_froid"
                  ? "Satisfaction à froid"
                  : "Satisfaction à chaud"}
              </p>
              <h1 className="text-lg font-bold text-gray-900 leading-snug">{info?.formation}</h1>
              <p className="text-sm text-gray-500 mt-1">
                Participant : <span className="font-medium text-gray-700">{info?.stagiaire}</span>
              </p>
            </div>
            <span className="shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100">
              {info?.type === "satisfaction_froid" ? "À froid" : "À chaud"}
            </span>
          </div>
        </div>

        {/* ── ÉTAPE 0 : Note globale ── */}
        {step === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            <div>
              <h2 className="text-base font-bold text-gray-900 mb-1">Note globale *</h2>
              <p className="text-sm text-gray-500">
                Quelle note donneriez-vous globalement à cette formation ?
              </p>
            </div>
            <StarRating value={noteGlobale} onChange={setNoteGlobale} size="lg" />
            <p className="text-xs text-gray-400">
              {sections.length + 1} étapes au total · environ 3 minutes
            </p>
          </div>
        )}

        {/* ── ÉTAPES 1..N : Sections ── */}
        {currentSection && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            <div>
              <p className="text-xs text-red-600 font-semibold uppercase tracking-wide mb-1">
                Section {step} / {sections.length}
              </p>
              <h2 className="text-base font-bold text-gray-900">{currentSection.titre}</h2>
              <p className="text-sm text-gray-500 mt-1">
                Notez chaque critère de 1 (très insatisfait) à 5 (très satisfait)
              </p>
            </div>
            <div className="divide-y divide-gray-100">
              {currentSection.questions.map((q) => (
                <div key={q.key} className="py-4">
                  <p className="text-sm text-gray-700 mb-3">{q.label}</p>
                  <StarRating
                    value={reponses[q.key] || 0}
                    onChange={(n) => setReponses({ ...reponses, [q.key]: n })}
                    size="md"
                  />
                </div>
              ))}
            </div>
            {!isSectionComplete(currentSection) && (
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                Veuillez noter tous les critères pour continuer.
              </p>
            )}
          </div>
        )}

        {/* ── DERNIÈRE ÉTAPE : Commentaire + récap ── */}
        {isLastStep && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <div>
                <h2 className="text-base font-bold text-gray-900 mb-1">Commentaires libres</h2>
                <p className="text-sm text-gray-500">
                  Partagez vos remarques, suggestions ou points d&apos;amélioration (optionnel).
                </p>
              </div>
              <textarea
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
                rows={4}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 bg-gray-50 focus:ring-2 focus:ring-red-400 focus:border-transparent resize-none"
                placeholder="Vos remarques nous aident à améliorer nos formations..."
              />
            </div>

            {/* Récapitulatif */}
            <div className="bg-red-50 rounded-2xl border border-red-100 p-5">
              <h3 className="text-sm font-semibold text-red-800 mb-3">Récapitulatif</h3>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-500">Note globale :</span>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      className={`h-4 w-4 ${
                        n <= noteGlobale ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs text-gray-600 font-medium">{NOTE_LABELS[noteGlobale]}</span>
              </div>
              <p className="text-xs text-gray-500">
                {Object.keys(reponses).length} critère
                {Object.keys(reponses).length > 1 ? "s" : ""} évalué
                {Object.keys(reponses).length > 1 ? "s" : ""}
              </p>
            </div>

            {error && <p className="text-sm text-red-600 text-center">{error}</p>}
          </div>
        )}

        {/* ── Navigation ── */}
        <div className={`flex gap-3 ${step === 0 ? "justify-end" : "justify-between"}`}>
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-2 px-5 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" /> Précédent
            </button>
          )}
          {isLastStep ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || noteGlobale === 0}
              className="flex-1 sm:flex-none sm:min-w-[200px] flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {submitting ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" /> Envoyer mon évaluation
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              disabled={!canNext}
              className="flex-1 sm:flex-none sm:min-w-[160px] flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              Suivant <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-5 text-xs text-gray-400 border-t border-gray-100 bg-white">
        RFC — Rescue Formation Conseil · Sécurité · Incendie · Prévention
      </footer>
    </div>
  );
}
