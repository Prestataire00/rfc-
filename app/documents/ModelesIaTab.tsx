"use client";

// Onglet « Modèles IA » de la page Documents.
// L'admin décrit un document en langage naturel, l'IA génère un modèle
// (titre / introduction / corps / mentions / variables) éditable, puis
// l'enregistre. Les modèles enregistrés sont listés et exportables en PDF.
// Anciennement à /documents/modeles ; intégré ici pour éviter d'éclater
// la gestion documentaire en deux pages.

import { useState, useRef } from "react";
import { Sparkles, FileText, Download, Trash2, Save, Wand2, Pencil, X, Send, Upload } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/fetcher";
import { notify } from "@/lib/toast";
import { formatDate } from "@/lib/utils";

type Variable = { nom: string; description: string };

type AiOutput = {
  titre: string;
  introduction: string;
  corps: string;
  mentions: string;
  variables: Variable[];
};

type ModeleDocument = {
  id: string;
  nom: string;
  description: string | null;
  titre: string;
  introduction: string | null;
  corps: string;
  mentions: string | null;
  variables: string;
  createdAt: string;
};

export function ModelesIaTab() {
  const { data: modelesData, isLoading, mutate } = useApi<ModeleDocument[]>(
    "/api/modeles-document",
  );
  const modeles: ModeleDocument[] = Array.isArray(modelesData) ? modelesData : [];

  const [description, setDescription] = useState("");
  const [generating, setGenerating] = useState(false);
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [draft, setDraft] = useState<AiOutput | null>(null);
  const [nom, setNom] = useState("");
  const [saving, setSaving] = useState(false);
  // editingId !== null → on édite un modèle existant (PUT au save) au lieu d'en créer un nouveau.
  const [editingId, setEditingId] = useState<string | null>(null);
  // Modal « Générer pour un client » — id du modèle ciblé, null = fermé.
  const [generatingForClientId, setGeneratingForClientId] = useState<string | null>(null);

  const resetEditor = () => {
    setDraft(null);
    setNom("");
    setDescription("");
    setEditingId(null);
  };

  const handleEdit = (m: ModeleDocument) => {
    setEditingId(m.id);
    setNom(m.nom);
    setDescription(m.description ?? "");
    let parsedVars: Variable[] = [];
    try {
      parsedVars = JSON.parse(m.variables) as Variable[];
    } catch {
      parsedVars = [];
    }
    setDraft({
      titre: m.titre,
      introduction: m.introduction ?? "",
      corps: m.corps,
      mentions: m.mentions ?? "",
      variables: parsedVars,
    });
    // Scroll vers le haut pour rendre l'éditeur visible
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleGenerate = async () => {
    if (description.trim().length < 10) {
      notify.error("Decrivez le document en quelques mots (10 caracteres minimum).");
      return;
    }
    setGenerating(true);
    try {
      const result = await api.post<AiOutput>("/api/ai/modele-document", {
        description: description.trim(),
      });
      setDraft({
        titre: result.titre ?? "",
        introduction: result.introduction ?? "",
        corps: result.corps ?? "",
        mentions: result.mentions ?? "",
        variables: Array.isArray(result.variables) ? result.variables : [],
      });
      notify.success("Modele genere", "Relisez et ajustez avant d'enregistrer.");
    } catch (err) {
      notify.error("Generation impossible", err instanceof Error ? err.message : undefined);
    } finally {
      setGenerating(false);
    }
  };

  const handleImport = async (file: File) => {
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/modeles-document/import", { method: "POST", body: formData });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Erreur ${res.status}`);
      }
      const { modele } = (await res.json()) as { modele: ModeleDocument };
      await mutate();
      notify.success("Document importé et adapté", "Relisez les variables détectées avant de générer par client.");
      handleEdit(modele); // ouvre le modèle créé pour relecture/ajustement
    } catch (err) {
      notify.error("Import impossible", err instanceof Error ? err.message : undefined);
    } finally {
      setImporting(false);
      if (importInputRef.current) importInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (!draft) return;
    if (!nom.trim()) {
      notify.error("Donnez un nom au modele.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        nom: nom.trim(),
        description: description.trim() || undefined,
        titre: draft.titre,
        introduction: draft.introduction || undefined,
        corps: draft.corps,
        mentions: draft.mentions || undefined,
        variables: draft.variables,
      };
      if (editingId) {
        await api.put(`/api/modeles-document/${editingId}`, payload);
        notify.success("Modele mis a jour");
      } else {
        await api.post("/api/modeles-document", payload);
        notify.success("Modele enregistre");
      }
      resetEditor();
      await mutate();
    } catch (err) {
      notify.error("Enregistrement impossible", err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce modele ?")) return;
    try {
      await api.delete(`/api/modeles-document/${id}`);
      notify.success("Modele supprime");
      await mutate();
    } catch (err) {
      notify.error("Suppression impossible", err instanceof Error ? err.message : undefined);
    }
  };

  const cardCls = "rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800";
  const fieldCls =
    "mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500";

  return (
    <div>
      {/* Génération */}
      <section className={`${cardCls} p-5 mb-8`}>
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-3">
          <Sparkles className="h-5 w-5 text-red-500" /> Decrire le document
        </h2>
        <Label htmlFor="description">Que doit contenir ce document ?</Label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Ex : un courrier de relance pour facture impayee, ton ferme mais courtois"
          className={fieldCls}
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button onClick={handleGenerate} disabled={generating} className="gap-2">
            <Wand2 className="h-4 w-4" />
            {generating ? "Generation en cours..." : "Generer avec l'IA"}
          </Button>
          <span className="text-xs text-gray-400">ou</span>
          <input
            ref={importInputRef}
            type="file"
            accept="application/pdf,.pdf,.txt,text/plain,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImport(f); }}
          />
          <Button variant="outline" onClick={() => importInputRef.current?.click()} disabled={importing} className="gap-2">
            <Upload className="h-4 w-4" />
            {importing ? "Import en cours..." : "Importer un document"}
          </Button>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          PDF, Word (.docx), image ou texte. L&apos;IA le transforme en modèle avec variables, adaptable à chaque client.
        </p>
      </section>

      {/* Preview éditable */}
      {draft && (
        <section className={`${cardCls} p-5 mb-8`}>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Modele genere — relisez et ajustez
          </h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="titre">Titre</Label>
              <Input id="titre" value={draft.titre} onChange={(e) => setDraft({ ...draft, titre: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="introduction">Introduction</Label>
              <textarea id="introduction" value={draft.introduction} onChange={(e) => setDraft({ ...draft, introduction: e.target.value })} rows={2} className={fieldCls} />
            </div>
            <div>
              <Label htmlFor="corps">Corps</Label>
              <textarea id="corps" value={draft.corps} onChange={(e) => setDraft({ ...draft, corps: e.target.value })} rows={12} className={`${fieldCls} font-mono`} />
            </div>
            <div>
              <Label htmlFor="mentions">Mentions</Label>
              <textarea id="mentions" value={draft.mentions} onChange={(e) => setDraft({ ...draft, mentions: e.target.value })} rows={2} className={fieldCls} />
            </div>
            {draft.variables.length > 0 && (
              <div>
                <Label>Variables detectees</Label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {draft.variables.map((v) => (
                    <span key={v.nom} title={v.description} className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 px-2.5 py-0.5 text-xs font-mono">
                      {`{{${v.nom}}}`}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <Label htmlFor="nom">Nom du modele</Label>
              <Input id="nom" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex : Courrier de relance facture" className="mt-1" />
              <div className="mt-3 flex flex-wrap gap-3">
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                  <Save className="h-4 w-4" />
                  {saving ? "Enregistrement..." : editingId ? "Mettre a jour" : "Enregistrer le modele"}
                </Button>
                <Button variant="outline" onClick={resetEditor}>
                  <X className="h-4 w-4" /> Annuler
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Modal : générer le modèle pour un client précis */}
      {generatingForClientId && (
        <GenerateForClientModal
          modele={modeles.find((m) => m.id === generatingForClientId) ?? null}
          onClose={() => setGeneratingForClientId(null)}
        />
      )}

      {/* Liste modeles */}
      <section>
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">Modeles enregistres</h2>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
          </div>
        ) : modeles.length === 0 ? (
          <EmptyState icon={FileText} title="Aucun modele" description="Decrivez un document ci-dessus pour generer votre premier modele." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {modeles.map((m) => (
              <div key={m.id} className={`${cardCls} p-4 flex flex-col`}>
                <div className="flex items-start gap-2 mb-1">
                  <FileText className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 leading-tight">{m.nom}</h3>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{m.titre}</p>
                {m.description && <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-2 mb-2">{m.description}</p>}
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-3">Cree le {formatDate(m.createdAt)}</p>
                <div className="mt-auto flex flex-wrap gap-2">
                  <a
                    href={`/api/pdf/modele-document/${m.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1 rounded-md bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1.5 transition-colors"
                    title="Telecharger le modele en PDF (variables non substituees)"
                  >
                    <Download className="h-3 w-3" /> PDF
                  </a>
                  <button
                    onClick={() => handleEdit(m)}
                    className="inline-flex items-center justify-center gap-1 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-xs px-2 py-1.5 transition-colors"
                    title="Modifier le modele"
                  >
                    <Pencil className="h-3 w-3" /> Modifier
                  </button>
                  <button
                    onClick={() => setGeneratingForClientId(m.id)}
                    className="inline-flex items-center justify-center gap-1 rounded-md border border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/30 text-xs px-2 py-1.5 transition-colors"
                    title="Generer ce modele pour un client (substitution des variables)"
                  >
                    <Send className="h-3 w-3" /> Pour client
                  </button>
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="ml-auto inline-flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-600 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 px-2 py-1.5 transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// GenerateForClientModal — sélection d'un contact et téléchargement PDF
// avec substitution des variables {{client.*}} / {{societe.*}} / {{entreprise.*}}.
// ──────────────────────────────────────────────────────────────────────────────
type ContactLite = {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  entreprise: { nom: string } | null;
};

function GenerateForClientModal({
  modele,
  onClose,
}: {
  modele: ModeleDocument | null;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const { data: contactsData, isLoading } = useApi<ContactLite[] | { data: ContactLite[] }>(
    "/api/contacts?limit=200",
  );

  const contacts: ContactLite[] = Array.isArray(contactsData)
    ? contactsData
    : contactsData?.data ?? [];

  const q = search.trim().toLowerCase();
  const filtered = q
    ? contacts.filter((c) => {
        const haystack = `${c.prenom} ${c.nom} ${c.email} ${c.entreprise?.nom ?? ""}`.toLowerCase();
        return haystack.includes(q);
      })
    : contacts;

  const handleGenerate = async (contactId: string) => {
    if (!modele) return;
    setGeneratingId(contactId);
    try {
      const res = await fetch(`/api/modeles-document/${modele.id}/render-for-contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Génération impossible");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const contact = contacts.find((c) => c.id === contactId);
      const slug = contact ? `${contact.prenom}-${contact.nom}`.toLowerCase().replace(/\s+/g, "-") : "client";
      a.download = `${modele.nom.toLowerCase().replace(/\s+/g, "-")}-${slug}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      notify.success("PDF généré", `Document pour ${contact?.prenom} ${contact?.nom}`);
      onClose();
    } catch (err) {
      notify.error("Erreur", err instanceof Error ? err.message : "Génération impossible");
    } finally {
      setGeneratingId(null);
    }
  };

  if (!modele) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Générer « {modele.nom} » pour un client
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Les variables <code className="px-1 bg-gray-100 dark:bg-gray-900 rounded">{"{{client.*}}"}</code> /
            {" "}<code className="px-1 bg-gray-100 dark:bg-gray-900 rounded">{"{{societe.*}}"}</code> seront remplies
            depuis le contact sélectionné.
          </p>
        </div>
        <div className="p-4">
          <Input
            type="search"
            placeholder="Rechercher par nom, email ou entreprise…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1">
          {isLoading ? (
            <div className="py-8 text-center text-sm text-gray-500">Chargement des contacts…</div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">
              {q ? "Aucun contact correspondant" : "Aucun contact disponible"}
            </div>
          ) : (
            filtered.slice(0, 50).map((c) => {
              const busy = generatingId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleGenerate(c.id)}
                  disabled={!!generatingId}
                  className="w-full text-left rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {c.prenom} {c.nom}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {c.email}
                        {c.entreprise && <span className="text-gray-400"> · {c.entreprise.nom}</span>}
                      </p>
                    </div>
                    <span className="text-xs text-red-500 shrink-0">
                      {busy ? "Génération…" : "Télécharger"}
                    </span>
                  </div>
                </button>
              );
            })
          )}
          {!isLoading && filtered.length > 50 && (
            <p className="text-[11px] text-center text-gray-400 pt-2">
              {filtered.length - 50} résultats supplémentaires — affinez la recherche.
            </p>
          )}
        </div>
        <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </div>
    </div>
  );
}
