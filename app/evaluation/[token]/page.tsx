"use client";

import { useState, useEffect, use } from "react";
import { Star, CheckCircle, AlertCircle } from "lucide-react";

const QUESTIONS_CHAUD = [
  { key: "contenu", label: "Le contenu de la formation correspondait a vos attentes" },
  { key: "pedagogie", label: "Les methodes pedagogiques etaient adaptees" },
  { key: "formateur", label: "Le formateur etait competent et a l'ecoute" },
  { key: "organisation", label: "L'organisation logistique etait satisfaisante" },
  { key: "applicable", label: "Les connaissances acquises sont applicables dans votre travail" },
];

const QUESTIONS_FROID = [
  { key: "mise_en_pratique", label: "Vous avez pu mettre en pratique les connaissances acquises" },
  { key: "impact_travail", label: "La formation a eu un impact positif sur votre travail" },
  { key: "competences", label: "Vous estimez avoir progresse dans vos competences" },
  { key: "recommandation", label: "Vous recommanderiez cette formation a un collegue" },
  { key: "besoin_complement", label: "Vous estimez avoir besoin d'une formation complementaire" },
];

export default function EvaluationPubliquePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [info, setInfo] = useState<{
    type: string;
    estComplete: boolean;
    formation: string;
    stagiaire: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [noteGlobale, setNoteGlobale] = useState(0);
  const [reponses, setReponses] = useState<Record<string, number>>({});
  const [commentaire, setCommentaire] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch(`/api/evaluations/public/${token}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) {
          setError("Impossible de charger l'évaluation");
        } else if (data.error) {
          setError(data.error);
        } else {
          setInfo(data);
          if (data.estComplete) setSubmitted(true);
        }
        setLoading(false);
      });
  }, [token]);

  const questions = info?.type === "satisfaction_froid" ? QUESTIONS_FROID : QUESTIONS_CHAUD;

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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Merci !</h1>
          <p className="text-gray-600">
            Votre évaluation a bien été enregistrée. Vos retours nous aident à améliorer nos formations.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-blue-600 text-white rounded-t-xl p-6">
          <h1 className="text-xl font-bold">Rescue Formation Conseil</h1>
          <p className="text-blue-100 text-sm mt-1">
            {info?.type === "satisfaction_froid"
              ? "Questionnaire de satisfaction a froid"
              : "Questionnaire de satisfaction a chaud"}
          </p>
        </div>

        <div className="bg-white border border-t-0 rounded-b-xl p-6 space-y-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-gray-500">Formation</p>
            <p className="font-semibold text-gray-900">{info?.formation}</p>
            <p className="text-sm text-gray-500 mt-1">Participant : {info?.stagiaire}</p>
          </div>

          {/* Note globale */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Note globale de la formation *
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setNoteGlobale(n)}
                  className="focus:outline-none"
                >
                  <Star
                    className={`h-8 w-8 transition-colors ${
                      n <= noteGlobale ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Questions detaillees */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">Evaluation detaillee</h3>
            {questions.map((q) => (
              <div key={q.key} className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-700 flex-1 pr-4">{q.label}</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setReponses({ ...reponses, [q.key]: n })}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`h-5 w-5 transition-colors ${
                          n <= (reponses[q.key] || 0)
                            ? "text-yellow-400 fill-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Commentaire */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Commentaires ou suggestions
            </label>
            <textarea
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              rows={4}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Vos remarques sont precieuses pour nous..."
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={noteGlobale === 0 || submitting}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? "Envoi en cours..." : "Envoyer mon evaluation"}
          </button>
        </div>
      </div>
    </div>
  );
}
