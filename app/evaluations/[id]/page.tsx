"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Star, User, BookOpen, Calendar, MessageSquare, CheckCircle, Clock, Pencil, Save, X, Sparkles } from "lucide-react";
import { EVALUATION_TYPES } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

type Evaluation = {
  id: string;
  type: string;
  cible: string;
  noteGlobale: number | null;
  estComplete: boolean;
  commentaire: string | null;
  reponses: string;
  tokenAcces: string | null;
  createdAt: string;
  session: {
    id: string;
    dateDebut?: string;
    dateFin?: string;
    formation: { id: string; titre: string };
    formateur: { id: string; nom: string; prenom: string } | null;
  };
  contact: { id: string; nom: string; prenom: string; email: string } | null;
};

type ReponseItem = {
  question?: string;
  label?: string;
  note?: number;
  score?: number;
  value?: string | number;
  reponse?: string;
};

export default function EvaluationDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editNote, setEditNote] = useState<number>(0);
  const [editCommentaire, setEditCommentaire] = useState("");
  const [editComplete, setEditComplete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // IA
  const [analyse, setAnalyse] = useState("");
  const [analyseEdited, setAnalyseEdited] = useState("");
  const [analyseLoading, setAnalyseLoading] = useState(false);
  const [analyseError, setAnalyseError] = useState("");

  useEffect(() => {
    fetch(`/api/evaluations/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Évaluation introuvable");
        return r.json();
      })
      .then((data) => {
        setEvaluation(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  const startEdit = () => {
    if (!evaluation) return;
    setEditNote(evaluation.noteGlobale ?? 0);
    setEditCommentaire(evaluation.commentaire ?? "");
    setEditComplete(evaluation.estComplete);
    setSaveMsg("");
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setSaveMsg("");
  };

  const handleAnalyse = async () => {
    setAnalyseLoading(true);
    setAnalyseError("");
    setAnalyse("");
    setAnalyseEdited("");
    const res = await fetch(`/api/evaluations/${id}/analyse`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setAnalyse(data.analyse);
      setAnalyseEdited(data.analyse);
    } else {
      setAnalyseError("Erreur lors de l'analyse. Vérifiez que la clé API Anthropic est configurée.");
    }
    setAnalyseLoading(false);
  };

  const handleSave = async () => {
    if (!evaluation) return;
    setSaving(true);
    setSaveMsg("");
    const res = await fetch(`/api/evaluations/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        noteGlobale: editNote || null,
        commentaire: editCommentaire || null,
        estComplete: editComplete,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setEvaluation((prev) => prev ? { ...prev, ...updated } : prev);
      setSaveMsg("Modifications enregistrées");
      setEditing(false);
    } else {
      setSaveMsg("Erreur lors de la sauvegarde");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !evaluation) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-400 mb-4">{error || "Évaluation introuvable"}</p>
        <Link href="/evaluations" className="text-red-500 hover:underline">
          Retour aux évaluations
        </Link>
      </div>
    );
  }

  const typeLabel = EVALUATION_TYPES[evaluation.type as keyof typeof EVALUATION_TYPES]?.label || evaluation.type;

  let reponses: ReponseItem[] = [];
  try {
    const parsed = JSON.parse(evaluation.reponses);
    if (Array.isArray(parsed)) {
      reponses = parsed;
    } else if (typeof parsed === "object" && parsed !== null) {
      reponses = Object.entries(parsed).map(([key, val]) => {
        if (typeof val === "object" && val !== null) {
          return { question: key, ...(val as Record<string, unknown>) } as ReponseItem;
        }
        return { question: key, value: val } as ReponseItem;
      });
    }
  } catch {
    // reponses stays empty
  }

  return (
    <div className="max-w-4xl">
      <Link
        href="/evaluations"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-200 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux évaluations
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 mb-2">{typeLabel}</h1>
          <p className="text-gray-400">{evaluation.session.formation.titre}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${
            evaluation.estComplete ? "bg-green-900/30 text-green-400" : "bg-gray-700 text-gray-400"
          }`}>
            {evaluation.estComplete ? <CheckCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
            {evaluation.estComplete ? "Complétée" : "En attente"}
          </span>
          <button
            onClick={handleAnalyse}
            disabled={analyseLoading}
            className="inline-flex items-center gap-1.5 rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700 transition-colors disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            {analyseLoading ? "Analyse en cours..." : "Analyser avec IA"}
          </button>
          {!editing && (
            <button
              onClick={startEdit}
              className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 transition-colors"
            >
              <Pencil className="h-4 w-4" />
              Modifier
            </button>
          )}
        </div>
      </div>

      {/* Message de sauvegarde */}
      {saveMsg && !editing && (
        <div className="mb-4 rounded-md bg-green-900/20 border border-green-700 px-4 py-2 text-sm text-green-400">
          {saveMsg}
        </div>
      )}

      {/* Formulaire d'édition */}
      {editing && (
        <div className="mb-8 rounded-xl border border-red-700 bg-gray-800 p-6 space-y-5">
          <h2 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
            <Pencil className="h-5 w-5 text-red-400" />
            Modifier l&apos;évaluation
          </h2>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Note globale</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setEditNote(n)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star className={`h-8 w-8 ${n <= editNote ? "fill-amber-400 text-amber-400" : "text-gray-600"}`} />
                </button>
              ))}
              {editNote > 0 && (
                <button
                  type="button"
                  onClick={() => setEditNote(0)}
                  className="ml-2 text-xs text-gray-500 hover:text-gray-300"
                >
                  Effacer
                </button>
              )}
            </div>
          </div>

          {/* Commentaire */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Commentaire</label>
            <textarea
              value={editCommentaire}
              onChange={(e) => setEditCommentaire(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-gray-600 bg-gray-900 text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Commentaire libre..."
            />
          </div>

          {/* Statut */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-300">Marquer comme complétée</label>
            <button
              type="button"
              onClick={() => setEditComplete(!editComplete)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                editComplete ? "bg-green-600" : "bg-gray-600"
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                editComplete ? "translate-x-6" : "translate-x-1"
              }`} />
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              <Save className="h-4 w-4" />
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
            <button
              onClick={cancelEdit}
              className="inline-flex items-center gap-2 rounded-md border border-gray-600 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors"
            >
              <X className="h-4 w-4" />
              Annuler
            </button>
            {saveMsg && (
              <span className="text-sm text-red-400 self-center">{saveMsg}</span>
            )}
          </div>
        </div>
      )}

      {/* Info cards row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Note globale */}
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-5">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
            <Star className="h-4 w-4" />
            Note globale
          </div>
          {evaluation.noteGlobale ? (
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold text-amber-400">{evaluation.noteGlobale}</span>
              <span className="text-gray-400 text-lg">/5</span>
              <div className="flex ml-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`h-5 w-5 ${i < evaluation.noteGlobale! ? "fill-amber-400 text-amber-400" : "text-gray-600"}`} />
                ))}
              </div>
            </div>
          ) : (
            <p className="text-gray-500">Aucune note</p>
          )}
        </div>

        {/* Répondant */}
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-5">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
            <User className="h-4 w-4" />
            Répondant
          </div>
          {evaluation.contact ? (
            <div>
              <p className="text-gray-100 font-medium">{evaluation.contact.prenom} {evaluation.contact.nom}</p>
              <p className="text-gray-400 text-sm">{evaluation.contact.email}</p>
            </div>
          ) : (
            <p className="text-gray-500">Non renseigné</p>
          )}
          <p className="text-gray-500 text-xs mt-2 capitalize">Cible : {evaluation.cible}</p>
        </div>

        {/* Session / Formation */}
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-5">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
            <BookOpen className="h-4 w-4" />
            Session
          </div>
          <Link href={`/sessions/${evaluation.session.id}`} className="text-red-500 hover:underline font-medium">
            {evaluation.session.formation.titre}
          </Link>
          {evaluation.session.formateur && (
            <p className="text-gray-400 text-sm mt-1">
              Formateur : {evaluation.session.formateur.prenom} {evaluation.session.formateur.nom}
            </p>
          )}
        </div>
      </div>

      {/* Date */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-8">
        <Calendar className="h-4 w-4" />
        Créée le {formatDate(evaluation.createdAt)}
      </div>

      {/* Réponses détaillées */}
      {reponses.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Réponses détaillées
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reponses.map((item, idx) => {
              const label = item.question || item.label || `Question ${idx + 1}`;
              const score = item.note ?? item.score ?? item.value;
              const isNumeric = typeof score === "number";
              const textAnswer = item.reponse || (typeof item.value === "string" ? item.value : null);
              return (
                <div key={idx} className="rounded-lg border border-gray-700 bg-gray-800 p-4">
                  <p className="text-sm text-gray-400 mb-2">{label}</p>
                  {isNumeric && (
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-gray-100">{score}</span>
                      {typeof score === "number" && score <= 5 && (
                        <div className="flex">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`h-4 w-4 ${i < (score as number) ? "fill-amber-400 text-amber-400" : "text-gray-600"}`} />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {textAnswer && <p className="text-gray-300 text-sm mt-1">{textAnswer}</p>}
                  {!isNumeric && !textAnswer && <p className="text-gray-500 text-sm">—</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Commentaire */}
      {evaluation.commentaire && (
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-5">
          <h2 className="text-lg font-semibold text-gray-100 mb-3 flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Commentaire
          </h2>
          <p className="text-gray-300 whitespace-pre-wrap">{evaluation.commentaire}</p>
        </div>
      )}

      {/* Analyse IA */}
      {analyseError && (
        <div className="mt-6 rounded-lg border border-red-700 bg-red-900/20 p-4 text-sm text-red-400">
          {analyseError}
        </div>
      )}

      {analyseLoading && (
        <div className="mt-6 rounded-lg border border-violet-700 bg-violet-900/10 p-6 flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
          <span className="text-sm text-violet-300">Claude analyse l&apos;évaluation...</span>
        </div>
      )}

      {analyse && (
        <div className="mt-6 rounded-xl border border-violet-700 bg-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-400" />
              Analyse IA
            </h2>
            <button
              onClick={handleAnalyse}
              disabled={analyseLoading}
              className="text-xs text-violet-400 hover:text-violet-300 underline"
            >
              Régénérer
            </button>
          </div>
          <p className="text-xs text-gray-500 mb-3">Vous pouvez modifier le texte ci-dessous librement.</p>
          <textarea
            value={analyseEdited}
            onChange={(e) => setAnalyseEdited(e.target.value)}
            rows={20}
            className="w-full rounded-md border border-gray-600 bg-gray-900 text-gray-100 px-4 py-3 text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-violet-500 resize-y"
          />
          <div className="mt-3 flex gap-3">
            <button
              onClick={() => {
                navigator.clipboard.writeText(analyseEdited);
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-gray-700 transition-colors"
            >
              Copier
            </button>
            <button
              onClick={() => { setAnalyse(""); setAnalyseEdited(""); }}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-400 hover:bg-gray-700 transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
