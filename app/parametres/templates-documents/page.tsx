"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Save, FileText, RotateCcw, Eye, Pencil, CheckCircle2, RefreshCw } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/fetcher";

type Variable = { nom: string; description: string };
type DocTemplate = {
  id: string;
  type: string;
  nom: string;
  description: string | null;
  titre: string;
  introduction: string | null;
  corps: string;
  mentions: string | null;
  variables: string;
  modifie: boolean;
  actif: boolean;
};

export default function TemplatesDocumentsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [previewVersion, setPreviewVersion] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Form state
  const [titre, setTitre] = useState("");
  const [introduction, setIntroduction] = useState("");
  const [corps, setCorps] = useState("");
  const [mentions, setMentions] = useState("");

  const { data: templatesData, isLoading: loading, mutate: mutateTemplates } = useApi<DocTemplate[]>(
    "/api/document-templates"
  );
  const templates: DocTemplate[] = Array.isArray(templatesData) ? templatesData : [];

  // Auto-select first template
  useEffect(() => {
    if (!selectedId && templates.length > 0) {
      setSelectedId(templates[0].id);
    }
  }, [selectedId, templates]);

  const selected = templates.find((t) => t.id === selectedId);
  const variables: Variable[] = useMemo(() => {
    if (!selected) return [];
    try { return JSON.parse(selected.variables); } catch { return []; }
  }, [selected]);

  useEffect(() => {
    if (selected) {
      setTitre(selected.titre);
      setIntroduction(selected.introduction || "");
      setCorps(selected.corps);
      setMentions(selected.mentions || "");
    }
  }, [selectedId, selected]);

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    setSaveMsg("");
    try {
      await api.put(`/api/document-templates/${selected.id}`, {
        nom: selected.nom,
        description: selected.description,
        titre,
        introduction,
        corps,
        mentions,
        actif: selected.actif,
      });
      setSaveMsg("Enregistre");
      await mutateTemplates();
      setPreviewVersion((v) => v + 1);
      setTimeout(() => setSaveMsg(""), 2500);
    } catch {
      setSaveMsg("Erreur");
    }
    setSaving(false);
  };

  const handleReset = async () => {
    if (!selected || !window.confirm("Reinitialiser ce template au defaut ? Vos modifications seront perdues.")) return;
    setSaving(true);
    try {
      const tpl = await api.post<DocTemplate>(`/api/document-templates/${selected.id}`, { action: "reset" });
      setTitre(tpl.titre);
      setIntroduction(tpl.introduction || "");
      setCorps(tpl.corps);
      setMentions(tpl.mentions || "");
      setSaveMsg("Reinitialise");
      await mutateTemplates();
      setPreviewVersion((v) => v + 1);
      setTimeout(() => setSaveMsg(""), 2500);
    } catch {
      setSaveMsg("Erreur");
    }
    setSaving(false);
  };

  const insertVariable = (target: "intro" | "corps" | "mentions" | "titre", v: string) => {
    const tag = `{{${v}}}`;
    if (target === "intro") setIntroduction((prev) => prev + " " + tag);
    else if (target === "corps") setCorps((prev) => prev + " " + tag);
    else if (target === "mentions") setMentions((prev) => prev + " " + tag);
    else setTitre((prev) => prev + " " + tag);
  };

  // Refresh iframe preview when entering preview tab
  useEffect(() => {
    if (tab === "preview" && iframeRef.current && selected) {
      iframeRef.current.src = `/api/pdf/template-preview/${selected.type}?v=${previewVersion}`;
    }
  }, [tab, selected, previewVersion]);

  if (loading) {
    return <div className="p-6 flex items-center justify-center py-24"><div className="h-6 w-6 animate-spin rounded-full border-2 border-red-600 border-t-transparent" /></div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <Link href="/parametres" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-300 mb-4">
          <ArrowLeft className="h-4 w-4" /> Retour Parametres
        </Link>
        <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
          <FileText className="h-6 w-6 text-red-500" /> Modeles de documents PDF
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Personnalisez les textes des documents generes (convocation, convention, attestation, etc.).
          Le logo et les couleurs sont repris automatiquement des parametres entreprise.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Liste templates */}
        <div className="lg:col-span-1 space-y-2">
          <p className="text-xs uppercase text-gray-500 font-semibold mb-2">Documents</p>
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedId(t.id)}
              className={`w-full text-left px-3 py-2.5 rounded-md border text-sm transition-colors ${
                selectedId === t.id
                  ? "bg-red-900/20 border-red-700 text-red-300"
                  : "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium">{t.nom}</span>
                {t.modifie && <span title="Modifie"><Pencil className="h-3 w-3 text-amber-400 shrink-0" /></span>}
              </div>
              {t.description && <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">{t.description}</p>}
            </button>
          ))}
        </div>

        {/* Editeur */}
        {selected && (
          <div className="lg:col-span-3 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-100">{selected.nom}</h2>
                {selected.description && <p className="text-xs text-gray-400">{selected.description}</p>}
              </div>
              <div className="flex items-center gap-2">
                {saveMsg && <span className={`text-xs ${saveMsg.includes("Erreur") ? "text-red-400" : "text-emerald-400"}`}>
                  {saveMsg === "Enregistre" ? <CheckCircle2 className="h-3 w-3 inline mr-1" /> : null}{saveMsg}
                </span>}
                <button
                  onClick={handleReset}
                  disabled={saving || !selected.modifie}
                  className="inline-flex items-center gap-1 rounded-md border border-gray-600 bg-gray-800 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700 disabled:opacity-40"
                  title={selected.modifie ? "Reinitialiser au defaut" : "Template deja au defaut"}
                >
                  <RotateCcw className="h-3 w-3" /> Reinitialiser
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-md bg-red-600 hover:bg-red-700 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                >
                  <Save className="h-4 w-4" /> Enregistrer
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-gray-700">
              <button
                onClick={() => setTab("edit")}
                className={`flex items-center gap-1.5 px-4 pb-2 pt-1 text-sm font-medium border-b-2 transition-colors ${
                  tab === "edit" ? "border-red-600 text-red-500" : "border-transparent text-gray-400 hover:text-gray-300"
                }`}
              >
                <Pencil className="h-4 w-4" /> Edition
              </button>
              <button
                onClick={() => setTab("preview")}
                className={`flex items-center gap-1.5 px-4 pb-2 pt-1 text-sm font-medium border-b-2 transition-colors ${
                  tab === "preview" ? "border-red-600 text-red-500" : "border-transparent text-gray-400 hover:text-gray-300"
                }`}
              >
                <Eye className="h-4 w-4" /> Apercu PDF
              </button>
              {tab === "preview" && (
                <button
                  onClick={() => setPreviewVersion((v) => v + 1)}
                  className="ml-auto text-xs text-gray-400 hover:text-gray-200 inline-flex items-center gap-1 px-2"
                >
                  <RefreshCw className="h-3 w-3" /> Recharger
                </button>
              )}
            </div>

            {tab === "edit" ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-3 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Titre du document</label>
                    <input
                      value={titre}
                      onChange={(e) => setTitre(e.target.value)}
                      className="w-full h-10 rounded-md border border-gray-600 bg-gray-900 px-3 text-sm text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Introduction</label>
                    <textarea
                      value={introduction}
                      onChange={(e) => setIntroduction(e.target.value)}
                      rows={4}
                      className="w-full rounded-md border border-gray-600 bg-gray-900 px-3 py-2 text-xs text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Corps du document</label>
                    <textarea
                      value={corps}
                      onChange={(e) => setCorps(e.target.value)}
                      rows={12}
                      className="w-full rounded-md border border-gray-600 bg-gray-900 px-3 py-2 text-xs text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Mentions legales / pied de page</label>
                    <textarea
                      value={mentions}
                      onChange={(e) => setMentions(e.target.value)}
                      rows={4}
                      className="w-full rounded-md border border-gray-600 bg-gray-900 px-3 py-2 text-xs text-gray-100"
                    />
                  </div>
                  <p className="text-[10px] text-gray-500">
                    Les variables <code className="bg-gray-800 px-1 rounded">{"{{xxx}}"}</code> sont remplacees a la generation.
                    Les sauts de ligne (Entree) sont preserves.
                  </p>
                </div>

                <div className="md:col-span-1">
                  <p className="text-xs font-semibold text-gray-300 mb-2 uppercase">Variables</p>
                  <div className="space-y-1.5">
                    {variables.length === 0 ? (
                      <p className="text-xs text-gray-500 italic">Aucune variable</p>
                    ) : variables.map((v) => (
                      <div
                        key={v.nom}
                        className="rounded-md border border-gray-700 bg-gray-800 p-2"
                      >
                        <code className="text-[10px] text-red-400 block mb-1">{"{{"}{v.nom}{"}}"}</code>
                        <p className="text-[10px] text-gray-500 mb-1.5">{v.description}</p>
                        <div className="flex gap-1 flex-wrap">
                          <button onClick={() => insertVariable("titre", v.nom)} className="text-[9px] px-1.5 py-0.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300">Titre</button>
                          <button onClick={() => insertVariable("intro", v.nom)} className="text-[9px] px-1.5 py-0.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300">Intro</button>
                          <button onClick={() => insertVariable("corps", v.nom)} className="text-[9px] px-1.5 py-0.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300">Corps</button>
                          <button onClick={() => insertVariable("mentions", v.nom)} className="text-[9px] px-1.5 py-0.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300">Mentions</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="rounded-md bg-gray-800 border border-gray-700 p-2">
                  <iframe
                    ref={iframeRef}
                    title="Apercu PDF"
                    className="w-full rounded bg-white"
                    style={{ height: "800px" }}
                  />
                </div>
                <p className="text-[10px] text-gray-500 italic text-center">
                  Apercu avec des donnees fictives. Enregistrez pour rafraichir l&apos;apercu.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
