"use client";

import { useState } from "react";
import useSWR from "swr";
import { X, MessageSquare, Trash2 } from "lucide-react";
import { RichEditor } from "@/components/shared/RichEditor";

interface Comment {
  id: string;
  contentHtml: string;
  createdAt: string;
  author: { id: string; nom: string; prenom: string; role: string };
}

interface Props {
  taskId: string;
  taskTitle: string;
  currentUserId?: string;
  currentUserRole?: string;
  onClose: () => void;
}

const fetcher = (u: string) => fetch(u).then((r) => {
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
});

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("fr-FR")} ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
}

function roleColor(role: string): string {
  if (role === "admin") return "bg-red-500/15 text-red-300";
  if (role === "formateur") return "bg-blue-500/15 text-blue-300";
  return "bg-gray-500/15 text-gray-300";
}

export function TaskCommentsModal({
  taskId,
  taskTitle,
  currentUserId,
  currentUserRole,
  onClose,
}: Props) {
  const { data: comments, error: loadError, mutate } = useSWR<Comment[]>(
    `/api/task-items/${taskId}/comments`,
    fetcher,
  );

  const [draft, setDraft] = useState("<p></p>");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setPosting(true);
    setError(null);
    try {
      const res = await fetch(`/api/task-items/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentHtml: draft }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? res.statusText);
      }
      setDraft("<p></p>");
      mutate();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPosting(false);
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!confirm("Supprimer ce commentaire ?")) return;
    await fetch(`/api/task-items/${taskId}/comments/${commentId}`, { method: "DELETE" });
    mutate();
  };

  // Détection d'un draft vide (TipTap renvoie "<p></p>" même pour content vide).
  const isEmptyDraft = !draft || draft === "<p></p>" || draft.replace(/<[^>]+>/g, "").trim() === "";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <header className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="font-semibold text-gray-100 flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Commentaires — {taskTitle}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200">
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Liste commentaires */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loadError ? (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded p-3">
              Impossible de charger les commentaires (code {loadError.message}). Si vous venez de créer la tâche, vérifiez que vous avez les droits d&apos;accès à cette tâche.
            </p>
          ) : !comments ? (
            <p className="text-sm text-gray-500">Chargement…</p>
          ) : comments.length === 0 ? (
            <p className="text-sm text-gray-500 italic text-center py-8">
              Aucun commentaire. Soyez le premier à intervenir.
            </p>
          ) : (
            comments.map((c) => {
              const canDelete = currentUserRole === "admin" || c.author.id === currentUserId;
              return (
                <div key={c.id} className="rounded-lg border border-gray-700 bg-gray-800 p-3 group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-medium text-gray-100">
                        {c.author.prenom} {c.author.nom}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${roleColor(c.author.role)}`}>
                        {c.author.role}
                      </span>
                      <span className="text-gray-500">{formatDateTime(c.createdAt)}</span>
                    </div>
                    {canDelete && (
                      <button
                        onClick={() => deleteComment(c.id)}
                        className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Supprimer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <div
                    className="text-sm text-gray-200 prose prose-invert prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: c.contentHtml }}
                  />
                </div>
              );
            })
          )}
        </div>

        {/* Éditeur */}
        <div className="p-4 border-t border-gray-700 space-y-2">
          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded p-2">
              {error}
            </p>
          )}
          <RichEditor value={draft} onChange={setDraft} placeholder="Votre commentaire…" minHeight={80} />
          <div className="flex justify-end">
            <button
              onClick={submit}
              disabled={isEmptyDraft || posting}
              className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded disabled:opacity-50 hover:bg-blue-700"
            >
              {posting ? "Publication…" : "Publier"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
