"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import {
  ArrowLeft, FolderOpen, Plus, Trash2, FileText, Eye, EyeOff,
  Users, GraduationCap, Lock, ExternalLink,
} from "lucide-react";

interface DocumentItem {
  id: string;
  nom: string;
  type: string;
  chemin: string;
  description: string | null;
  taille: number | null;
  visibleClient: boolean;
  visibleFormateur: boolean;
  createdAt: string;
}

interface DocsResponse {
  projet: { id: string; nom: string };
  documents: DocumentItem[];
  groupedByType: Record<string, DocumentItem[]>;
  stats: { total: number; visibleClient: number; visibleFormateur: number; interneSeul: number };
}

const fetcher = (u: string) => fetch(u).then((r) => {
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json() as Promise<DocsResponse>;
});

// Catégories métier — ordre = priorité d'affichage (les plus utilisées en haut).
const TYPE_LABELS: Record<string, string> = {
  contrat: "Contrats",
  livrable: "Livrables",
  brief: "Briefs et cahiers des charges",
  convention: "Conventions",
  rapport: "Rapports",
  feuille_presence: "Feuilles de présence",
  convocation: "Convocations",
  attestation: "Attestations",
  autre: "Autres documents",
};

const TYPE_ORDER = Object.keys(TYPE_LABELS);

