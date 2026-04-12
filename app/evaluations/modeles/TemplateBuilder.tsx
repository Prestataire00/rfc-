"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, Save, Eye,
  Star, AlignLeft, ToggleLeft, ListChecks, Sliders, Heading2,
} from "lucide-react";
import { QuestionRenderer, QuestionItem } from "@/components/shared/QuestionRenderer";

export type Question = {
  id: string;
  type: "note" | "texte" | "oui_non" | "choix" | "echelle" | "section";
  label: string;
  required?: boolean;
  options?: string[];
  echelleMin?: number;
  echelleMax?: number;
  echelleLabelMin?: string;
  echelleLabelMax?: string;
};

type Props = {
  initialNom?: string;
  initialDescription?: string;
  initialType?: string;
  initialQuestions?: Question[];
  templateId?: string;
};

const TYPE_OPTIONS = [
  { value: "custom", label: "Personnalise" },
  { value: "satisfaction_chaud", label: "Satisfaction a chaud" },
  { value: "satisfaction_froid", label: "Satisfaction a froid" },
  { value: "acquis", label: "Evaluation des acquis" },
];

const QUESTION_TYPES: { value: Question["type"]; label: string; icon: React.ElementType }[] = [
  { value: "note", label: "Note (1 a 5 etoiles)", icon: Star },
  { value: "echelle", label: "Echelle (0 a 10 / NPS)", icon: Sliders },
  { value: "texte", label: "Reponse texte libre", icon: AlignLeft },
  { value: "oui_non", label: "Oui / Non", icon: ToggleLeft },
  { value: "choix", label: "Choix unique", icon: ListChecks },
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
  const [autosaveStatus, setAutosaveStatus] = useState<"saved" | "saving" | "local" | "">("");
  const [showPreview, setShowPreview] = useState(true);

  // Autosave draft in localStorage
  const draftKey = templateId ? `template_draft_${templateId}` : "template_draft_new";
  const firstRender = useRef(true);

  // Load draft on mount (only if newer than initial data)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!firstRender.current) return;
    firstRender.current = false;
    try {
      const draft = localStorage.getItem(draftKey);
      if (!draft) return;
      const parsed = JSON.parse(draft);
      if (parsed && Array.isArray(parsed.questions)) {
        // Only restore if user confirms
        if (confirm("Un brouillon non sauvegarde a ete trouve. Le restaurer ?")) {
          setNom(parsed.nom || initialNom);
          setDescription(parsed.description || initialDescription);
          setType(parsed.type || initialType);
          setQuestions(parsed.questions);
          setAutosaveStatus("local");
        } else {
          localStorage.removeItem(draftKey);
        }
      }
    } catch { /* empty */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save draft every 3s when changes detected
  useEffect(() => {
    if (typeof window === "undefined") return;
    const t = setTimeout(() => {
      localStorage.setItem(draftKey, JSON.stringify({ nom, description, type, questions }));
      setAutosaveStatus("local");
    }, 3000);
    return () => clearTimeout(t);
  }, [nom, description, type, questions, draftKey]);

  const addQuestion = (qType: Question["type"] = "note") => {
    setQuestions((prev) => [
      ...prev,
      {
        id: uid(),
        type: qType,
        label: "",
        required: qType !== "section",
        ...(qType === "choix" ? { options: ["", ""] } : {}),
        ...(qType === "echelle" ? { echelleMin: 0, echelleMax: 10 } : {}),
      },
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
    setQuestions((prev) => prev.map((q) => q.id === qid ? { ...q, options: [...(q.options || []), ""] } : q));
  };
  const updateOption = (qid: string, idx: number, val: string) => {
    setQuestions((prev) => prev.map((q) => {
      if (q.id !== qid) return q;
      const opts = [...(q.options || [])];
      opts[idx] = val;
      return { ...q, options: opts };
    }));
  };
  const removeOption = (qid: string, idx: number) => {
    setQuestions((prev) => prev.map((q) => {
      if (q.id !== qid) return q;
      const opts = [...(q.options || [])];
      opts.splice(idx, 1);
      return { ...q, options: opts };
    }));
  };

  const handleSave = async () => {
    if (!nom.trim()) { setError("Le nom est obligatoire"); return; }
    const realQuestions = questions.filter((q) => q.type !== "section");
    if (realQuestions.length === 0) { setError("Ajoutez au moins une question"); return; }
    setError("");
    setSaving(true);
    setAutosaveStatus("saving");

    const body = { nom, description, type, questions };
    const res = await fetch(
      templateId ? `/api/evaluation-templates/${templateId}` : "/api/evaluation-templates",
      {
        method: templateId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    if (res.ok) {
      const data = await res.json();
      localStorage.removeItem(draftKey);
      setAutosaveStatus("saved");
      if (!templateId) router.push(`/evaluations/modeles/${data.id}`);
      else { setTimeout(() => setAutosaveStatus(""), 2000); }
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Erreur lors de la sauvegarde");
      setAutosaveStatus("");
    }
    setSaving(false);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link href="/evaluations/modeles" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-300 mb-4">
          <ArrowLeft className="h-4 w-4" /> Retour aux modeles
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-100">
              {templateId ? "Modifier le template" : "Nouveau template"}
            </h1>
            <p className="text-sm text-gray-400 mt-1">Construisez votre questionnaire — il sera envoye au destinataire via un lien unique.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-gray-500 mr-2">
              {autosaveStatus === "saving" && "Sauvegarde..."}
              {autosaveStatus === "saved" && "Sauvegarde"}
              {autosaveStatus === "local" && "Brouillon local"}
            </div>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="hidden lg:inline-flex items-center gap-1.5 rounded-md border border-gray-600 bg-gray-800 hover:bg-gray-700 px-3 py-2 text-sm text-gray-300"
            >
              <Eye className="h-4 w-4" /> {showPreview ? "Masquer" : "Afficher"} l&apos;apercu
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-md bg-red-600 hover:bg-red-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              <Save className="h-4 w-4" /> {saving ? "Sauvegarde..." : "Enregistrer"}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-900/20 border border-red-700 px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      <div className={`grid grid-cols-1 ${showPreview ? "lg:grid-cols-2" : ""} gap-6`}>
        {/* EDITION */}
        <div className="space-y-4">
          {/* Infos generales */}
          <div className="rounded-lg border border-gray-700 bg-gray-800 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-100">Informations</h2>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Nom *</label>
              <input
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                className="w-full h-10 rounded-md border border-gray-600 bg-gray-900 px-3 text-sm text-gray-100"
                placeholder="Ex : Satisfaction a chaud - SST"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-md border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-100"
                rows={2}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Categorie</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full h-10 rounded-md border border-gray-600 bg-gray-900 px-3 text-sm text-gray-100"
              >
                {TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          {/* Questions */}
          <div className="rounded-lg border border-gray-700 bg-gray-800 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-100">
                Questions ({questions.filter((q) => q.type !== "section").length})
              </h2>
            </div>

            {questions.length === 0 && (
              <p className="text-sm text-gray-500 italic text-center py-6">Aucune question. Ajoutez-en ci-dessous.</p>
            )}

            <div className="space-y-3">
              {questions.map((q, idx) => (
                <QuestionEditor
                  key={q.id}
                  question={q}
                  index={idx}
                  total={questions.length}
                  onUpdate={(patch) => updateQuestion(q.id, patch)}
                  onRemove={() => removeQuestion(q.id)}
                  onMoveUp={() => moveQuestion(idx, -1)}
                  onMoveDown={() => moveQuestion(idx, 1)}
                  onAddOption={() => addOption(q.id)}
                  onUpdateOption={(oi, v) => updateOption(q.id, oi, v)}
                  onRemoveOption={(oi) => removeOption(q.id, oi)}
                />
              ))}
            </div>

            {/* Add buttons */}
            <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-700">
              <button onClick={() => addQuestion("section")} className="inline-flex items-center gap-1 rounded-md border border-gray-600 bg-gray-900 hover:bg-gray-700 px-3 py-1.5 text-xs text-gray-300">
                <Heading2 className="h-3.5 w-3.5" /> Groupe
              </button>
              {QUESTION_TYPES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => addQuestion(value)}
                  className="inline-flex items-center gap-1 rounded-md border border-gray-600 bg-gray-900 hover:bg-gray-700 px-3 py-1.5 text-xs text-gray-300"
                >
                  <Icon className="h-3.5 w-3.5" /> {label.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* PREVIEW */}
        {showPreview && (
          <div className="hidden lg:block">
            <div className="sticky top-6">
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-2 flex items-center gap-1">
                <Eye className="h-3 w-3" /> Apercu live — vue stagiaire
              </p>
              <div className="bg-white rounded-xl border border-gray-200 p-6 max-h-[80vh] overflow-y-auto">
                {nom && <h1 className="text-xl font-bold text-gray-900 mb-1">{nom}</h1>}
                {description && <p className="text-sm text-gray-600 mb-4">{description}</p>}
                <div className="space-y-5 mt-4">
                  {questions.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">Ajoutez des questions pour voir l&apos;apercu</p>
                  ) : questions.map((q, i) => (
                    <QuestionRenderer key={q.id || i} question={q as QuestionItem} disabled />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Sub-component: QuestionEditor
// ─────────────────────────────────────────────────────────────────────
function QuestionEditor({
  question, index, total,
  onUpdate, onRemove, onMoveUp, onMoveDown,
  onAddOption, onUpdateOption, onRemoveOption,
}: {
  question: Question;
  index: number;
  total: number;
  onUpdate: (patch: Partial<Question>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddOption: () => void;
  onUpdateOption: (idx: number, val: string) => void;
  onRemoveOption: (idx: number) => void;
}) {
  // Section editor (groupe)
  if (question.type === "section") {
    return (
      <div className="rounded-md border border-red-700/30 bg-red-900/10 p-3">
        <div className="flex items-center gap-2 mb-2">
          <Heading2 className="h-4 w-4 text-red-400" />
          <span className="text-xs font-semibold text-red-400 uppercase">Groupe de questions</span>
          <div className="flex items-center gap-1 ml-auto">
            <button onClick={onMoveUp} disabled={index === 0} className="p-1 hover:bg-gray-700 rounded disabled:opacity-30"><ChevronUp className="h-3 w-3" /></button>
            <button onClick={onMoveDown} disabled={index === total - 1} className="p-1 hover:bg-gray-700 rounded disabled:opacity-30"><ChevronDown className="h-3 w-3" /></button>
            <button onClick={onRemove} className="p-1 hover:bg-red-900/30 text-gray-400 hover:text-red-400 rounded"><Trash2 className="h-3 w-3" /></button>
          </div>
        </div>
        <input
          value={question.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          placeholder="Titre du groupe (ex : Contenu de la formation)"
          className="w-full h-9 rounded-md border border-gray-600 bg-gray-900 px-3 text-sm font-semibold text-gray-100"
        />
      </div>
    );
  }

  return (
    <div className="rounded-md border border-gray-700 bg-gray-900 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <div className="text-xs text-gray-500 w-6">{index + 1}.</div>
        <select
          value={question.type}
          onChange={(e) => onUpdate({ type: e.target.value as Question["type"] })}
          className="h-8 rounded-md border border-gray-600 bg-gray-800 px-2 text-xs text-gray-200"
        >
          {QUESTION_TYPES.map((qt) => <option key={qt.value} value={qt.value}>{qt.label}</option>)}
        </select>
        <label className="inline-flex items-center gap-1.5 text-xs text-gray-400 ml-auto">
          <input
            type="checkbox"
            checked={!!question.required}
            onChange={(e) => onUpdate({ required: e.target.checked })}
            className="h-3.5 w-3.5"
          />
          Obligatoire
        </label>
        <div className="flex items-center gap-1">
          <button onClick={onMoveUp} disabled={index === 0} className="p-1 hover:bg-gray-700 rounded disabled:opacity-30"><ChevronUp className="h-3 w-3" /></button>
          <button onClick={onMoveDown} disabled={index === total - 1} className="p-1 hover:bg-gray-700 rounded disabled:opacity-30"><ChevronDown className="h-3 w-3" /></button>
          <button onClick={onRemove} className="p-1 hover:bg-red-900/30 text-gray-400 hover:text-red-400 rounded"><Trash2 className="h-3 w-3" /></button>
        </div>
      </div>

      <input
        value={question.label}
        onChange={(e) => onUpdate({ label: e.target.value })}
        placeholder="Texte de la question"
        className="w-full h-9 rounded-md border border-gray-600 bg-gray-800 px-3 text-sm text-gray-100"
      />

      {question.type === "echelle" && (
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div>
            <label className="text-[10px] text-gray-500 uppercase">Min</label>
            <input
              type="number"
              value={question.echelleMin ?? 0}
              onChange={(e) => onUpdate({ echelleMin: parseInt(e.target.value) || 0 })}
              className="w-full h-8 rounded-md border border-gray-600 bg-gray-800 px-2 text-xs text-gray-100"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase">Max</label>
            <input
              type="number"
              value={question.echelleMax ?? 10}
              onChange={(e) => onUpdate({ echelleMax: parseInt(e.target.value) || 10 })}
              className="w-full h-8 rounded-md border border-gray-600 bg-gray-800 px-2 text-xs text-gray-100"
            />
          </div>
          <input
            value={question.echelleLabelMin || ""}
            onChange={(e) => onUpdate({ echelleLabelMin: e.target.value })}
            placeholder="Label min (ex : Pas du tout)"
            className="h-8 rounded-md border border-gray-600 bg-gray-800 px-2 text-xs text-gray-100"
          />
          <input
            value={question.echelleLabelMax || ""}
            onChange={(e) => onUpdate({ echelleLabelMax: e.target.value })}
            placeholder="Label max (ex : Tout a fait)"
            className="h-8 rounded-md border border-gray-600 bg-gray-800 px-2 text-xs text-gray-100"
          />
        </div>
      )}

      {question.type === "choix" && (
        <div className="space-y-1.5 pt-1">
          {(question.options || []).map((opt, oi) => (
            <div key={oi} className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500 w-4">{String.fromCharCode(65 + oi)}</span>
              <input
                value={opt}
                onChange={(e) => onUpdateOption(oi, e.target.value)}
                placeholder={`Option ${oi + 1}`}
                className="flex-1 h-8 rounded-md border border-gray-600 bg-gray-800 px-2 text-xs text-gray-100"
              />
              <button onClick={() => onRemoveOption(oi)} className="p-1 hover:bg-red-900/30 text-gray-400 hover:text-red-400 rounded">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
          <button onClick={onAddOption} className="inline-flex items-center gap-1 text-xs text-red-400 hover:underline mt-1">
            <Plus className="h-3 w-3" /> Ajouter une option
          </button>
        </div>
      )}
    </div>
  );
}
