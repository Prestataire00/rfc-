"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus, Pencil, Trash2, FileText, Copy, Eye, Send, Search,
  ThumbsUp, Clock, Target, GraduationCap, UserCheck, Briefcase, Landmark,
  CheckCircle2, Flame, Snowflake,
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
  satisfaction_chaud: "A chaud",
  satisfaction_froid: "A froid",
  acquis: "Acquis",
  custom: "Personnalise",
};

const TYPE_ICONS: Record<string, React.ElementType> = {
  satisfaction_chaud: Flame,
  satisfaction_froid: Snowflake,
  acquis: GraduationCap,
  custom: FileText,
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

  useEffect(() => {
    fetch("/api/evaluation-templates")
      .then((r) => r.ok ? r.json() : [])
      .then(async (d) => {
        const arr: Template[] = Array.isArray(d) ? d : [];
        if (!arr.some((t) => t.preset)) {
          await fetch("/api/evaluation-templates/seed", { method: "POST" });
        }
        await load();
      });
  }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce modele ?")) return;
    setDeleting(id);
    const res = await fetch(`/api/evaluation-templates/${id}`, { method: "DELETE" });
    if (res.ok) setTemplates((prev) => prev.filter((t) => t.id !== id));
    setDeleting(null);
  };

  const handleDuplicate = async (id: string) => {
    setDuplicating(id);
    const res = await fetch(`/api/evaluation-templates/${id}/dupliquer`, { method: "POST" });
    if (res.ok) {
      const copy = await res.json();
      router.push(`/evaluations/modeles/${copy.id}`);
    }
    setDuplicating(null);
  };

  const handleReseed = async () => {
    setSeedMsg("...");
    await fetch("/api/evaluation-templates/seed", { method: "POST" });
    await load();
    setSeedMsg("OK");
    setTimeout(() => setSeedMsg(""), 2000);
  };

  const filtered = templates.filter((t) => {
    if (typeFilter && t.type !== typeFilter) return false;
    if (search && !t.nom.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const presets = filtered.filter((t) => t.preset).sort((a, b) => a.ordre - b.ordre);
  const customs = filtered.filter((t) => !t.preset);

  if (loading) {
    return <div className="flex justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" /></div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Modeles de questionnaires</h1>
          <p className="text-sm text-gray-400 mt-0.5">{templates.length} modele{templates.length > 1 ? "s" : ""} disponible{templates.length > 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleReseed} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-xs text-gray-300 hover:bg-gray-700">
            <CheckCircle2 className="h-3.5 w-3.5" /> {seedMsg || "Recharger"}
          </button>
          <Link href="/evaluations/modeles/nouveau" className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 px-4 py-2 text-sm font-medium text-white">
            <Plus className="h-4 w-4" /> Nouveau
          </Link>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex gap-1 bg-gray-900 rounded-lg p-1 border border-gray-700">
          {[{ value: "", label: "Tous" }, ...Object.entries(TYPE_LABELS).map(([k, v]) => ({ value: k, label: v }))].map((tab) => {
            const active = typeFilter === tab.value;
            const Icon = TYPE_ICONS[tab.value] || FileText;
            return (
              <button key={tab.value} onClick={() => setTypeFilter(tab.value)} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${active ? "bg-red-600 text-white" : "text-gray-400 hover:text-gray-200 hover:bg-gray-700/50"}`}>
                <Icon className="h-3.5 w-3.5" /> {tab.label}
              </button>
            );
          })}
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher..." className="w-full h-9 rounded-lg border border-gray-700 bg-gray-800 pl-9 pr-3 text-sm text-gray-200" />
        </div>
      </div>

      {/* Presets Qualiopi */}
      {presets.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs uppercase font-semibold text-gray-500 tracking-wider mb-3">Templates Qualiopi</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {presets.map((t) => (
              <TemplateCard key={t.id} template={t} onDuplicate={() => handleDuplicate(t.id)} duplicating={duplicating === t.id} />
            ))}
          </div>
        </section>
      )}

      {/* Mes modeles */}
      <section>
        <h2 className="text-xs uppercase font-semibold text-gray-500 tracking-wider mb-3">Mes modeles</h2>
        {customs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-700 p-10 text-center">
            <FileText className="h-8 w-8 text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Dupliquez un preset ou creez un modele vierge</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {customs.map((t) => (
              <TemplateCard key={t.id} template={t} onDuplicate={() => handleDuplicate(t.id)} onDelete={() => handleDelete(t.id)} duplicating={duplicating === t.id} deleting={deleting === t.id} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function TemplateCard({ template, onDuplicate, onDelete, duplicating, deleting }: {
  template: Template; onDuplicate: () => void; onDelete?: () => void; duplicating?: boolean; deleting?: boolean;
}) {
  let qCount = 0;
  try { const qs = JSON.parse(template.questions); if (Array.isArray(qs)) qCount = qs.filter((q: { type: string }) => q.type !== "section").length; } catch { /* */ }

  const Icon = getIcon(template.icon);
  const TypeIcon = TYPE_ICONS[template.type] || FileText;

  return (
    <div className="group rounded-xl border border-gray-700 bg-gray-800 hover:border-gray-600 transition-all">
      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="h-9 w-9 rounded-lg bg-gray-900 flex items-center justify-center shrink-0">
            <Icon className="h-4.5 w-4.5 text-gray-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-100 text-sm line-clamp-1">{template.nom}</h3>
            {template.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{template.description}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1 text-gray-400">
            <TypeIcon className="h-3 w-3" /> {TYPE_LABELS[template.type] || template.type}
          </span>
          <span className="text-gray-600">·</span>
          <span className="text-gray-500">{qCount} question{qCount > 1 ? "s" : ""}</span>
          {template.preset && (
            <>
              <span className="text-gray-600">·</span>
              <span className="text-red-400 font-medium">Officiel</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center border-t border-gray-700/50 divide-x divide-gray-700/50">
        <Link href={`/evaluations/modeles/${template.id}`} className="flex-1 inline-flex items-center justify-center gap-1 py-2.5 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 transition-colors">
          {template.preset ? <Eye className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
          {template.preset ? "Voir" : "Editer"}
        </Link>
        <button onClick={onDuplicate} disabled={duplicating} className="flex-1 inline-flex items-center justify-center gap-1 py-2.5 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 transition-colors disabled:opacity-50">
          <Copy className="h-3.5 w-3.5" /> Dupliquer
        </button>
        <Link href={`/evaluations/modeles/${template.id}/utiliser`} className="flex-1 inline-flex items-center justify-center gap-1 py-2.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20 transition-colors font-medium">
          <Send className="h-3.5 w-3.5" /> Envoyer
        </Link>
        {onDelete && (
          <button onClick={onDelete} disabled={deleting} className="px-3 inline-flex items-center justify-center py-2.5 text-xs text-gray-500 hover:text-red-400 hover:bg-red-900/20 transition-colors disabled:opacity-50">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
