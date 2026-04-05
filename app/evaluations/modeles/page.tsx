"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, FileText, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";

type Template = {
  id: string;
  nom: string;
  description: string | null;
  type: string;
  questions: string;
  createdAt: string;
};

const TYPE_LABELS: Record<string, string> = {
  satisfaction_chaud: "Satisfaction à chaud",
  satisfaction_froid: "Satisfaction à froid",
  acquis: "Évaluation des acquis",
  custom: "Personnalisé",
};

export default function ModelesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/evaluation-templates")
      .then((r) => r.json())
      .then((d) => { setTemplates(Array.isArray(d) ? d : []); setLoading(false); });
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce modèle ?")) return;
    setDeleting(id);
    await fetch(`/api/evaluation-templates/${id}`, { method: "DELETE" });
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    setDeleting(null);
  };

  if (loading) {
    return <div className="flex justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" /></div>;
  }

  return (
    <div>
      <PageHeader title="Modèles d'évaluation" description="Créez et gérez vos formulaires d'évaluation personnalisés" />

      <div className="flex justify-end mb-6">
        <Link
          href="/evaluations/modeles/nouveau"
          className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          Nouveau modèle
        </Link>
      </div>

      {templates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-600 bg-gray-800/40 p-12 text-center">
          <FileText className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 font-medium mb-2">Aucun modèle d&apos;évaluation</p>
          <p className="text-sm text-gray-500 mb-6">Créez votre premier formulaire personnalisé</p>
          <Link
            href="/evaluations/modeles/nouveau"
            className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            Créer un modèle
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((t) => {
            let qCount = 0;
            try { qCount = JSON.parse(t.questions).length; } catch { qCount = 0; }
            return (
              <div key={t.id} className="rounded-xl border border-gray-700 bg-gray-800 p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-100 truncate">{t.nom}</h3>
                    {t.description && <p className="text-sm text-gray-400 mt-1 line-clamp-2">{t.description}</p>}
                  </div>
                  <span className="shrink-0 text-xs px-2 py-1 rounded-full bg-gray-700 text-gray-300">
                    {TYPE_LABELS[t.type] || t.type}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <FileText className="h-3.5 w-3.5" />
                  {qCount} question{qCount !== 1 ? "s" : ""}
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-gray-700">
                  <Link
                    href={`/evaluations/modeles/${t.id}`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Modifier
                  </Link>
                  <Link
                    href={`/evaluations/modeles/${t.id}/utiliser`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md border border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-gray-700 transition-colors"
                  >
                    Utiliser
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                  <button
                    onClick={() => handleDelete(t.id)}
                    disabled={deleting === t.id}
                    className="inline-flex items-center justify-center rounded-md border border-gray-700 p-1.5 text-gray-500 hover:text-red-400 hover:border-red-700 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
