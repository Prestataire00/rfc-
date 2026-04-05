"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { Star, CheckCircle, AlertCircle, ChevronRight, ChevronLeft, ClipboardList } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────
type Question = { key: string; label: string };
type Section = { id: string; titre: string; questions: Question[] };

type CustomQuestion = {
  id: string;
  label: string;
  type: "note" | "texte" | "oui_non" | "choix";
  required: boolean;
  options?: string[];
  valeur: unknown;
};

const NOTE_LABELS: Record<number, string> = {
  1: "Très insatisfait", 2: "Insatisfait", 3: "Correct", 4: "Satisfait", 5: "Très satisfait",
};
const NOTE_COLORS: Record<number, string> = {
  1: "text-red-500", 2: "text-orange-500", 3: "text-yellow-500", 4: "text-lime-500", 5: "text-green-500",
};

// ── Composant étoiles ─────────────────────────────────────────────────────
function StarRating({ value, onChange, size = "md" }: { value: number; onChange: (n: number) => void; size?: "sm" | "md" | "lg" }) {
  const [hovered, setHovered] = useState(0);
  const sz = size === "lg" ? "h-10 w-10" : size === "sm" ? "h-5 w-5" : "h-8 w-8";
  const active = hovered || value;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => onChange(n)}
            onMouseEnter={() => setHovered(n)} onMouseLeave={() => setHovered(0)}
            className="focus:outline-none transition-all hover:scale-125 active:scale-95">
            <Star className={`${sz} transition-all duration-150 drop-shadow-sm ${n <= active ? "text-yellow-400 fill-yellow-400" : "text-gray-200 fill-gray-200"}`} />
          </button>
        ))}
      </div>
      {active > 0 && <span className={`text-sm font-semibold ${NOTE_COLORS[active]}`}>{NOTE_LABELS[active]}</span>}
    </div>
  );
}

