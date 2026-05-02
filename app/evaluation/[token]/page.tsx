"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { CheckCircle2, AlertCircle, Loader2, Save } from "lucide-react";
import { QuestionRenderer, QuestionItem } from "@/components/shared/QuestionRenderer";
import { useApi, useApiMutation, ApiError } from "@/hooks/useApi";

// ── Types ──────────────────────────────────────────────────────────────────
type LegacyQuestion = { key: string; label: string };
type LegacySection = { id: string; titre: string; questions: LegacyQuestion[] };

type CustomApiResponse = {
  id: string;
  type: string;
  estComplete: boolean;
  formation: string;
  stagiaire: string;
  isCustom: true;
  questions: QuestionItem[];
};

type LegacyApiResponse = {
  id: string;
  type: string;
  estComplete: boolean;
  formation: string;
  stagiaire: string;
  isCustom: false;
  sections: LegacySection[];
};

type ApiResponse = CustomApiResponse | LegacyApiResponse;

const TYPE_LABELS: Record<string, string> = {
  satisfaction_chaud: "Satisfaction a chaud",
  satisfaction_froid: "Satisfaction a froid",
  acquis: "Evaluation des acquis",
};

export default function EvaluationPublicPage() {
  const { token } = useParams<{ token: string }>();
  const { data, error: fetchError, isLoading } = useApi<ApiResponse>(
    token ? `/api/evaluations/public/${token}` : null
  );
  const submitMutation = useApiMutation<{ reponses: Record<string, string | number | boolean>; commentaire: string; isCustom: true }, unknown>(
    `/api/evaluations/public/${token}`,
    "POST"
  );
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [reponses, setReponses] = useState<Record<string, string | number | boolean>>({});
  const [commentaire, setCommentaire] = useState("");
  const [autosaveStatus, setAutosaveStatus] = useState<"" | "saved">("");

  const storageKey = `eval_draft_${token}`;
  const loading = isLoading;
  const submitting = submitMutation.isMutating;
  const loadError = fetchError ? "Lien invalide ou expire" : "";

  // Restore draft once data loads
  useEffect(() => {
    if (!data) return;
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.reponses) setReponses(parsed.reponses);
        if (parsed.commentaire) setCommentaire(parsed.commentaire);
      }
    } catch { /* empty */ }
  }, [data, storageKey]);

  // Autosave local storage
  useEffect(() => {
    if (!data || data.estComplete || submitted) return;
    const t = setTimeout(() => {
      if (typeof window !== "undefined") {
        localStorage.setItem(storageKey, JSON.stringify({ reponses, commentaire }));
        setAutosaveStatus("saved");
        setTimeout(() => setAutosaveStatus(""), 1500);
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [reponses, commentaire, data, submitted, storageKey]);

  const setReponse = useCallback((qid: string, value: string | number | boolean) => {
    setReponses((prev) => ({ ...prev, [qid]: value }));
  }, []);

  // ── Format unifie : convertit legacy sections -> liste de QuestionItem ────
  const normalizedQuestions = useMemo<QuestionItem[]>(() => {
    if (!data) return [];
    if (data.isCustom) return data.questions;
    // Legacy: transformer les sections en items (section_header + notes)
    const items: QuestionItem[] = [];
    for (const s of data.sections) {
      items.push({ type: "section", id: s.id, label: s.titre });
      for (const q of s.questions) {
        items.push({ id: q.key, type: "note", required: true, label: q.label });
      }
    }
    return items;
  }, [data]);

  // ── Progress bar ─────────────────────────────────────────────────────────
  const realQuestions = normalizedQuestions.filter((q) => q.type !== "section");
  const requiredQuestions = realQuestions.filter((q) => "required" in q && q.required);
  const answeredRequired = requiredQuestions.filter((q) => {
    const v = reponses[(q as { id: string }).id];
    return v !== undefined && v !== null && v !== "";
  });
  const answeredCount = realQuestions.filter((q) => {
    const v = reponses[(q as { id: string }).id];
    return v !== undefined && v !== null && v !== "";
  }).length;
  const progress = realQuestions.length > 0 ? Math.round((answeredCount / realQuestions.length) * 100) : 0;
  const canSubmit = answeredRequired.length === requiredQuestions.length;

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!data || !canSubmit) return;
    setError("");
    try {
      await submitMutation.trigger({ reponses, commentaire, isCustom: true });
      // Nettoyer le draft
      if (typeof window !== "undefined") localStorage.removeItem(storageKey);
      setSubmitted(true);
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message || "Erreur lors de l'envoi");
      } else {
        setError("Erreur reseau");
      }
    }
  };

  // ── Rendering ────────────────────────────────────────────────────────────
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="h-8 w-8 animate-spin text-red-600" /></div>;
  }

  if (loadError && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md bg-white rounded-xl shadow p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Lien invalide</h1>
          <p className="text-sm text-gray-600">{loadError}</p>
        </div>
      </div>
    );
  }

  if (submitted || data?.estComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md bg-white rounded-xl shadow p-8 text-center">
          <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Merci !</h1>
          <p className="text-sm text-gray-600">Votre evaluation a bien ete enregistree. Nous prenons en compte vos retours pour ameliorer nos formations.</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header sticky */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Image src="/logorescue.png" alt="RFC" width={40} height={40} className="rounded-lg" />
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-gray-900 truncate">
              {TYPE_LABELS[data.type] || "Evaluation"}
            </h1>
            <p className="text-xs text-gray-500 truncate">{data.formation}</p>
          </div>
          <div className="hidden sm:flex items-center gap-1 text-xs text-gray-500 mr-2">
            {autosaveStatus === "saved" && (
              <><Save className="h-3 w-3" /> Sauvegarde locale</>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">{answeredCount}/{realQuestions.length}</p>
            <p className="text-[10px] text-gray-400">repondues</p>
          </div>
        </div>
        <div className="h-1 bg-gray-100">
          <div className="h-1 bg-red-600 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Body */}
      <div className="max-w-3xl mx-auto px-4 py-6 md:py-8">
        <div className="bg-white rounded-xl shadow-sm p-6 md:p-8 mb-4">
          <p className="text-sm text-gray-700">
            Bonjour <strong>{data.stagiaire}</strong>, merci de prendre quelques minutes pour evaluer votre formation
            <strong> &quot;{data.formation}&quot;</strong>.
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Votre reponse est anonymisee et sera utilisee uniquement pour ameliorer la qualite des formations. Les champs marques d&apos;un * sont obligatoires.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 md:p-8 space-y-5">
          {normalizedQuestions.map((q, i) => (
            <QuestionRenderer
              key={(q as { id: string }).id ?? i}
              question={q}
              value={q.type !== "section" ? reponses[(q as { id: string }).id] : undefined}
              onChange={q.type !== "section" ? (v) => setReponse((q as { id: string }).id, v) : undefined}
            />
          ))}

          {/* Commentaire libre final */}
          <div className="space-y-2 pt-4 border-t border-gray-200">
            <label className="block text-sm font-medium text-gray-900">
              Commentaire libre (facultatif)
            </label>
            <textarea
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:border-red-500"
              placeholder="Avez-vous des suggestions, remarques ou felicitations a partager ?"
            />
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-md p-3 text-sm">{error}</div>
        )}

        {/* Submit */}
        <div className="sticky bottom-0 bg-slate-50 pt-4 pb-6">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !canSubmit}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 rounded-md shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {submitting ? "Envoi en cours..." : canSubmit ? "Transmettre mon evaluation" : `${requiredQuestions.length - answeredRequired.length} question(s) obligatoire(s) restante(s)`}
          </button>
          <p className="text-[10px] text-gray-400 text-center mt-2">
            Vos reponses sont automatiquement sauvegardees localement. Vous pouvez fermer et rouvrir cette page sans perdre votre progression.
          </p>
        </div>
      </div>
    </div>
  );
}
