"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus, Pencil, Trash2, FileText, Copy, Eye, Send, Search, Sparkles,
  ThumbsUp, Clock, Target, GraduationCap, UserCheck, Briefcase, Landmark,
  CheckCircle2,
} from "lucide-react";

type Template = {
  id: string;
  nom: string;
  description: string | null;
  type: string;
  questions: string;
  createdAt: string;
  preset: boolean;
  icon: string | null;
  ordre: number;
};

const TYPE_LABELS: Record<string, string> = {
  satisfaction_chaud: "Satisfaction a chaud",
  satisfaction_froid: "Satisfaction a froid",
  acquis: "Evaluation des acquis",
  custom: "Personnalise",
};

const TYPE_COLORS: Record<string, string> = {
  satisfaction_chaud: "bg-emerald-900/30 text-emerald-400 border-emerald-700",
  satisfaction_froid: "bg-blue-900/30 text-blue-400 border-blue-700",
  acquis: "bg-amber-900/30 text-amber-400 border-amber-700",
  custom: "bg-gray-700 text-gray-300 border-gray-600",
};

const ICON_MAP: Record<string, React.ElementType> = {
  ThumbsUp, Clock, Target, GraduationCap, UserCheck, Briefcase, Landmark,
};

function getIcon(name: string | null) {
  if (!name || !ICON_MAP[name]) return FileText;
  return ICON_MAP[name];
}

