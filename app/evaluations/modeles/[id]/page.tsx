"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Copy, Send, Eye, Pencil, Info } from "lucide-react";
import TemplateBuilder, { Question } from "../TemplateBuilder";
import { QuestionRenderer, QuestionItem } from "@/components/shared/QuestionRenderer";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/fetcher";

type Template = {
  id: string;
  nom: string;
  description: string | null;
  type: string;
  questions: string;
  preset: boolean;
  icon: string | null;
};

const TYPE_LABELS: Record<string, string> = {
  satisfaction_chaud: "Satisfaction a chaud",
  satisfaction_froid: "Satisfaction a froid",
  acquis: "Evaluation des acquis",
  custom: "Personnalise",
};

export default function TemplatePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: template, isLoading } = useApi<Template>(
    id ? `/api/evaluation-templates/${id}` : null
  );
  const loading = isLoading;
  const [duplicating, setDuplicating] = useState(false);

  const questions = useMemo<Question[]>(() => {
    if (!template) return [];
    try { return JSON.parse(template.questions); } catch { return []; }
  }, [template]);

  const handleDuplicate = async () => {
    setDuplicating(true);
    try {
      const copy = await api.post<{ id: string }>(`/api/evaluation-templates/${id}/dupliquer`);
      if (copy?.id) {
        router.push(`/evaluations/modeles/${copy.id}`);
      } else {
        alert("Erreur lors de la duplication");
        setDuplicating(false);
      }
    } catch {
      alert("Erreur lors de la duplication");
      setDuplicating(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" /></div>;
  }

  if (!template) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-400">Template introuvable</p>
        <Link href="/evaluations/modeles" className="text-red-500 hover:underline text-sm mt-2 inline-block">Retour aux modeles</Link>
      </div>
    );
  }

  // Mode EDITION : custom template (non preset)
  if (!template.preset) {
    return (
      <TemplateBuilder
        templateId={id}
        initialNom={template.nom}
        initialDescription={template.description || ""}
        initialType={template.type}
        initialQuestions={questions}
      />
    );
  }

  // Mode APERCU : preset template (read-only)
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/evaluations/modeles" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-300 mb-4">
          <ArrowLeft className="h-4 w-4" /> Retour aux modeles
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center rounded-full bg-red-900/30 text-red-400 border border-red-700 px-2 py-0.5 text-xs font-medium">
                Template Qualiopi officiel
              </span>
              <span className="inline-flex items-center rounded-full bg-gray-700 text-gray-300 px-2 py-0.5 text-xs">
                {TYPE_LABELS[template.type] || template.type}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
              <Eye className="h-6 w-6 text-red-500" /> {template.nom}
            </h1>
            {template.description && (
              <p className="text-sm text-gray-400 mt-1 max-w-2xl">{template.description}</p>
            )}
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <button
              onClick={handleDuplicate}
              disabled={duplicating}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-red-600 hover:bg-red-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {duplicating ? "..." : <><Copy className="h-4 w-4" /> Dupliquer pour modifier</>}
            </button>
            <Link
              href={`/evaluations/modeles/${id}/utiliser`}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-600 bg-gray-800 hover:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-300"
            >
              <Send className="h-4 w-4" /> Envoyer ce questionnaire
            </Link>
          </div>
        </div>
      </div>

      <div className="rounded-md bg-blue-900/20 border border-blue-700 px-4 py-3 text-sm text-blue-300 flex items-start gap-2 mb-6">
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        <div>
          Ce template est <strong>officiel et non modifiable</strong>. Cliquez sur <strong>&quot;Dupliquer pour modifier&quot;</strong> pour en creer une copie personnalisable.
        </div>
      </div>

      {/* Apercu du formulaire */}
      <div className="bg-white rounded-xl border border-gray-700 p-6 md:p-8">
        <p className="text-xs uppercase tracking-wide text-gray-500 mb-4">Apercu du formulaire tel que vu par le destinataire</p>
        <div className="space-y-5">
          {questions.length === 0 ? (
            <p className="text-sm text-gray-500 italic">Aucune question dans ce template</p>
          ) : questions.map((q, i) => (
            <QuestionRenderer
              key={(q as { id: string }).id ?? i}
              question={q as QuestionItem}
              disabled
            />
          ))}
        </div>
      </div>
    </div>
  );
}
