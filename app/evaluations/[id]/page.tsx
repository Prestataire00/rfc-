"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Star, User, BookOpen, Calendar, MessageSquare, CheckCircle, Clock } from "lucide-react";
import { EVALUATION_TYPES } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

type Evaluation = {
  id: string;
  type: string;
  cible: string;
  noteGlobale: number | null;
  estComplete: boolean;
  commentaire: string | null;
  reponses: string;
  tokenAcces: string | null;
  createdAt: string;
  session: {
    id: string;
    dateDebut?: string;
    dateFin?: string;
    formation: { id: string; titre: string };
    formateur: { id: string; nom: string; prenom: string } | null;
  };
  contact: { id: string; nom: string; prenom: string; email: string } | null;
};

type ReponseItem = {
  question?: string;
  label?: string;
  note?: number;
  score?: number;
  value?: string | number;
  reponse?: string;
};

export default function EvaluationDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/evaluations/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Évaluation introuvable");
        return r.json();
      })
      .then((data) => {
        setEvaluation(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !evaluation) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-400 mb-4">{error || "Évaluation introuvable"}</p>
        <Link href="/evaluations" className="text-red-500 hover:underline">
          Retour aux évaluations
        </Link>
      </div>
    );
  }

  const typeLabel =
    EVALUATION_TYPES[evaluation.type as keyof typeof EVALUATION_TYPES]?.label || evaluation.type;

  let reponses: ReponseItem[] = [];
  try {
    const parsed = JSON.parse(evaluation.reponses);
    if (Array.isArray(parsed)) {
      reponses = parsed;
    } else if (typeof parsed === "object" && parsed !== null) {
      reponses = Object.entries(parsed).map(([key, val]) => {
        if (typeof val === "object" && val !== null) {
          return { question: key, ...(val as Record<string, unknown>) } as ReponseItem;
        }
        return { question: key, value: val } as ReponseItem;
      });
    }
  } catch {
    // reponses stays empty
  }

  return (
    <div className="max-w-4xl">
      <Link
        href="/evaluations"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-200 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux évaluations
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 mb-2">
            {typeLabel}
          </h1>
          <p className="text-gray-400">
            {evaluation.session.formation.titre}
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${
            evaluation.estComplete
              ? "bg-green-900/30 text-green-400"
              : "bg-gray-700 text-gray-400"
          }`}
        >
          {evaluation.estComplete ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <Clock className="h-4 w-4" />
          )}
          {evaluation.estComplete ? "Complétée" : "En attente"}
        </span>
      </div>

      {/* Info cards row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Note globale */}
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-5">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
            <Star className="h-4 w-4" />
            Note globale
          </div>
          {evaluation.noteGlobale ? (
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold text-amber-400">{evaluation.noteGlobale}</span>
              <span className="text-gray-400 text-lg">/5</span>
              <div className="flex ml-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 ${
                      i < evaluation.noteGlobale!
                        ? "fill-amber-400 text-amber-400"
                        : "text-gray-600"
                    }`}
                  />
                ))}
              </div>
            </div>
          ) : (
            <p className="text-gray-500">Aucune note</p>
          )}
        </div>

        {/* Répondant */}
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-5">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
            <User className="h-4 w-4" />
            Répondant
          </div>
          {evaluation.contact ? (
            <div>
              <p className="text-gray-100 font-medium">
                {evaluation.contact.prenom} {evaluation.contact.nom}
              </p>
              <p className="text-gray-400 text-sm">{evaluation.contact.email}</p>
            </div>
          ) : (
            <p className="text-gray-500">Non renseigné</p>
          )}
          <p className="text-gray-500 text-xs mt-2 capitalize">Cible : {evaluation.cible}</p>
        </div>

        {/* Session / Formation */}
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-5">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
            <BookOpen className="h-4 w-4" />
            Session
          </div>
          <Link
            href={`/sessions/${evaluation.session.id}`}
            className="text-red-500 hover:underline font-medium"
          >
            {evaluation.session.formation.titre}
          </Link>
          {evaluation.session.formateur && (
            <p className="text-gray-400 text-sm mt-1">
              Formateur : {evaluation.session.formateur.prenom} {evaluation.session.formateur.nom}
            </p>
          )}
        </div>
      </div>

      {/* Date */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-8">
        <Calendar className="h-4 w-4" />
        Créée le {formatDate(evaluation.createdAt)}
      </div>

      {/* Réponses détaillées */}
      {reponses.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Réponses détaillées
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reponses.map((item, idx) => {
              const label = item.question || item.label || `Question ${idx + 1}`;
              const score = item.note ?? item.score ?? item.value;
              const isNumeric = typeof score === "number";
              const textAnswer = item.reponse || (typeof item.value === "string" ? item.value : null);

              return (
                <div
                  key={idx}
                  className="rounded-lg border border-gray-700 bg-gray-800 p-4"
                >
                  <p className="text-sm text-gray-400 mb-2">{label}</p>
                  {isNumeric && (
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-gray-100">{score}</span>
                      {typeof score === "number" && score <= 5 && (
                        <div className="flex">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < (score as number)
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-gray-600"
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {textAnswer && (
                    <p className="text-gray-300 text-sm mt-1">{textAnswer}</p>
                  )}
                  {!isNumeric && !textAnswer && (
                    <p className="text-gray-500 text-sm">—</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Commentaire */}
      {evaluation.commentaire && (
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-5">
          <h2 className="text-lg font-semibold text-gray-100 mb-3 flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Commentaire
          </h2>
          <p className="text-gray-300 whitespace-pre-wrap">{evaluation.commentaire}</p>
        </div>
      )}
    </div>
  );
}
