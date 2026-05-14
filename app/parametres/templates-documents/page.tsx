"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft, Save, FileText, RotateCcw, Eye, Pencil, CheckCircle2,
  RefreshCw, Sparkles, Plus, X, Loader2, Upload,
} from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { api, ApiError } from "@/lib/fetcher";

type Variable = { nom: string; description: string };

// Mapping clés UI → structure attendue par /api/pdf/template-preview/[type]?vars=
// Les clés "non standards" (variables custom du template) sont mises dans `custom`.
const STD_PATHS: Record<string, [string, string]> = {
  "stagiaire.prenom": ["stagiaire", "prenom"],
  "stagiaire.nom": ["stagiaire", "nom"],
  "stagiaire.email": ["stagiaire", "email"],
  "formation.titre": ["formation", "titre"],
  "formation.duree": ["formation", "duree"],
  "formation.objectifs": ["formation", "objectifs"],
  "session.dateDebut": ["session", "dateDebut"],
  "session.dateFin": ["session", "dateFin"],
  "session.lieu": ["session", "lieu"],
  "entreprise.nom": ["entreprise", "nom"],
  "entreprise.adresse": ["entreprise", "adresse"],
  "entreprise.codePostal": ["entreprise", "codePostal"],
  "entreprise.ville": ["entreprise", "ville"],
  "entreprise.siret": ["entreprise", "siret"],
  "formateur.prenom": ["formateur", "prenom"],
  "formateur.nom": ["formateur", "nom"],
};

