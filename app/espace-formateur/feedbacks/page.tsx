"use client";

import { useState } from "react";
import { MessageSquare, Plus, Star } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatDate } from "@/lib/utils";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/fetcher";

type Feedback = {
  id: string;
  noteGlobale: number;
  commentaire: string | null;
  conditionsMat: string | null;
  dynamiqueGroupe: string | null;
  suggestions: string | null;
  createdAt: string;
  session: { id: string; dateDebut: string; formation: { titre: string } };
};

type Session = {
  id: string;
  dateDebut: string;
  statut: string;
  formation: { titre: string };
};

export default function FeedbacksPage() {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    sessionId: "",
    noteGlobale: "4",
    commentaire: "",
    conditionsMat: "",
    dynamiqueGroupe: "",
    suggestions: "",
  });

  const { data: fbData, isLoading: fbLoading, mutate: mutateFeedbacks } = useApi<Feedback[]>("/api/formateur/feedbacks");
  const { data: sessData, isLoading: sessLoading } = useApi<Session[]>("/api/formateur/mes-sessions");
  const feedbacks: Feedback[] = fbData ?? [];
  const sessions: Session[] = (sessData ?? []).filter((s) => s.statut === "terminee");
  const loading = fbLoading || sessLoading;

  const sessionsWithoutFeedback = sessions.filter(
    (s) => !feedbacks.some((f) => f.session.id === s.id)
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/api/formateur/feedbacks", form);
      setShowForm(false);
      setForm({ sessionId: "", noteGlobale: "4", commentaire: "", conditionsMat: "", dynamiqueGroupe: "", suggestions: "" });
      await mutateFeedbacks();
    } catch {
      // ignore
    }
    setSaving(false);
  }

  return (
    <div>
      <PageHeader title="Mes Feedbacks" description="Partagez votre retour sur vos sessions de formation" />

      {sessionsWithoutFeedback.length > 0 && (
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            <Plus className="h-4 w-4" /> Nouveau feedback
          </button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-lg border bg-gray-800 p-6 mb-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Session *</label>
            <select
              required
              value={form.sessionId}
              onChange={(e) => setForm({ ...form, sessionId: e.target.value })}
              className="w-full h-10 rounded-md border border-gray-600 px-3 text-sm"
            >
              <option value="">-- Choisir --</option>
              {sessionsWithoutFeedback.map((s) => (
                <option key={s.id} value={s.id}>{s.formation.titre} - {formatDate(s.dateDebut)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Note globale *</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setForm({ ...form, noteGlobale: String(n) })}
                  className="p-1"
                >
                  <Star className={`h-6 w-6 ${n <= parseInt(form.noteGlobale) ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Commentaire general</label>
            <textarea value={form.commentaire} onChange={(e) => setForm({ ...form, commentaire: e.target.value })} className="w-full rounded-md border border-gray-600 px-3 py-2 text-sm" rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Conditions materielles</label>
              <textarea value={form.conditionsMat} onChange={(e) => setForm({ ...form, conditionsMat: e.target.value })} className="w-full rounded-md border border-gray-600 px-3 py-2 text-sm" rows={2} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Dynamique du groupe</label>
              <textarea value={form.dynamiqueGroupe} onChange={(e) => setForm({ ...form, dynamiqueGroupe: e.target.value })} className="w-full rounded-md border border-gray-600 px-3 py-2 text-sm" rows={2} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Suggestions</label>
            <textarea value={form.suggestions} onChange={(e) => setForm({ ...form, suggestions: e.target.value })} className="w-full rounded-md border border-gray-600 px-3 py-2 text-sm" rows={2} />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50">
              {saving ? "Envoi..." : "Envoyer le feedback"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-md border px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">Annuler</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" /></div>
      ) : feedbacks.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Aucun feedback soumis</div>
      ) : (
        <div className="space-y-4">
          {feedbacks.map((fb) => (
            <div key={fb.id} className="rounded-lg border bg-gray-800 p-5">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-gray-100">{fb.session.formation.titre}</h3>
                  <p className="text-xs text-gray-400">{formatDate(fb.session.dateDebut)} - Soumis le {formatDate(fb.createdAt)}</p>
                </div>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-4 w-4 ${i < fb.noteGlobale ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
                  ))}
                </div>
              </div>
              {fb.commentaire && <p className="text-sm text-gray-400 mb-2">{fb.commentaire}</p>}
              <div className="grid grid-cols-2 gap-3 text-xs">
                {fb.conditionsMat && <div><span className="font-medium text-gray-400">Conditions:</span> <span className="text-gray-400">{fb.conditionsMat}</span></div>}
                {fb.dynamiqueGroupe && <div><span className="font-medium text-gray-400">Dynamique:</span> <span className="text-gray-400">{fb.dynamiqueGroupe}</span></div>}
              </div>
              {fb.suggestions && <p className="text-xs text-gray-400 mt-2"><span className="font-medium">Suggestions:</span> {fb.suggestions}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