function fmtBytes(n: number | null): string {
  if (n == null) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} Ko`;
  return `${(n / 1024 / 1024).toFixed(1)} Mo`;
}

function AudienceBadge({ doc }: { doc: DocumentItem }) {
  if (doc.visibleClient && doc.visibleFormateur) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] bg-purple-500/15 text-purple-300 px-1.5 py-0.5 rounded">
        <Eye className="h-3 w-3" /> Client + Formateur
      </span>
    );
  }
  if (doc.visibleClient) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/15 text-emerald-300 px-1.5 py-0.5 rounded">
        <Users className="h-3 w-3" /> Client
      </span>
    );
  }
  if (doc.visibleFormateur) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] bg-blue-500/15 text-blue-300 px-1.5 py-0.5 rounded">
        <GraduationCap className="h-3 w-3" /> Formateur
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] bg-gray-500/15 text-gray-400 px-1.5 py-0.5 rounded">
      <Lock className="h-3 w-3" /> Interne
    </span>
  );
}

export default function ProjetDocumentsPage() {
  const { id } = useParams<{ id: string }>();
  const { data, error, isLoading, mutate } = useSWR(`/api/projets/${id}/documents`, fetcher);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    nom: "",
    type: "livrable",
    chemin: "",
    description: "",
    visibleClient: false,
    visibleFormateur: false,
  });
  const [saving, setSaving] = useState(false);

  const create = async () => {
    if (!form.nom.trim() || !form.chemin.trim()) return;
    setSaving(true);
    await fetch(`/api/projets/${id}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nom: form.nom.trim(),
        type: form.type,
        chemin: form.chemin.trim(),
        description: form.description.trim() || null,
        visibleClient: form.visibleClient,
        visibleFormateur: form.visibleFormateur,
      }),
    });
    setForm({ nom: "", type: "livrable", chemin: "", description: "", visibleClient: false, visibleFormateur: false });
    setOpen(false);
    setSaving(false);
    mutate();
  };

  const updateVisibility = async (
    docId: string,
    patch: { visibleClient?: boolean; visibleFormateur?: boolean },
  ) => {
    await fetch(`/api/projets/${id}/documents/${docId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    mutate();
  };

  const deleteDoc = async (docId: string) => {
    if (!confirm("Supprimer ce document ?")) return;
    await fetch(`/api/projets/${id}/documents/${docId}`, { method: "DELETE" });
    mutate();
  };

  if (isLoading) return <p className="container mx-auto p-6 text-gray-500">Chargement…</p>;
  if (error) return <p className="container mx-auto p-6 text-red-700">Erreur de chargement</p>;
  if (!data) return null;

  const { projet, groupedByType, stats } = data;

  // Ordre d'affichage : TYPE_ORDER d'abord, puis les types inconnus à la fin.
  const orderedTypes = [
    ...TYPE_ORDER.filter((t) => groupedByType[t]?.length),
    ...Object.keys(groupedByType).filter((t) => !TYPE_ORDER.includes(t)),
  ];

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <Link href={`/projets/${id}`} className="inline-flex items-center gap-1 text-sm text-gray-400 mb-4">
        <ArrowLeft className="h-4 w-4" /> Retour au projet
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">{projet.nom}</h1>
          <p className="text-sm text-gray-400 mt-0.5 flex items-center gap-2">
            <FolderOpen className="h-4 w-4" /> Documents du projet
          </p>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
        >
          {open ? "Annuler" : "+ Ajouter un document"}
        </button>
      </div>

      {/* Stats résumé visibilité */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-3">
          <p className="text-xs text-gray-400">Total</p>
          <p className="text-2xl font-bold text-gray-100">{stats.total}</p>
        </div>
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
          <p className="text-xs text-emerald-300 flex items-center gap-1"><Users className="h-3 w-3" /> Client</p>
          <p className="text-2xl font-bold text-gray-100">{stats.visibleClient}</p>
        </div>
        <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3">
          <p className="text-xs text-blue-300 flex items-center gap-1"><GraduationCap className="h-3 w-3" /> Formateur</p>
          <p className="text-2xl font-bold text-gray-100">{stats.visibleFormateur}</p>
        </div>
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-3">
          <p className="text-xs text-gray-400 flex items-center gap-1"><Lock className="h-3 w-3" /> Interne</p>
          <p className="text-2xl font-bold text-gray-100">{stats.interneSeul}</p>
        </div>
      </div>

      {/* Form création */}
      {open && (
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 mb-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              value={form.nom}
              onChange={(e) => setForm((p) => ({ ...p, nom: e.target.value }))}
              placeholder="Nom du document"
              className="p-2 bg-gray-800 border border-gray-700 rounded text-sm"
            />
            <select
              value={form.type}
              onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
              className="p-2 bg-gray-800 border border-gray-700 rounded text-sm"
            >
              {TYPE_ORDER.map((t) => (
                <option key={t} value={t}>{TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>
          <input
            type="text"
            value={form.chemin}
            onChange={(e) => setForm((p) => ({ ...p, chemin: e.target.value }))}
            placeholder="URL ou chemin du fichier (ex: https://...) — l'upload Supabase Storage viendra dans une PR suivante"
            className="w-full p-2 bg-gray-800 border border-gray-700 rounded text-sm"
          />
          <textarea
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            placeholder="Description (optionnel)"
            rows={2}
            className="w-full p-2 bg-gray-800 border border-gray-700 rounded text-sm"
          />
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-400">Visibilité :</span>
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={form.visibleClient}
                onChange={(e) => setForm((p) => ({ ...p, visibleClient: e.target.checked }))}
              />
              <Users className="h-3.5 w-3.5 text-emerald-400" /> Client
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={form.visibleFormateur}
                onChange={(e) => setForm((p) => ({ ...p, visibleFormateur: e.target.checked }))}
              />
              <GraduationCap className="h-3.5 w-3.5 text-blue-400" /> Formateur(s)
            </label>
            <button
              onClick={create}
              disabled={saving || !form.nom.trim() || !form.chemin.trim()}
              className="ml-auto px-3 py-1 bg-emerald-600 text-white text-xs rounded disabled:opacity-50"
            >
              {saving ? "Création…" : "Créer"}
            </button>
          </div>
        </div>
      )}

      {stats.total === 0 ? (
        <div className="text-center py-12 border border-dashed border-gray-700 rounded-xl">
          <FolderOpen className="h-10 w-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">Aucun document pour ce projet.</p>
          <button
            onClick={() => setOpen(true)}
            className="mt-3 text-xs px-3 py-1.5 rounded-md bg-blue-600 text-white"
          >
            Ajouter le premier document
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {orderedTypes.map((typeKey) => {
            const docs = groupedByType[typeKey];
            if (!docs || docs.length === 0) return null;
            return (
              <section key={typeKey}>
                <h2 className="text-xs font-semibold text-gray-300 uppercase tracking-wide mb-2 flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5" />
                  {TYPE_LABELS[typeKey] ?? typeKey}
                  <span className="text-gray-500 font-normal">({docs.length})</span>
                </h2>
                <ul className="space-y-2">
                  {docs.map((doc) => (
                    <li
                      key={doc.id}
                      className="rounded-xl border border-gray-700 bg-gray-800 p-3 flex items-start gap-3 group"
                    >
                      <FileText className="h-5 w-5 text-gray-500 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <a
                            href={doc.chemin}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-gray-100 hover:text-blue-400 inline-flex items-center gap-1"
                          >
                            {doc.nom}
                            <ExternalLink className="h-3 w-3 opacity-50" />
                          </a>
                          <AudienceBadge doc={doc} />
                        </div>
                        {doc.description && (
                          <p className="text-xs text-gray-400 mt-0.5">{doc.description}</p>
                        )}
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          {fmtBytes(doc.taille)} · ajouté le{" "}
                          {new Date(doc.createdAt).toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100">
                        {/* Toggles visibilité */}
                        <button
                          onClick={() => updateVisibility(doc.id, { visibleClient: !doc.visibleClient })}
                          className={`text-[10px] px-1.5 py-1 rounded inline-flex items-center gap-1 ${
                            doc.visibleClient
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-gray-700 text-gray-400"
                          }`}
                          title={doc.visibleClient ? "Visible client — cliquer pour cacher" : "Caché du client — cliquer pour montrer"}
                        >
                          {doc.visibleClient ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                          <Users className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => updateVisibility(doc.id, { visibleFormateur: !doc.visibleFormateur })}
                          className={`text-[10px] px-1.5 py-1 rounded inline-flex items-center gap-1 ${
                            doc.visibleFormateur
                              ? "bg-blue-500/20 text-blue-300"
                              : "bg-gray-700 text-gray-400"
                          }`}
                          title={doc.visibleFormateur ? "Visible formateur — cliquer pour cacher" : "Caché du formateur — cliquer pour montrer"}
                        >
                          {doc.visibleFormateur ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                          <GraduationCap className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => deleteDoc(doc.id)}
                          className="text-gray-500 hover:text-red-400 p-1"
                          title="Supprimer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
