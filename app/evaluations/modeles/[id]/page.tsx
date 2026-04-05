"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import TemplateBuilder, { Question } from "../TemplateBuilder";

export default function EditModelePage() {
  const params = useParams();
  const id = params.id as string;
  const [template, setTemplate] = useState<{
    nom: string;
    description: string | null;
    type: string;
    questions: Question[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/evaluation-templates/${id}`)
      .then((r) => r.json())
      .then((d) => {
        let questions: Question[] = [];
        try { questions = JSON.parse(d.questions); } catch { questions = []; }
        setTemplate({ nom: d.nom, description: d.description, type: d.type, questions });
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return <div className="flex justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" /></div>;
  }

  if (!template) return null;

  return (
    <TemplateBuilder
      templateId={id}
      initialNom={template.nom}
      initialDescription={template.description || ""}
      initialType={template.type}
      initialQuestions={template.questions}
    />
  );
}