// ── Formulaire personnalisé ───────────────────────────────────────────────
function CustomForm({ questions, formation, stagiaire, token }: {
  questions: CustomQuestion[];
  formation: string;
  stagiaire: string;
  token: string;
}) {
  const [answers, setAnswers] = useState<CustomQuestion[]>(questions.map((q) => ({ ...q, valeur: null })));
  const [commentaire, setCommentaire] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const setAnswer = (id: string, val: unknown) => {
    setAnswers((prev) => prev.map((q) => q.id === id ? { ...q, valeur: val } : q));
  };

  const canSubmit = answers.every((q) => !q.required || q.valeur !== null);

  const handleSubmit = async () => {
    if (!canSubmit) { setError("Veuillez répondre à toutes les questions obligatoires."); return; }
    setSubmitting(true);
    setError("");
    const res = await fetch(`/api/evaluations/public/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reponses: answers, commentaire, isCustom: true }),
    });
    if (res.ok) {
      setSubmitted(true);
    } else {
      const data = await res.json();
      setError(data.error || "Erreur lors de l'envoi");
    }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <div className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="text-center max-w-md bg-white rounded-3xl shadow-md border border-gray-100 p-10">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-10 w-10 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Merci pour votre retour !</h1>
            <p className="text-gray-400 text-sm leading-relaxed mb-8">
              Votre évaluation a bien été enregistrée.
            </p>
            <div className="bg-slate-50 rounded-xl p-4 text-left">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Formation évaluée</p>
              <p className="font-semibold text-gray-800">{formation}</p>
            </div>
          </div>
        </div>
        <footer className="text-center py-4 text-xs text-gray-400">RFC — Rescue Formation Conseil</footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-xl mx-auto px-6 py-4 flex items-center gap-4">
          <Image src="/logorescue.png" alt="RFC" width={40} height={40} className="shrink-0 rounded" />
          <div className="flex-1">
            <p className="text-xs text-gray-400 leading-none mb-0.5">Évaluation de formation</p>
            <p className="text-sm font-semibold text-gray-800 leading-snug line-clamp-1">{formation}</p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-xl mx-auto w-full px-4 py-8 space-y-4">
        <div className="text-center py-4">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-50 mb-4">
            <ClipboardList className="h-7 w-7 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-1">Évaluation de votre formation</h1>
          {stagiaire !== "Anonyme" && (
            <p className="text-sm text-gray-400">Bonjour {stagiaire}, merci de prendre le temps de répondre.</p>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
          {answers.map((q, idx) => (
            <div key={q.id} className="pb-6 border-b border-gray-50 last:border-0 last:pb-0">
              <div className="flex items-start gap-3 mb-4">
                <span className="shrink-0 w-6 h-6 rounded-full bg-red-50 text-red-600 text-xs font-bold flex items-center justify-center mt-0.5">
                  {idx + 1}
                </span>
                <p className="text-sm font-medium text-gray-700 leading-relaxed">
                  {q.label}
                  {q.required && <span className="text-red-500 ml-1">*</span>}
                </p>
              </div>

              <div className="pl-9">
                {q.type === "note" && (
                  <StarRating value={(q.valeur as number) || 0} onChange={(n) => setAnswer(q.id, n)} size="md" />
                )}

                {q.type === "texte" && (
                  <textarea
                    value={(q.valeur as string) || ""}
                    onChange={(e) => setAnswer(q.id, e.target.value || null)}
                    rows={3}
                    placeholder="Votre réponse..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 bg-slate-50 focus:ring-2 focus:ring-red-400 focus:border-transparent resize-none outline-none transition"
                  />
                )}

                {q.type === "oui_non" && (
                  <div className="flex gap-3">
                    {["Oui", "Non"].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setAnswer(q.id, opt)}
                        className={`px-6 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                          q.valeur === opt
                            ? "bg-red-600 border-red-600 text-white shadow-sm"
                            : "bg-white border-gray-200 text-gray-600 hover:border-red-300"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {q.type === "choix" && (
                  <div className="space-y-2">
                    {(q.options || []).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setAnswer(q.id, opt)}
                        className={`w-full text-left px-4 py-3 rounded-xl text-sm border-2 transition-all ${
                          q.valeur === opt
                            ? "bg-red-50 border-red-500 text-red-700 font-medium"
                            : "bg-white border-gray-200 text-gray-700 hover:border-red-300"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Commentaire libre */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Commentaires libres (optionnel)</p>
            <textarea
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              rows={4}
              placeholder="Vos remarques ou suggestions..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 bg-slate-50 focus:ring-2 focus:ring-red-400 focus:border-transparent resize-none outline-none transition"
            />
          </div>
        </div>

        {!canSubmit && (
          <div className="flex items-center gap-2 bg-amber-50 rounded-xl px-4 py-3">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
            <p className="text-xs text-amber-700">Veuillez répondre aux questions obligatoires (marquées *) pour valider.</p>
          </div>
        )}

        {error && <p className="text-sm text-red-600 text-center bg-red-50 rounded-xl py-3 px-4">{error}</p>}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !canSubmit}
          className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors shadow-md"
        >
          {submitting ? (
            <><div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Envoi en cours...</>
          ) : (
            <><CheckCircle className="h-4 w-4" />Envoyer mon évaluation</>
          )}
        </button>
      </main>

      <footer className="text-center py-5 text-xs text-gray-300 border-t border-gray-100 bg-white">
        RFC — Rescue Formation Conseil · Sécurité · Incendie · Prévention
      </footer>
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
    isCustom: boolean;
    sections?: Section[];
    questions?: CustomQuestion[];
  } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Old format state
  const [step, setStep] = useState(0);
  const [noteGlobale, setNoteGlobale] = useState(0);
  const [reponses, setReponses] = useState<Record<string, number>>({});
  const [commentaire, setCommentaire] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");

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

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-600 border-t-transparent" />
          <p className="text-sm text-gray-400">Chargement de votre évaluation...</p>
        </div>
      </div>
    );
  }

  if (error && !info) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="text-center max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-10">
          <AlertCircle className="h-14 w-14 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Lien invalide</h2>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  // ── Custom template evaluation ──────────────────────────────────────────
  if (info?.isCustom && info.questions) {
    return (
      <CustomForm
        questions={info.questions}
        formation={info.formation}
        stagiaire={info.stagiaire}
        token={token}
      />
    );
  }

  // ── Old format (sections) ───────────────────────────────────────────────
  const sections: Section[] = info?.sections ?? [];
  const currentSection = step > 0 && step <= sections.length ? sections[step - 1] : null;
  const isLastStep = step === sections.length + 1;
  const progressPct = Math.round((step / (sections.length + 1)) * 100);
  const isSectionComplete = (s: Section) => s.questions.every((q) => reponses[q.key] !== undefined);
  const canNext = step === 0 ? noteGlobale > 0 : currentSection ? isSectionComplete(currentSection) : true;
  const totalSteps = sections.length + 2;

  const handleSubmit = async () => {
    if (noteGlobale === 0) return;
    setSubmitting(true);
    const res = await fetch(`/api/evaluations/public/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteGlobale, reponses, commentaire, isCustom: false }),
    });
    if (res.ok) {
      setSubmitted(true);
    } else {
      const data = await res.json();
      setSubmitError(data.error || "Erreur lors de l'envoi");
    }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <div className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="text-center max-w-md bg-white rounded-3xl shadow-md border border-gray-100 p-10">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-10 w-10 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Merci pour votre retour !</h1>
            <p className="text-gray-400 text-sm leading-relaxed mb-8">
              Votre évaluation a bien été enregistrée.
            </p>
            <div className="bg-slate-50 rounded-xl p-4 text-left">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Formation évaluée</p>
              <p className="font-semibold text-gray-800">{info?.formation}</p>
            </div>
          </div>
        </div>
        <footer className="text-center py-4 text-xs text-gray-400">RFC — Rescue Formation Conseil</footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-xl mx-auto px-6 py-4 flex items-center gap-4">
          <Image src="/logorescue.png" alt="RFC" width={40} height={40} className="shrink-0 rounded" />
          <div className="flex-1">
            <p className="text-xs text-gray-400 leading-none mb-0.5">Évaluation de formation</p>
            <p className="text-sm font-semibold text-gray-800 leading-snug line-clamp-1">{info?.formation}</p>
          </div>
          {step > 0 && (
            <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full shrink-0">
              {step} / {sections.length + 1}
            </span>
          )}
        </div>
        <div className="h-1 bg-gray-100">
          <div className="h-full bg-red-600 transition-all duration-500 ease-out" style={{ width: step === 0 ? "0%" : `${progressPct}%` }} />
        </div>
      </header>

      <main className="flex-1 max-w-xl mx-auto w-full px-4 py-8 flex flex-col gap-5">
        {step === 0 && (
          <>
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-50 mb-4">
                <ClipboardList className="h-7 w-7 text-red-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-1">Évaluation de votre formation</h1>
              <p className="text-sm text-gray-400">
                {info?.stagiaire !== "Anonyme" ? `Bonjour ${info?.stagiaire}, votre` : "Votre"} avis compte beaucoup pour nous.
              </p>
            </div>
            <div className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
              <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Type d&apos;évaluation</p>
                <p className="text-sm font-semibold text-gray-800">
                  {info?.type === "satisfaction_froid" ? "Satisfaction à froid" : "Satisfaction à chaud"}
                </p>
              </div>
              <span className="ml-auto text-xs font-medium text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
                {totalSteps - 1} étape{totalSteps - 2 !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <p className="text-xs text-red-600 font-semibold uppercase tracking-wider mb-2">Étape 1</p>
              <h2 className="text-lg font-bold text-gray-900 mb-1">Note globale</h2>
              <p className="text-sm text-gray-400 mb-6">Quelle note donneriez-vous globalement à cette formation ?</p>
              <StarRating value={noteGlobale} onChange={setNoteGlobale} size="lg" />
            </div>
          </>
        )}

        {currentSection && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <p className="text-xs text-red-600 font-semibold uppercase tracking-wider mb-2">
              Section {step} / {sections.length}
            </p>
            <h2 className="text-lg font-bold text-gray-900 mb-1">{currentSection.titre}</h2>
            <p className="text-sm text-gray-400 mb-6">Notez chaque critère de 1 à 5.</p>
            <div className="space-y-6">
              {currentSection.questions.map((q, i) => (
                <div key={q.key} className="pb-6 border-b border-gray-50 last:border-0 last:pb-0">
                  <div className="flex items-start gap-3 mb-4">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-red-50 text-red-600 text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                    <p className="text-sm font-medium text-gray-700 leading-relaxed">{q.label}</p>
                  </div>
                  <div className="pl-9">
                    <StarRating value={reponses[q.key] || 0} onChange={(n) => setReponses({ ...reponses, [q.key]: n })} size="md" />
                  </div>
                </div>
              ))}
            </div>
            {!isSectionComplete(currentSection) && (
              <div className="mt-5 flex items-center gap-2 bg-amber-50 rounded-xl px-4 py-3">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                <p className="text-xs text-amber-700">Veuillez noter tous les critères pour continuer.</p>
              </div>
            )}
          </div>
        )}

        {isLastStep && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Récapitulatif</p>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} className={`h-5 w-5 ${n <= noteGlobale ? "text-yellow-400 fill-yellow-400" : "text-gray-200 fill-gray-200"}`} />
                  ))}
                </div>
                <span className={`text-sm font-semibold ${NOTE_COLORS[noteGlobale]}`}>{NOTE_LABELS[noteGlobale]}</span>
              </div>
              <p className="text-xs text-gray-400">{Object.keys(reponses).length} critère{Object.keys(reponses).length > 1 ? "s" : ""} évalué{Object.keys(reponses).length > 1 ? "s" : ""}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-1">Commentaires libres</h2>
              <p className="text-sm text-gray-400 mb-4">Partagez vos remarques (optionnel).</p>
              <textarea
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
                rows={5}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 bg-slate-50 focus:ring-2 focus:ring-red-400 focus:border-transparent resize-none outline-none transition"
                placeholder="Vos retours nous aident à améliorer nos formations..."
              />
            </div>
            {submitError && <p className="text-sm text-red-600 text-center bg-red-50 rounded-xl py-3 px-4">{submitError}</p>}
          </div>
        )}

        <div className={`flex gap-3 pt-2 ${step === 0 ? "justify-end" : "justify-between"}`}>
          {step > 0 && (
            <button type="button" onClick={() => setStep(step - 1)}
              className="flex items-center gap-2 px-5 py-3 rounded-xl border border-gray-200 bg-white text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm">
              <ChevronLeft className="h-4 w-4" /> Précédent
            </button>
          )}
          {isLastStep ? (
            <button type="button" onClick={handleSubmit} disabled={submitting || noteGlobale === 0}
              className="flex-1 sm:flex-none sm:min-w-[200px] flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors shadow-md">
              {submitting ? <><div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Envoi...</> : <><CheckCircle className="h-4 w-4" />Envoyer mon évaluation</>}
            </button>
          ) : (
            <button type="button" onClick={() => setStep(step + 1)} disabled={!canNext}
              className="flex-1 sm:flex-none sm:min-w-[160px] flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors shadow-md">
              Continuer <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </main>

      <footer className="text-center py-5 text-xs text-gray-300 border-t border-gray-100 bg-white">
        RFC — Rescue Formation Conseil · Sécurité · Incendie · Prévention
      </footer>
    </div>
  );
}