export default function ModelesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [seedMsg, setSeedMsg] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/evaluation-templates");
    if (r.ok) setTemplates(await r.json());
    setLoading(false);
  }, []);

  // Seed automatique au premier chargement si aucun preset
  useEffect(() => {
    fetch("/api/evaluation-templates")
      .then((r) => r.ok ? r.json() : [])
      .then(async (d) => {
        const arr: Template[] = Array.isArray(d) ? d : [];
        const hasPresets = arr.some((t) => t.preset);
        if (!hasPresets) {
          await fetch("/api/evaluation-templates/seed", { method: "POST" });
        }
        await load();
      });
  }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce modele ? Cette action est irreversible.")) return;
    setDeleting(id);
    const res = await fetch(`/api/evaluation-templates/${id}`, { method: "DELETE" });
    if (res.ok) {
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } else {
      const d = await res.json().catch(() => ({}));
      alert(d.error || "Suppression impossible");
    }
    setDeleting(null);
  };

  const handleDuplicate = async (id: string) => {
    setDuplicating(id);
    const res = await fetch(`/api/evaluation-templates/${id}/dupliquer`, { method: "POST" });
    if (res.ok) {
      const copy = await res.json();
      router.push(`/evaluations/modeles/${copy.id}`);
    } else {
      alert("Erreur lors de la duplication");
      setDuplicating(null);
    }
  };

  const handleReseed = async () => {
    setSeedMsg("Rechargement...");
    const res = await fetch("/api/evaluation-templates/seed", { method: "POST" });
    if (res.ok) {
      setSeedMsg("Templates Qualiopi rechargees");
      await load();
      setTimeout(() => setSeedMsg(""), 3000);
    } else setSeedMsg("Erreur");
  };

  const filtered = templates.filter((t) => {
    if (typeFilter && t.type !== typeFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!t.nom.toLowerCase().includes(s) && !(t.description || "").toLowerCase().includes(s)) return false;
    }
    return true;
  });
  const presets = filtered.filter((t) => t.preset).sort((a, b) => a.ordre - b.ordre);
  const customs = filtered.filter((t) => !t.preset);

  if (loading) {
    return <div className="flex justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" /></div>;
  }

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-red-500" /> Modeles d&apos;evaluation
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Partez d&apos;un template Qualiopi preconstruit et adaptez-le a votre contexte.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReseed}
            className="inline-flex items-center gap-2 rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700"
            title="Remettre a jour les templates preconstruits"
          >
            <CheckCircle2 className="h-4 w-4" /> Recharger presets
          </button>
          <Link
            href="/evaluations/modeles/nouveau"
            className="inline-flex items-center gap-2 rounded-md bg-red-600 hover:bg-red-700 px-4 py-2 text-sm font-medium text-white"
          >
            <Plus className="h-4 w-4" /> Nouveau modele vierge
          </Link>
        </div>
      </div>

      {seedMsg && <div className="mb-4 text-xs text-emerald-400">{seedMsg}</div>}

      {/* Filtres */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un modele..."
            className="w-full h-10 rounded-md border border-gray-600 bg-gray-800 pl-9 pr-3 text-sm text-gray-200 focus:outline-none focus:border-red-500"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-10 rounded-md border border-gray-600 bg-gray-800 px-3 text-sm text-gray-200"
        >
          <option value="">Tous les types</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Templates Qualiopi preconstruits */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-lg font-semibold text-gray-100">Templates Qualiopi preconstruits</h2>
          <span className="inline-flex items-center rounded-full bg-red-900/30 text-red-400 border border-red-700 px-2 py-0.5 text-xs font-medium">
            Officiel
          </span>
          <span className="text-xs text-gray-500">{presets.length}</span>
        </div>
        {presets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-600 bg-gray-800/40 p-8 text-center">
            <p className="text-sm text-gray-400 mb-3">Aucun preset disponible</p>
            <button
              onClick={handleReseed}
              className="inline-flex items-center gap-2 rounded-md bg-red-600 hover:bg-red-700 px-4 py-2 text-sm font-medium text-white"
            >
              <CheckCircle2 className="h-4 w-4" /> Charger les presets Qualiopi
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {presets.map((t) => (
              <TemplateCard
                key={t.id}
                template={t}
                onDuplicate={() => handleDuplicate(t.id)}
                duplicating={duplicating === t.id}
              />
            ))}
          </div>
        )}
      </section>

      {/* Mes templates custom */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-lg font-semibold text-gray-100">Mes templates</h2>
          <span className="text-xs text-gray-500">{customs.length}</span>
        </div>
        {customs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-600 bg-gray-800/40 p-8 text-center">
            <FileText className="h-10 w-10 text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-400 mb-1">Aucun template personnalise</p>
            <p className="text-xs text-gray-500">Dupliquez un preset ou creez un modele vierge.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customs.map((t) => (
              <TemplateCard
                key={t.id}
                template={t}
                onDuplicate={() => handleDuplicate(t.id)}
                onDelete={() => handleDelete(t.id)}
                duplicating={duplicating === t.id}
                deleting={deleting === t.id}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function TemplateCard({
  template,
  onDuplicate,
  onDelete,
  duplicating,
  deleting,
}: {
  template: Template;
  onDuplicate: () => void;
  onDelete?: () => void;
  duplicating?: boolean;
  deleting?: boolean;
}) {
  let qCount = 0;
  let sectionCount = 0;
  try {
    const qs = JSON.parse(template.questions);
    if (Array.isArray(qs)) {
      sectionCount = qs.filter((q: { type: string }) => q.type === "section").length;
      qCount = qs.length - sectionCount;
    }
  } catch { /* empty */ }

  const Icon = getIcon(template.icon);
  const typeColor = TYPE_COLORS[template.type] || TYPE_COLORS.custom;

  return (
    <div className={`rounded-xl border ${template.preset ? "border-red-900/40 bg-gradient-to-br from-gray-800 to-gray-800/60" : "border-gray-700 bg-gray-800"} p-5 flex flex-col gap-3 hover:border-gray-500 transition-colors`}>
      <div className="flex items-start gap-3">
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${template.preset ? "bg-red-900/30" : "bg-gray-700"}`}>
          <Icon className={`h-5 w-5 ${template.preset ? "text-red-400" : "text-gray-400"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-100 line-clamp-1">{template.nom}</h3>
          {template.description && (
            <p className="text-xs text-gray-400 mt-1 line-clamp-2">{template.description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs">
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 font-medium ${typeColor}`}>
          {TYPE_LABELS[template.type] || template.type}
        </span>
        <span className="text-gray-500">
          {qCount} question{qCount !== 1 ? "s" : ""}
          {sectionCount > 0 && ` · ${sectionCount} section${sectionCount !== 1 ? "s" : ""}`}
        </span>
      </div>

      <div className="flex items-center gap-1 pt-2 border-t border-gray-700">
        <Link
          href={`/evaluations/modeles/${template.id}`}
          className="inline-flex items-center justify-center gap-1 rounded-md border border-gray-600 bg-gray-800 px-2.5 py-1.5 text-xs font-medium text-gray-300 hover:bg-gray-700"
          title={template.preset ? "Apercu" : "Modifier"}
        >
          {template.preset ? <Eye className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
          {template.preset ? "Apercu" : "Modifier"}
        </Link>
        <button
          onClick={onDuplicate}
          disabled={duplicating}
          className="inline-flex items-center justify-center gap-1 rounded-md border border-gray-600 bg-gray-800 px-2.5 py-1.5 text-xs font-medium text-gray-300 hover:bg-gray-700 disabled:opacity-50"
          title="Dupliquer"
        >
          <Copy className="h-3.5 w-3.5" />
          {duplicating ? "..." : "Dupliquer"}
        </button>
        <Link
          href={`/evaluations/modeles/${template.id}/utiliser`}
          className="flex-1 inline-flex items-center justify-center gap-1 rounded-md bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-red-700"
        >
          <Send className="h-3.5 w-3.5" /> Envoyer
        </Link>
        {onDelete && (
          <button
            onClick={onDelete}
            disabled={deleting}
            className="inline-flex items-center justify-center rounded-md border border-gray-700 p-1.5 text-gray-500 hover:text-red-400 hover:border-red-700 transition-colors disabled:opacity-50"
            title="Supprimer"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
