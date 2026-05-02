"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, Users, BookOpen } from "lucide-react";
import { Question } from "../../TemplateBuilder";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/fetcher";

type Template = {
  id: string;
  nom: string;
  description: string | null;
  type: string;
  questions: string;
};

type Session = {
  id: string;
  dateDebut: string;
  formation: { titre: string };
};

type Contact = {
  id: string;
  nom: string;
  prenom: string;
  email: string;
};

export default function UtiliserModelePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: template, isLoading: templateLoading } = useApi<Template>(
    id ? `/api/evaluation-templates/${id}` : null
  );
  const { data: sessionsRaw, isLoading: sessionsLoading } = useApi<Session[] | { sessions: Session[] }>("/api/sessions?limit=50");
  const { data: contactsRaw, isLoading: contactsLoading } = useApi<Contact[] | { contacts: Contact[] }>("/api/contacts?limit=100");
  const sessions: Session[] = Array.isArray(sessionsRaw) ? sessionsRaw : (sessionsRaw?.sessions ?? []);
  const contacts: Contact[] = Array.isArray(contactsRaw) ? contactsRaw : (contactsRaw?.contacts ?? []);
  const loading = templateLoading || sessionsLoading || contactsLoading;

  const [selectedSession, setSelectedSession] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [cible, setCible] = useState("stagiaire");
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<{ id: string; token: string }[]>([]);
  const [error, setError] = useState("");
  const [baseUrl, setBaseUrl] = useState("");

  useEffect(() => {
    setBaseUrl(window.location.origin);
  }, []);

  const toggleContact = (cid: string) => {
    setSelectedContacts((prev) =>
      prev.includes(cid) ? prev.filter((x) => x !== cid) : [...prev, cid]
    );
  };

  const handleSubmit = async () => {
    if (!selectedSession) { setError("Sélectionnez une session."); return; }
    if (selectedContacts.length === 0) { setError("Sélectionnez au moins un contact."); return; }
    setSubmitting(true);
    setError("");

    let questions: Question[] = [];
    try { questions = JSON.parse(template!.questions); } catch { questions = []; }

    // Build initial reponses structure (empty answers)
    const reponsesInitiales = questions.map((q) => ({
      id: q.id,
      label: q.label,
      type: q.type,
      required: q.required,
      options: q.options || [],
      valeur: null,
    }));

    const results: { id: string; token: string }[] = [];

    for (const contactId of selectedContacts) {
      try {
        const data = await api.post<{ id: string; tokenAcces: string }>("/api/evaluations", {
          type: template!.type,
          cible,
          sessionId: selectedSession,
          contactId,
          reponses: JSON.stringify(reponsesInitiales),
        });
        results.push({ id: data.id, token: data.tokenAcces });
      } catch {
        // Skip failures (preserves prior behavior: only push successful results)
      }
    }

    setCreated(results);
    setSubmitting(false);
  };

  if (loading) {
    return <div className="flex justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" /></div>;
  }

  if (!template) return null;

  let questions: Question[] = [];
  try { questions = JSON.parse(template.questions); } catch { questions = []; }

  if (created.length > 0) {
    return (
      <div className="max-w-2xl">
        <div className="rounded-xl border border-green-700 bg-green-900/20 p-6">
          <h2 className="text-lg font-semibold text-green-400 mb-2">Évaluations créées !</h2>
          <p className="text-sm text-gray-400 mb-4">{created.length} évaluation{created.length > 1 ? "s" : ""} créée{created.length > 1 ? "s" : ""}. Voici les liens d&apos;accès :</p>
          <div className="space-y-2">
            {created.map((e, i) => (
              <div key={e.id} className="flex items-center gap-3 rounded-md bg-gray-800 px-3 py-2">
                <span className="text-xs text-gray-500 w-4">#{i + 1}</span>
                <input
                  readOnly
                  value={`${baseUrl}/evaluation/${e.token}`}
                  className="flex-1 bg-transparent text-xs text-gray-300 font-mono focus:outline-none"
                  onClick={(ev) => (ev.target as HTMLInputElement).select()}
                />
                <button
                  onClick={() => navigator.clipboard.writeText(`${baseUrl}/evaluation/${e.token}`)}
                  className="text-xs text-red-400 hover:text-red-300 shrink-0"
                >
                  Copier
                </button>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-3">
            <Link href="/evaluations" className="text-sm text-red-400 hover:underline">
              Voir les évaluations
            </Link>
            <button
              onClick={() => { setCreated([]); setSelectedContacts([]); }}
              className="text-sm text-gray-400 hover:text-gray-200"
            >
              Créer d&apos;autres
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <Link href="/evaluations/modeles" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-200 mb-6">
        <ArrowLeft className="h-4 w-4" />
        Retour aux modèles
      </Link>

      <h1 className="text-2xl font-bold text-gray-100 mb-1">Envoyer une évaluation</h1>
      <p className="text-gray-400 mb-8">Modèle : <span className="text-gray-200 font-medium">{template.nom}</span></p>

      {/* Aperçu questions */}
      <div className="rounded-xl border border-gray-700 bg-gray-800 p-5 mb-6">
        <div className="flex items-center gap-2 mb-3 text-sm font-medium text-gray-300">
          <BookOpen className="h-4 w-4" />
          {questions.length} question{questions.length !== 1 ? "s" : ""}
        </div>
        <div className="space-y-1">
          {questions.map((q, i) => (
            <div key={q.id} className="flex items-center gap-2 text-sm text-gray-400">
              <span className="text-gray-600 text-xs w-5">{i + 1}.</span>
              <span>{q.label}</span>
              <span className="ml-auto text-xs text-gray-600">
                {q.type === "note" ? "⭐ Note" : q.type === "texte" ? "✏️ Texte" : q.type === "oui_non" ? "✅ Oui/Non" : "📋 Choix"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Session */}
      <div className="rounded-xl border border-gray-700 bg-gray-800 p-5 mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          Session de formation *
        </label>
        <select
          value={selectedSession}
          onChange={(e) => setSelectedSession(e.target.value)}
          className="w-full rounded-md border border-gray-600 bg-gray-900 text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          <option value="">-- Choisir une session --</option>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.formation.titre} — {new Date(s.dateDebut).toLocaleDateString("fr-FR")}
            </option>
          ))}
        </select>
      </div>

      {/* Cible */}
      <div className="rounded-xl border border-gray-700 bg-gray-800 p-5 mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">Destinataires (cible)</label>
        <div className="flex gap-3">
          {["stagiaire", "client", "formateur"].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCible(c)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium border transition-colors capitalize ${
                cible === c
                  ? "bg-red-600 border-red-600 text-white"
                  : "border-gray-600 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Contacts */}
      <div className="rounded-xl border border-gray-700 bg-gray-800 p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <Users className="h-4 w-4" />
            Contacts *
          </label>
          <button
            type="button"
            onClick={() =>
              setSelectedContacts(
                selectedContacts.length === contacts.length ? [] : contacts.map((c) => c.id)
              )
            }
            className="text-xs text-red-400 hover:text-red-300"
          >
            {selectedContacts.length === contacts.length ? "Tout désélectionner" : "Tout sélectionner"}
          </button>
        </div>
        <div className="max-h-56 overflow-y-auto space-y-1">
          {contacts.map((c) => (
            <label key={c.id} className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedContacts.includes(c.id)}
                onChange={() => toggleContact(c.id)}
                className="rounded border-gray-600 bg-gray-800 text-red-600 focus:ring-red-500"
              />
              <span className="text-sm text-gray-300">{c.prenom} {c.nom}</span>
              <span className="text-xs text-gray-500 ml-auto">{c.email}</span>
            </label>
          ))}
        </div>
        {selectedContacts.length > 0 && (
          <p className="text-xs text-gray-500 mt-2">{selectedContacts.length} contact{selectedContacts.length > 1 ? "s" : ""} sélectionné{selectedContacts.length > 1 ? "s" : ""}</p>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-900/20 border border-red-700 px-4 py-2 text-sm text-red-400">{error}</div>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="inline-flex items-center gap-2 rounded-md bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
      >
        <Send className="h-4 w-4" />
        {submitting ? "Création en cours..." : "Créer les évaluations"}
      </button>
    </div>
  );
}