function buildVarsFromCustom(custom: Record<string, string>): Record<string, unknown> {
  const out: Record<string, Record<string, unknown>> = {};
  const customVars: Record<string, string> = {};
  for (const [key, value] of Object.entries(custom)) {
    if (!value || !value.trim()) continue;
    const path = STD_PATHS[key];
    if (path) {
      const [group, field] = path;
      if (!out[group]) out[group] = {};
      out[group][field] = field === "duree" ? Number(value) || value : value;
    } else {
      customVars[key] = value;
    }
  }
  if (Object.keys(customVars).length > 0) {
    out.custom = customVars;
  }
  return out;
}
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
  const [editableVariables, setEditableVariables] = useState<Variable[]>([]);

  // IA generation
  const [aiOpen, setAiOpen] = useState(false);
  const [aiBrief, setAiBrief] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  // Variable manuelle à ajouter
  const [newVarName, setNewVarName] = useState("");
  const [newVarDesc, setNewVarDesc] = useState("");

  // Valeurs custom pour preview live
  const [previewCustom, setPreviewCustom] = useState<Record<string, string>>({});
  const [previewDebounce, setPreviewDebounce] = useState(0);

  // Import doc
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState("");
  const importInputRef = useRef<HTMLInputElement | null>(null);

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
      setEditableVariables(variables);
    }
  }, [selectedId, selected, variables]);

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
        variables: editableVariables,
        actif: selected.actif,
      });
      setSaveMsg("Enregistré");
      await mutateTemplates();
      setPreviewVersion((v) => v + 1);
      setTimeout(() => setSaveMsg(""), 2500);
    } catch {
      setSaveMsg("Erreur");
    }
    setSaving(false);
  };

  const handleGenerateAI = async () => {
    if (!selected) return;
    if (aiBrief.trim().length < 10) {
      setAiError("Décris au moins en 1 phrase ce que tu veux générer.");
      return;
    }
    setAiLoading(true);
    setAiError("");
    try {
      const result = await api.post<{
        titre: string;
        introduction: string;
        corps: string;
        mentions: string;
      }>("/api/document-templates/generate-ai", {
        type: selected.type,
        brief: aiBrief,
        variables: editableVariables,
      });
      setTitre(result.titre || titre);
      setIntroduction(result.introduction || introduction);
      setCorps(result.corps || corps);
      setMentions(result.mentions || mentions);
      setAiOpen(false);
      setAiBrief("");
      setSaveMsg("Brouillon IA généré — vérifie puis enregistre");
      setTimeout(() => setSaveMsg(""), 4000);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Erreur IA";
      setAiError(msg);
    } finally {
      setAiLoading(false);
    }
  };

  const addVariable = () => {
    const nom = newVarName.trim();
    if (!nom) return;
    if (editableVariables.some((v) => v.nom === nom)) {
      setNewVarName("");
      return;
    }
    setEditableVariables((prev) => [
      ...prev,
      { nom, description: newVarDesc.trim() },
    ]);
    setNewVarName("");
    setNewVarDesc("");
  };

  const removeVariable = (nom: string) => {
    setEditableVariables((prev) => prev.filter((v) => v.nom !== nom));
  };

  const updatePreviewCustom = (key: string, value: string) => {
    setPreviewCustom((prev) => ({ ...prev, [key]: value }));
    setPreviewDebounce((v) => v + 1);
  };

  const handleImport = async (file: File) => {
    if (!selected) return;
    setImportLoading(true);
    setImportError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await fetch("/api/document-templates/import", {
        method: "POST",
        body: formData,
      });
      if (!result.ok) {
        const body = await result.json().catch(() => ({}));
        throw new Error(body.error ?? `Erreur ${result.status}`);
      }
      const { texte } = (await result.json()) as { texte: string };
      // Pré-rempli le corps (le titre et l'intro restent à éditer)
      setCorps(texte);
      setSaveMsg("Texte importé dans le corps — relis et enregistre");
      setTimeout(() => setSaveMsg(""), 4000);
    } catch (err) {
      setImportError(
        err instanceof Error ? err.message : "Échec de l'import",
      );
    } finally {
      setImportLoading(false);
      if (importInputRef.current) importInputRef.current.value = "";
    }
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

  // Refresh iframe preview when entering preview tab OU quand les valeurs
  // custom changent (debounce 500ms pour ne pas re-générer le PDF à chaque
  // frappe clavier).
  useEffect(() => {
    if (tab !== "preview" || !selected) return;
    const handle = setTimeout(() => {
      if (!iframeRef.current) return;
      const hasCustom = Object.values(previewCustom).some((v) => v && v.trim());
      const varsParam = hasCustom
        ? `&vars=${encodeURIComponent(JSON.stringify(buildVarsFromCustom(previewCustom)))}`
        : "";
      iframeRef.current.src = `/api/pdf/template-preview/${selected.type}?v=${previewVersion}${varsParam}`;
    }, 500);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, selected, previewVersion, previewDebounce]);

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
                  {saveMsg === "Enregistré" ? <CheckCircle2 className="h-3 w-3 inline mr-1" /> : null}{saveMsg}
                </span>}
                <input
                  ref={importInputRef}
                  type="file"
                  accept="application/pdf,.pdf,.txt,text/plain"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImport(f);
                  }}
                />
                <button
                  onClick={() => importInputRef.current?.click()}
                  disabled={importLoading || saving}
                  className="inline-flex items-center gap-1.5 rounded-md border border-blue-700/50 bg-blue-900/20 px-3 py-1.5 text-xs text-blue-300 hover:bg-blue-900/40 disabled:opacity-40"
                  title="Importer un PDF ou texte (sera placé dans le corps)"
                >
                  {importLoading ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" /> Import…
                    </>
                  ) : (
                    <>
                      <Upload className="h-3 w-3" /> Importer
                    </>
                  )}
                </button>
                <button
                  onClick={() => setAiOpen(true)}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-md border border-purple-700/50 bg-purple-900/20 px-3 py-1.5 text-xs text-purple-300 hover:bg-purple-900/40 disabled:opacity-40"
                  title="Générer le contenu via Claude"
                >
                  <Sparkles className="h-3 w-3" /> Générer avec IA
                </button>
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
                  <div className="space-y-1.5 mb-3">
                    {editableVariables.length === 0 ? (
                      <p className="text-xs text-gray-500 italic">Aucune variable</p>
                    ) : editableVariables.map((v) => (
                      <div
                        key={v.nom}
                        className="rounded-md border border-gray-700 bg-gray-800 p-2"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <code className="text-[10px] text-red-400 block">{"{{"}{v.nom}{"}}"}</code>
                          <button
                            onClick={() => removeVariable(v.nom)}
                            className="text-gray-500 hover:text-red-400 shrink-0"
                            title="Retirer cette variable"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                        {v.description ? (
                          <p className="text-[10px] text-gray-500 mb-1.5">{v.description}</p>
                        ) : null}
                        <div className="flex gap-1 flex-wrap mt-1">
                          <button onClick={() => insertVariable("titre", v.nom)} className="text-[9px] px-1.5 py-0.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300">Titre</button>
                          <button onClick={() => insertVariable("intro", v.nom)} className="text-[9px] px-1.5 py-0.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300">Intro</button>
                          <button onClick={() => insertVariable("corps", v.nom)} className="text-[9px] px-1.5 py-0.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300">Corps</button>
                          <button onClick={() => insertVariable("mentions", v.nom)} className="text-[9px] px-1.5 py-0.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300">Mentions</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Ajouter une variable custom */}
                  <div className="rounded-md border border-dashed border-gray-700 bg-gray-900/50 p-2 space-y-1.5">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase">Ajouter une variable</p>
                    <input
                      value={newVarName}
                      onChange={(e) => setNewVarName(e.target.value.replace(/[^a-zA-Z0-9_]/g, "_"))}
                      placeholder="nom_variable"
                      className="w-full h-7 rounded border border-gray-700 bg-gray-900 px-2 text-[11px] text-gray-100"
                    />
                    <input
                      value={newVarDesc}
                      onChange={(e) => setNewVarDesc(e.target.value)}
                      placeholder="Description (optionnel)"
                      className="w-full h-7 rounded border border-gray-700 bg-gray-900 px-2 text-[11px] text-gray-100"
                    />
                    <button
                      onClick={addVariable}
                      disabled={!newVarName.trim()}
                      className="w-full inline-flex items-center justify-center gap-1 rounded bg-gray-700 hover:bg-gray-600 px-2 py-1 text-[10px] text-gray-200 disabled:opacity-40"
                    >
                      <Plus className="h-3 w-3" /> Ajouter
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-2 italic">
                    Pense à enregistrer pour persister les variables.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-3">
                {/* Inputs valeurs custom */}
                <div className="space-y-3 rounded-md border border-gray-700 bg-gray-800 p-3 max-h-[800px] overflow-y-auto">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase">
                    Valeurs de test
                  </p>
                  <p className="text-[10px] text-gray-500">
                    Modifie les champs ci-dessous pour voir l'aperçu se mettre
                    à jour en direct (~500ms).
                  </p>

                  <CustomFieldGroup
                    label="Stagiaire"
                    fields={[
                      { k: "stagiaire.prenom", label: "Prénom", ph: "Marie" },
                      { k: "stagiaire.nom", label: "Nom", ph: "Dupont" },
                      { k: "stagiaire.email", label: "Email", ph: "marie@x.com" },
                    ]}
                    values={previewCustom}
                    onChange={updatePreviewCustom}
                  />
                  <CustomFieldGroup
                    label="Formation"
                    fields={[
                      { k: "formation.titre", label: "Titre", ph: "Sécurité incendie" },
                      { k: "formation.duree", label: "Durée (h)", ph: "14" },
                    ]}
                    values={previewCustom}
                    onChange={updatePreviewCustom}
                  />
                  <CustomFieldGroup
                    label="Session"
                    fields={[
                      { k: "session.dateDebut", label: "Début", ph: "15/06/2026" },
                      { k: "session.dateFin", label: "Fin", ph: "16/06/2026" },
                      { k: "session.lieu", label: "Lieu", ph: "Toulon" },
                    ]}
                    values={previewCustom}
                    onChange={updatePreviewCustom}
                  />
                  <CustomFieldGroup
                    label="Entreprise"
                    fields={[
                      { k: "entreprise.nom", label: "Nom", ph: "Acme" },
                      { k: "entreprise.siret", label: "SIRET", ph: "123…" },
                      { k: "entreprise.ville", label: "Ville", ph: "Toulon" },
                    ]}
                    values={previewCustom}
                    onChange={updatePreviewCustom}
                  />
                  <CustomFieldGroup
                    label="Formateur"
                    fields={[
                      { k: "formateur.prenom", label: "Prénom", ph: "Pierre" },
                      { k: "formateur.nom", label: "Nom", ph: "Martin" },
                    ]}
                    values={previewCustom}
                    onChange={updatePreviewCustom}
                  />

                  {editableVariables.filter((v) => !STD_PATHS[`stagiaire.${v.nom}`] && !STD_PATHS[`formation.${v.nom}`] && !STD_PATHS[`session.${v.nom}`] && !STD_PATHS[`entreprise.${v.nom}`] && !STD_PATHS[`formateur.${v.nom}`]).length > 0 ? (
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1.5">
                        Variables custom
                      </p>
                      <div className="space-y-1.5">
                        {editableVariables.map((v) => (
                          <div key={v.nom}>
                            <label className="text-[10px] text-gray-400 block mb-0.5">
                              {`{{${v.nom}}}`}
                            </label>
                            <input
                              value={previewCustom[v.nom] ?? ""}
                              onChange={(e) =>
                                updatePreviewCustom(v.nom, e.target.value)
                              }
                              placeholder={v.description || ""}
                              className="w-full h-7 rounded border border-gray-700 bg-gray-900 px-2 text-[11px] text-gray-100"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <button
                    onClick={() => {
                      setPreviewCustom({});
                      setPreviewDebounce((v) => v + 1);
                    }}
                    className="w-full text-[10px] rounded border border-gray-700 bg-gray-900 px-2 py-1 text-gray-400 hover:bg-gray-700"
                  >
                    Réinitialiser les valeurs
                  </button>
                </div>

                {/* Iframe PDF */}
                <div className="rounded-md bg-gray-800 border border-gray-700 p-2">
                  <iframe
                    ref={iframeRef}
                    title="Apercu PDF"
                    className="w-full rounded bg-white"
                    style={{ height: "800px" }}
                  />
                  <p className="text-[10px] text-gray-500 italic text-center mt-1">
                    Aperçu live avec les valeurs ci-contre. Enregistre pour
                    persister les modifications du template.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modale génération IA */}
      {aiOpen && selected ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => !aiLoading && setAiOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-xl border border-purple-700/40 bg-gray-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-400" />
                Générer avec l'IA
              </h2>
              <button
                onClick={() => !aiLoading && setAiOpen(false)}
                className="text-gray-400 hover:text-gray-200"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-gray-400 mb-3">
              Décris ce que tu veux dans ce template :{" "}
              <strong className="text-gray-200">{selected.nom}</strong>. L'IA
              proposera titre, introduction, corps et mentions — tu pourras
              ensuite éditer avant d'enregistrer.
            </p>

            <textarea
              value={aiBrief}
              onChange={(e) => setAiBrief(e.target.value)}
              placeholder="Ex: Une convention de formation pour formation sécurité incendie, 14h sur 2 jours, ton professionnel mais accessible, avec rappel des modalités de paiement à 30 jours et clause d'annulation."
              rows={6}
              className="w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100 mb-2"
              disabled={aiLoading}
            />

            {editableVariables.length > 0 ? (
              <details className="mb-2 text-xs text-gray-400">
                <summary className="cursor-pointer">
                  {editableVariables.length} variable(s) disponible(s) pour l'IA
                </summary>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {editableVariables.map((v) => (
                    <code
                      key={v.nom}
                      className="rounded bg-gray-800 px-1.5 py-0.5 text-[10px] text-purple-300"
                    >{`{{${v.nom}}}`}</code>
                  ))}
                </div>
              </details>
            ) : null}

            {aiError ? (
              <p className="text-xs text-red-400 mb-2">{aiError}</p>
            ) : null}

            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => setAiOpen(false)}
                disabled={aiLoading}
                className="rounded-md border border-gray-600 bg-gray-800 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 disabled:opacity-40"
              >
                Annuler
              </button>
              <button
                onClick={handleGenerateAI}
                disabled={aiLoading || aiBrief.trim().length < 10}
                className="inline-flex items-center gap-2 rounded-md bg-purple-600 hover:bg-purple-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
              >
                {aiLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Génération…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> Générer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {importError ? (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 rounded-md border border-red-700 bg-red-900/90 px-4 py-2 text-sm text-red-100 shadow-xl">
          {importError}
          <button
            onClick={() => setImportError("")}
            className="ml-3 text-red-300 hover:text-white"
          >
            ✕
          </button>
        </div>
      ) : null}
    </div>
  );
}

function CustomFieldGroup({
  label,
  fields,
  values,
  onChange,
}: {
  label: string;
  fields: Array<{ k: string; label: string; ph?: string }>;
  values: Record<string, string>;
  onChange: (k: string, v: string) => void;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1.5">
        {label}
      </p>
      <div className="space-y-1">
        {fields.map((f) => (
          <div key={f.k}>
            <label className="text-[9px] text-gray-500 block">{f.label}</label>
            <input
              value={values[f.k] ?? ""}
              onChange={(e) => onChange(f.k, e.target.value)}
              placeholder={f.ph}
              className="w-full h-6 rounded border border-gray-700 bg-gray-900 px-1.5 text-[11px] text-gray-100"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
