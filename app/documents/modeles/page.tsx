"use client";

// Page : "Modeles de documents IA".
// L'admin decrit un document en langage naturel, l'IA genere un modele
// (titre / introduction / corps / mentions / variables) editable, puis
// l'enregistre. Les modeles enregistres sont listes et exportables en PDF.

import { useState } from "react";
import { Sparkles, FileText, Download, Trash2, Save, Wand2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
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

export default function ModelesDocumentPage() {
  const { data: modelesData, isLoading, mutate } = useApi<ModeleDocument[]>(
    "/api/modeles-document",
  );
  const modeles: ModeleDocument[] = Array.isArray(modelesData) ? modelesData : [];

  const [description, setDescription] = useState("");
  const [generating, setGenerating] = useState(false);
  const [draft, setDraft] = useState<AiOutput | null>(null);
  const [nom, setNom] = useState("");
  const [saving, setSaving] = useState(false);

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
      notify.error(
        "Generation impossible",
        err instanceof Error ? err.message : undefined,
      );
    } finally {
      setGenerating(false);
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
      await api.post("/api/modeles-document", {
        nom: nom.trim(),
        description: description.trim() || undefined,
        titre: draft.titre,
        introduction: draft.introduction || undefined,
        corps: draft.corps,
        mentions: draft.mentions || undefined,
        variables: draft.variables,
      });
      notify.success("Modele enregistre");
      setDraft(null);
      setNom("");
      setDescription("");
      await mutate();
    } catch (err) {
      notify.error(
        "Enregistrement impossible",
        err instanceof Error ? err.message : undefined,
      );
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
      notify.error(
        "Suppression impossible",
        err instanceof Error ? err.message : undefined,
      );
    }
  };

  const cardCls =
    "rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800";
  const fieldCls =
    "mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500";

  return (
    <div>
      <Breadcrumb
        items={[
          { label: "Documents", href: "/documents" },
          { label: "Modeles IA" },
        ]}
      />
      <PageHeader
        title="Modeles de documents IA"
        description="Decrivez un document, l'IA genere un modele reutilisable et exportable en PDF."
      />

      {/* Zone de generation */}
      <section className={`${cardCls} p-5 mb-8`}>
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-3">
          <Sparkles className="h-5 w-5 text-red-500" /> Decrire le document
        </h2>
        <Label htmlFor="description">
          Que doit contenir ce document ?
        </Label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Ex : un courrier de relance pour facture impayee, ton ferme mais courtois"
          className={fieldCls}
        />
        <div className="mt-3">
          <Button onClick={handleGenerate} disabled={generating} className="gap-2">
            <Wand2 className="h-4 w-4" />
            {generating ? "Generation en cours..." : "Generer avec l'IA"}
          </Button>
        </div>
      </section>

      {/* Preview editable du modele genere */}
      {draft && (
        <section className={`${cardCls} p-5 mb-8`}>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Modele genere — relisez et ajustez
          </h2>

          <div className="space-y-4">
            <div>
              <Label htmlFor="titre">Titre</Label>
              <Input
                id="titre"
                value={draft.titre}
                onChange={(e) => setDraft({ ...draft, titre: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="introduction">Introduction</Label>
              <textarea
                id="introduction"
                value={draft.introduction}
                onChange={(e) =>
                  setDraft({ ...draft, introduction: e.target.value })
                }
                rows={2}
                className={fieldCls}
              />
            </div>

            <div>
              <Label htmlFor="corps">Corps</Label>
              <textarea
                id="corps"
                value={draft.corps}
                onChange={(e) => setDraft({ ...draft, corps: e.target.value })}
                rows={12}
                className={`${fieldCls} font-mono`}
              />
            </div>

            <div>
              <Label htmlFor="mentions">Mentions</Label>
              <textarea
                id="mentions"
                value={draft.mentions}
                onChange={(e) => setDraft({ ...draft, mentions: e.target.value })}
                rows={2}
                className={fieldCls}
              />
            </div>

            {draft.variables.length > 0 && (
              <div>
                <Label>Variables detectees</Label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {draft.variables.map((v) => (
                    <span
                      key={v.nom}
                      title={v.description}
                      className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 px-2.5 py-0.5 text-xs font-mono"
                    >
                      {`{{${v.nom}}}`}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <Label htmlFor="nom">Nom du modele</Label>
              <Input
                id="nom"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Ex : Courrier de relance facture"
                className="mt-1"
              />
              <div className="mt-3 flex flex-wrap gap-3">
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                  <Save className="h-4 w-4" />
                  {saving ? "Enregistrement..." : "Enregistrer le modele"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDraft(null);
                    setNom("");
                  }}
                >
                  Annuler
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Liste des modeles existants */}
      <section>
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Modeles enregistres
        </h2>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
          </div>
        ) : modeles.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Aucun modele"
            description="Decrivez un document ci-dessus pour generer votre premier modele."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {modeles.map((m) => (
              <div key={m.id} className={`${cardCls} p-4 flex flex-col`}>
                <div className="flex items-start gap-2 mb-1">
                  <FileText className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 leading-tight">
                    {m.nom}
                  </h3>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {m.titre}
                </p>
                {m.description && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-2 mb-2">
                    {m.description}
                  </p>
                )}
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-3">
                  Cree le {formatDate(m.createdAt)}
                </p>
                <div className="mt-auto flex gap-2">
                  <a
                    href={`/api/pdf/modele-document/${m.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-1 rounded-md bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1.5 transition-colors"
                  >
                    <Download className="h-3 w-3" /> Telecharger PDF
                  </a>
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="inline-flex items-center justify-center rounded-md border border-gray-300 dark:border-gray-600 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 px-2 py-1.5 transition-colors"
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
