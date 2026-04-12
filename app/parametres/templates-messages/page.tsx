"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Save, Mail, RotateCcw, Eye, Pencil, CheckCircle2 } from "lucide-react";

type Variable = { nom: string; description: string };
type Template = {
  id: string;
  type: string;
  nom: string;
  description: string | null;
  objet: string;
  contenu: string;
  variables: string; // JSON
  modifie: boolean;
  actif: boolean;
};

export default function TemplatesMessagesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [tab, setTab] = useState<"edit" | "preview">("edit");

  // Form state
  const [objet, setObjet] = useState("");
  const [contenu, setContenu] = useState("");

  const load = () => {
    fetch("/api/message-templates")
      .then((r) => r.ok ? r.json() : [])
      .then((d) => {
        setTemplates(Array.isArray(d) ? d : []);
        setLoading(false);
        if (!selectedId && Array.isArray(d) && d.length > 0) {
          setSelectedId(d[0].id);
        }
      });
  };

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selected = templates.find((t) => t.id === selectedId);
  const variables: Variable[] = useMemo(() => {
    if (!selected) return [];
    try { return JSON.parse(selected.variables); } catch { return []; }
  }, [selected]);

  useEffect(() => {
    if (selected) {
      setObjet(selected.objet);
      setContenu(selected.contenu);
    }
  }, [selectedId, selected]);

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    setSaveMsg("");
    const res = await fetch(`/api/message-templates/${selected.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom: selected.nom, description: selected.description, objet, contenu, actif: selected.actif }),
    });
    if (res.ok) {
      setSaveMsg("Enregistre");
      load();
      setTimeout(() => setSaveMsg(""), 2500);
    } else {
      setSaveMsg("Erreur");
    }
    setSaving(false);
  };

  const handleReset = async () => {
    if (!selected || !window.confirm("Reinitialiser ce template au defaut ? Vos modifications seront perdues.")) return;
    setSaving(true);
    const res = await fetch(`/api/message-templates/${selected.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset" }),
    });
    if (res.ok) {
      const tpl = await res.json();
      setObjet(tpl.objet);
      setContenu(tpl.contenu);
      setSaveMsg("Reinitialise");
      load();
      setTimeout(() => setSaveMsg(""), 2500);
    }
    setSaving(false);
  };

  const insertVariable = (v: string) => {
    const tag = `{{${v}}}`;
    setContenu((prev) => prev + " " + tag);
  };

  // Sample preview with placeholder values
  const previewHtml = useMemo(() => {
    if (!selected) return "";
    const sampleVars: Record<string, string> = {
      "stagiaire.prenom": "Marie",
      "stagiaire.nom": "Dupont",
      "destinataire.nom": "Jean Martin",
      "formation.titre": "Formation SST Renouvellement",
      "session.dateDebut": "15 mai 2026",
      "session.dateFin": "16 mai 2026",
      "session.lieu": "12 avenue de la division Leclerc, 93350 Le Bourget",
      "lien": "https://exemple.com/lien-personnel",
    };
    let html = contenu;
    html = html.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_, k) => sampleVars[k] ?? `[${k}]`);
    return html;
  }, [contenu, selected]);

  const previewObjet = useMemo(() => {
    const sampleVars: Record<string, string> = {
      "formation.titre": "Formation SST Renouvellement",
      "stagiaire.prenom": "Marie",
      "stagiaire.nom": "Dupont",
    };
    return objet.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_, k) => sampleVars[k] ?? `[${k}]`);
  }, [objet]);

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
          <Mail className="h-6 w-6 text-red-500" /> Modeles de messages
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Personnalisez les emails envoyes automatiquement (convocation, fiches besoin, evaluations, etc.).
          Utilisez les variables <code className="px-1 bg-gray-800 rounded">{"{{xxx}}"}</code> pour inserer des donnees dynamiques.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Liste templates */}
        <div className="lg:col-span-1 space-y-2">
          <p className="text-xs uppercase text-gray-500 font-semibold mb-2">Templates</p>
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
                {t.modifie && <Pencil className="h-3 w-3 text-amber-400 shrink-0" title="Modifie" />}
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

            {/* Tabs edit / preview */}
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
                <Eye className="h-4 w-4" /> Apercu
              </button>
            </div>

            {tab === "edit" ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-3 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Objet de l&apos;email</label>
                    <input
                      value={objet}
                      onChange={(e) => setObjet(e.target.value)}
                      className="w-full h-10 rounded-md border border-gray-600 bg-gray-900 px-3 text-sm text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Corps du message (HTML)</label>
                    <textarea
                      value={contenu}
                      onChange={(e) => setContenu(e.target.value)}
                      rows={20}
                      spellCheck={false}
                      className="w-full rounded-md border border-gray-600 bg-gray-900 px-3 py-2 text-xs text-gray-100 font-mono"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">
                      HTML autorise. Utilisez les variables <code className="bg-gray-800 px-1 rounded">{"{{xxx}}"}</code> listees a droite.
                    </p>
                  </div>
                </div>

                {/* Variables disponibles */}
                <div className="md:col-span-1">
                  <p className="text-xs font-semibold text-gray-300 mb-2 uppercase">Variables disponibles</p>
                  <div className="space-y-1.5">
                    {variables.length === 0 ? (
                      <p className="text-xs text-gray-500 italic">Aucune variable definie</p>
                    ) : variables.map((v) => (
                      <button
                        key={v.nom}
                        type="button"
                        onClick={() => insertVariable(v.nom)}
                        className="w-full text-left rounded-md border border-gray-700 bg-gray-800 hover:bg-gray-700 px-2 py-1.5"
                        title="Cliquer pour inserer"
                      >
                        <code className="text-xs text-red-400">{"{{"}{v.nom}{"}}"}</code>
                        <p className="text-[10px] text-gray-500 mt-0.5">{v.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-md bg-gray-800 border border-gray-700 p-3 text-sm">
                  <p className="text-[10px] uppercase text-gray-500 font-semibold">Objet</p>
                  <p className="text-gray-100 mt-1">{previewObjet}</p>
                </div>
                <div className="rounded-md bg-white border border-gray-300 p-4">
                  <div
                    className="prose prose-sm max-w-none text-gray-900"
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                </div>
                <p className="text-[10px] text-gray-500 italic text-center">
                  Apercu avec des valeurs fictives (Marie Dupont / Formation SST). Les vraies variables seront remplacees a l&apos;envoi.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
