"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, GripVertical, ChevronUp, ChevronDown, Save } from "lucide-react";

export type Question = {
  id: string;
  type: "note" | "texte" | "oui_non" | "choix";
  label: string;
  required: boolean;
  options?: string[]; // for "choix"
};

type Props = {
  initialNom?: string;
  initialDescription?: string;
  initialType?: string;
  initialQuestions?: Question[];
  templateId?: string; // if editing existing
};

const TYPE_OPTIONS = [
  { value: "custom", label: "Personnalisé" },
  { value: "satisfaction_chaud", label: "Satisfaction à chaud" },
  { value: "satisfaction_froid", label: "Satisfaction à froid" },
  { value: "acquis", label: "Évaluation des acquis" },
];

const QUESTION_TYPES = [
  { value: "note", label: "Note (1 à 5 étoiles)" },
  { value: "texte", label: "Réponse texte libre" },
  { value: "oui_non", label: "Oui / Non" },
  { value: "choix", label: "Choix multiple" },
];

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export default function TemplateBuilder({
  initialNom = "",
  initialDescription = "",
  initialType = "custom",
  initialQuestions = [],
  templateId,
}: Props) {
  const router = useRouter();
  const [nom, setNom] = useState(initialNom);
  const [description, setDescription] = useState(initialDescription);
  const [type, setType] = useState(initialType);
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      { id: uid(), type: "note", label: "", required: true, options: [] },
    ]);
  };

  const updateQuestion = (id: string, patch: Partial<Question>) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  };

  const removeQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const moveQuestion = (idx: number, dir: -1 | 1) => {
    setQuestions((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const addOption = (qid: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === qid ? { ...q, options: [...(q.options || []), ""] } : q
      )
    );
  };

  const updateOption = (qid: string, idx: number, val: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== qid) return q;
        const opts = [...(q.options || [])];
        opts[idx] = val;
        return { ...q, options: opts };
      })
    );
  };

  const removeOption = (qid: string, idx: number) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== qid) return q;
        const opts = [...(q.options || [])];
        opts.splice(idx, 1);
        return { ...q, options: opts };
      })
    );
  };

  const handleSave = async () => {
    if (!nom.trim()) { setError("Le nom du modèle est requis."); return; }
    if (questions.some((q) => !q.label.trim())) { setError("Toutes les questions doivent avoir un intitulé."); return; }
    setSaving(true);
    setError("");

    const url = templateId
      ? `/api/evaluation-templates/${templateId}`
      : "/api/evaluation-templates";
    const method = templateId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom, description, type, questions }),
    });

    if (res.ok) {
      router.push("/evaluations/modeles");
    } else {
      setError("Erreur lors de la sauvegarde.");
    }
    setSaving(false);
  };

  return (
    <div className="max-w-3xl">
      <Link
        href="/evaluations/modeles"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-200 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux modèles
      </Link>

      <h1 className="text-2xl font-bold text-gray-100 mb-8">
        {templateId ? "Modifier le modèle" : "Nouveau modèle d'évaluation"}
      </h1>

      {/* Infos générales */}
      <div className="rounded-xl border border-gray-700 bg-gray-800 p-6 mb-6 space-y-4">
        <h2 className="font-semibold text-gray-100">Informations générales</h2>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Nom du modèle *</label>
          <input
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Ex: Satisfaction formation incendie"
            className="w-full rounded-md border border-gray-600 bg-gray-900 text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Description (optionnel)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Décrivez l'objectif de ce modèle..."
            className="w-full rounded-md border border-gray-600 bg-gray-900 text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Catégorie</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full rounded-md border border-gray-600 bg-gray-900 text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Questions */}
      <div className="rounded-xl border border-gray-700 bg-gray-800 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-100">Questions ({questions.length})</h2>
          <button
            type="button"
            onClick={addQuestion}
            className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Ajouter une question
          </button>
        </div>

        {questions.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-700 rounded-lg">
            <p className="text-gray-500 text-sm">Aucune question. Cliquez sur &quot;Ajouter une question&quot; pour commencer.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((q, idx) => (
              <div key={q.id} className="rounded-lg border border-gray-600 bg-gray-900 p-4">
                <div className="flex items-start gap-3">
                  {/* Move buttons */}
                  <div className="flex flex-col gap-0.5 mt-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => moveQuestion(idx, -1)}
                      disabled={idx === 0}
                      className="p-0.5 text-gray-600 hover:text-gray-400 disabled:opacity-30"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <GripVertical className="h-4 w-4 text-gray-600 mx-auto" />
                    <button
                      type="button"
                      onClick={() => moveQuestion(idx, 1)}
                      disabled={idx === questions.length - 1}
                      className="p-0.5 text-gray-600 hover:text-gray-400 disabled:opacity-30"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Question content */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-500 shrink-0">Q{idx + 1}</span>
                      <input
                        value={q.label}
                        onChange={(e) => updateQuestion(q.id, { label: e.target.value })}
                        placeholder="Intitulé de la question..."
                        className="flex-1 rounded-md border border-gray-600 bg-gray-800 text-gray-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                      <select
                        value={q.type}
                        onChange={(e) => updateQuestion(q.id, { type: e.target.value as Question["type"], options: [] })}
                        className="rounded-md border border-gray-600 bg-gray-800 text-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        {QUESTION_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>

                      <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={q.required}
                          onChange={(e) => updateQuestion(q.id, { required: e.target.checked })}
                          className="rounded border-gray-600 bg-gray-800 text-red-600 focus:ring-red-500"
                        />
                        Obligatoire
                      </label>
                    </div>

                    {/* Options for "choix" type */}
                    {q.type === "choix" && (
                      <div className="space-y-2 pl-2 border-l-2 border-gray-700">
                        <p className="text-xs text-gray-500">Options de choix :</p>
                        {(q.options || []).map((opt, oi) => (
                          <div key={oi} className="flex items-center gap-2">
                            <span className="text-xs text-gray-600">{oi + 1}.</span>
                            <input
                              value={opt}
                              onChange={(e) => updateOption(q.id, oi, e.target.value)}
                              placeholder={`Option ${oi + 1}`}
                              className="flex-1 rounded border border-gray-600 bg-gray-800 text-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-red-500"
                            />
                            <button
                              type="button"
                              onClick={() => removeOption(q.id, oi)}
                              className="text-gray-600 hover:text-red-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => addOption(q.id)}
                          className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                        >
                          <Plus className="h-3 w-3" />
                          Ajouter une option
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => removeQuestion(q.id)}
                    className="shrink-0 p-1 text-gray-600 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-md bg-red-900/20 border border-red-700 px-4 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Save */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          <Save className="h-4 w-4" />
          {saving ? "Enregistrement..." : "Enregistrer le modèle"}
        </button>
        <Link
          href="/evaluations/modeles"
          className="inline-flex items-center gap-2 rounded-md border border-gray-600 px-5 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors"
        >
          Annuler
        </Link>
      </div>
    </div>
  );
}
