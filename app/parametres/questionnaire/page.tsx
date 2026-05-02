"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Save, Plus, Trash2, GripVertical, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useApi, useApiMutation } from "@/hooks/useApi";

type Question = { key: string; label: string };
type Section = { id: string; titre: string; questions: Question[] };

function genKey() {
  return "q_" + Math.random().toString(36).slice(2, 8);
}

function genId() {
  return "s_" + Math.random().toString(36).slice(2, 8);
}

function SectionEditor({
  section,
  onChange,
  onDelete,
}: {
  section: Section;
  onChange: (s: Section) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(true);

  const updateQuestion = (i: number, field: keyof Question, val: string) => {
    const questions = section.questions.map((q, idx) =>
      idx === i ? { ...q, [field]: val } : q
    );
    onChange({ ...section, questions });
  };

  const addQuestion = () => {
    onChange({ ...section, questions: [...section.questions, { key: genKey(), label: "" }] });
  };

  const removeQuestion = (i: number) => {
    onChange({ ...section, questions: section.questions.filter((_, idx) => idx !== i) });
  };

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-750 border-b border-gray-700">
        <GripVertical className="h-4 w-4 text-gray-500 flex-shrink-0" />
        <input
          value={section.titre}
          onChange={(e) => onChange({ ...section, titre: e.target.value })}
          className="flex-1 bg-transparent text-gray-100 font-semibold text-sm focus:outline-none placeholder:text-gray-500"
          placeholder="Titre de la section"
        />
        <button onClick={() => setOpen(!open)} className="text-gray-400 hover:text-gray-200 transition-colors">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <button onClick={onDelete} className="text-gray-500 hover:text-red-400 transition-colors ml-1">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {open && (
        <div className="p-4 space-y-2">
          {section.questions.map((q, i) => (
            <div key={q.key} className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-gray-600 flex-shrink-0" />
              <input
                value={q.label}
                onChange={(e) => updateQuestion(i, "label", e.target.value)}
                placeholder="Texte de la question"
                className="flex-1 rounded-md border border-gray-600 bg-gray-700 text-gray-100 text-sm px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-red-500 placeholder:text-gray-500"
              />
              <button onClick={() => removeQuestion(i)} className="text-gray-500 hover:text-red-400 transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <button
            onClick={addQuestion}
            className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors mt-2"
          >
            <Plus className="h-3.5 w-3.5" /> Ajouter une question
          </button>
        </div>
      )}
    </div>
  );
}

function QuestionnairEditor({
  label,
  sections,
  onChange,
}: {
  label: string;
  sections: Section[];
  onChange: (s: Section[]) => void;
}) {
  const addSection = () => {
    onChange([...sections, { id: genId(), titre: "Nouvelle section", questions: [] }]);
  };

  const updateSection = (i: number, s: Section) => {
    onChange(sections.map((sec, idx) => (idx === i ? s : sec)));
  };

  const deleteSection = (i: number) => {
    onChange(sections.filter((_, idx) => idx !== i));
  };

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-gray-100">{label}</h2>
      {sections.length === 0 && (
        <p className="text-sm text-gray-500 italic">Aucune section — ajoutez-en une ci-dessous.</p>
      )}
      {sections.map((section, i) => (
        <SectionEditor
          key={section.id}
          section={section}
          onChange={(s) => updateSection(i, s)}
          onDelete={() => deleteSection(i)}
        />
      ))}
      <button
        onClick={addSection}
        className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors border border-dashed border-gray-600 rounded-lg px-4 py-2 w-full justify-center hover:border-red-600"
      >
        <Plus className="h-4 w-4" /> Ajouter une section
      </button>
    </div>
  );
}

type QuestionnaireData = { chaud?: Section[]; froid?: Section[] };

export default function QuestionnaireConfigPage() {
  const [chaud, setChaud] = useState<Section[]>([]);
  const [froid, setFroid] = useState<Section[]>([]);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<"chaud" | "froid">("chaud");

  const { data: questionnaireData, isLoading: loading } = useApi<QuestionnaireData>(
    "/api/parametres/questionnaire"
  );
  const { trigger: saveQuestionnaire, isMutating: saving } = useApiMutation<{ chaud: Section[]; froid: Section[] }>(
    "/api/parametres/questionnaire",
    "PUT"
  );

  useEffect(() => {
    if (!questionnaireData) return;
    setChaud(questionnaireData.chaud || []);
    setFroid(questionnaireData.froid || []);
  }, [questionnaireData]);

  const handleSave = async () => {
    setSaved(false);
    try {
      await saveQuestionnaire({ chaud, froid });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // ignore
    }
  };

  if (loading) {
    return <div className="flex justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" /></div>;
  }

  const totalChaud = chaud.reduce((s, sec) => s + sec.questions.length, 0);
  const totalFroid = froid.reduce((s, sec) => s + sec.questions.length, 0);

  return (
    <div className="max-w-3xl space-y-6">
      {/* Bandeau deprecation */}
      <div className="rounded-md bg-amber-900/20 border border-amber-700 px-4 py-3 text-sm text-amber-300 flex items-start gap-3">
        <svg className="h-5 w-5 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
        <div className="flex-1">
          <p className="font-medium">Cette page est en cours de remplacement.</p>
          <p className="text-xs mt-1 opacity-90">
            Les nouvelles evaluations utilisent les <strong>templates Qualiopi preconstruits</strong> (modifiables a la demande), plus complets et plus flexibles.
          </p>
          <a href="/evaluations/modeles" className="inline-flex items-center gap-1 mt-2 text-amber-200 hover:text-amber-100 underline text-xs font-medium">
            Voir les templates
          </a>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <PageHeader
          title="Questionnaire d'évaluation (ancien systeme)"
          description="Utilise uniquement pour les evaluations deja envoyees. Les nouvelles evaluations passent par les templates."
        />
        <div className="flex items-center gap-3">
          {saved && (
            <span className="flex items-center gap-1 text-sm text-green-500">
              <CheckCircle className="h-4 w-4" /> Enregistré
            </span>
          )}
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 border-b border-gray-700">
        <button
          onClick={() => setActiveTab("chaud")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "chaud"
              ? "border-red-500 text-red-400"
              : "border-transparent text-gray-400 hover:text-gray-200"
          }`}
        >
          🔥 Satisfaction à chaud
          <span className="ml-2 text-xs text-gray-500">({chaud.length} section{chaud.length !== 1 ? "s" : ""} · {totalChaud} question{totalChaud !== 1 ? "s" : ""})</span>
        </button>
        <button
          onClick={() => setActiveTab("froid")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "froid"
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-gray-400 hover:text-gray-200"
          }`}
        >
          ❄️ Satisfaction à froid
          <span className="ml-2 text-xs text-gray-500">({froid.length} section{froid.length !== 1 ? "s" : ""} · {totalFroid} question{totalFroid !== 1 ? "s" : ""})</span>
        </button>
      </div>

      <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
        <p className="text-xs text-gray-400">
          Chaque question est notée de <strong className="text-gray-300">1 à 5 étoiles</strong> par le stagiaire.
          Les sections s'affichent dans l'ordre défini ici. Une dernière étape de commentaire libre est toujours ajoutée automatiquement.
        </p>
      </div>

      {activeTab === "chaud" ? (
        <QuestionnairEditor label="Questions — Satisfaction à chaud" sections={chaud} onChange={setChaud} />
      ) : (
        <QuestionnairEditor label="Questions — Satisfaction à froid" sections={froid} onChange={setFroid} />
      )}
    </div>
  );
}
