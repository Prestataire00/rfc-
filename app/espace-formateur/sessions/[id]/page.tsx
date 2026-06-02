"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CalendarDays, MapPin, Users, ClipboardList, Send, Smile, Clock, Award, Sun, Sunset } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { StatutBadge } from "@/components/shared/StatutBadge";
import { SESSION_STATUTS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { useApi } from "@/hooks/useApi";
import { notify } from "@/lib/toast";
import { EmargementGrid } from "@/components/emargement/EmargementGrid";

type EvalType = "satisfaction_chaud" | "satisfaction_froid" | "acquis";

const EVAL_META: Record<EvalType, { label: string; description: string; icon: typeof Smile }> = {
  satisfaction_chaud: {
    label: "Satisfaction à chaud",
    description: "À envoyer juste après la formation (J ou J+1).",
    icon: Smile,
  },
  satisfaction_froid: {
    label: "Satisfaction à froid",
    description: "À envoyer ~3 semaines après pour mesurer l'application sur le terrain.",
    icon: Clock,
  },
  acquis: {
    label: "Évaluation des acquis",
    description: "À envoyer dès que la formation est terminée pour valider les compétences.",
    icon: Award,
  },
};

type Inscription = {
  id: string;
  statut: string;
  contact: { id: string; nom: string; prenom: string; email?: string };
};

type Session = {
  id: string;
  dateDebut: string;
  dateFin: string;
  lieu: string | null;
  statut: string;
  capaciteMax: number;
  formation: { titre: string; duree: number };
  inscriptions: Inscription[];
  _count: { inscriptions: number };
};

export default function FormateurSessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  // On reutilise /api/formateur/mes-sessions et on filtre cote client : pas besoin de creer un endpoint dedie.
  const { data, isLoading, error } = useApi<Session[]>("/api/formateur/mes-sessions");
  const sessions: Session[] = Array.isArray(data) ? data : [];
  const session = sessions.find((s) => s.id === id);

  const [sendingEval, setSendingEval] = useState<EvalType | null>(null);
  const [emargDate, setEmargDate] = useState<string>("");
  const [sendingEmarg, setSendingEmarg] = useState<"matin" | "apres_midi" | null>(null);

  const handleSendEmargement = async (creneau: "matin" | "apres_midi") => {
    if (!session) return;
    if (!emargDate) {
      notify.error("Sélectionnez d'abord une date de session");
      return;
    }
    const stagiairesCount = session.inscriptions.filter((i) => ["confirmee", "presente"].includes(i.statut)).length;
    if (stagiairesCount === 0) {
      notify.error("Aucun stagiaire confirmé sur cette session");
      return;
    }
    const creneauLabel = creneau === "matin" ? "matin" : "après-midi";
    if (!window.confirm(`Envoyer la feuille de présence du ${creneauLabel} (${emargDate}) à ${stagiairesCount} stagiaire${stagiairesCount > 1 ? "s" : ""} ?`)) {
      return;
    }
    setSendingEmarg(creneau);
    try {
      const res = await fetch(`/api/formateur/sessions/${id}/envoyer-emargement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: emargDate, creneau }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Échec de l'envoi");
      const parts: string[] = [];
      if (json.sent) parts.push(`${json.sent} envoyé${json.sent > 1 ? "s" : ""}`);
      if (json.skipped) parts.push(`${json.skipped} ignoré${json.skipped > 1 ? "s" : ""} (token déjà actif)`);
      notify.success(`Feuille de présence ${creneauLabel} ${emargDate}`, parts.join(" · "));
      if (json.errors && json.errors.length > 0) {
        const lines = (json.errors as { stagiaire: string; raison: string }[])
          .map((e) => `${e.stagiaire} : ${e.raison}`)
          .join("\n");
        notify.error("Quelques échecs", lines);
      }
    } catch (err) {
      notify.error("Erreur", err instanceof Error ? err.message : "Envoi impossible");
    } finally {
      setSendingEmarg(null);
    }
  };

  // Liste des jours ouvrés de la session pour le sélecteur de date d'émargement.
  // On bornoie [dateDebut, dateFin] et on génère chaque jour intermédiaire.
  const sessionDays: string[] = (() => {
    if (!session) return [];
    const out: string[] = [];
    const start = new Date(session.dateDebut);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(session.dateFin);
    end.setUTCHours(0, 0, 0, 0);
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      out.push(d.toISOString().slice(0, 10));
    }
    return out;
  })();

  const handleSendEval = async (type: EvalType) => {
    if (!session) return;
    const stagiairesCount = session.inscriptions.filter((i) => ["confirmee", "presente"].includes(i.statut)).length;
    if (stagiairesCount === 0) {
      notify.error("Aucun stagiaire confirmé sur cette session");
      return;
    }
    const meta = EVAL_META[type];
    if (!window.confirm(`Envoyer le questionnaire « ${meta.label} » à ${stagiairesCount} stagiaire${stagiairesCount > 1 ? "s" : ""} ?`)) {
      return;
    }
    setSendingEval(type);
    try {
      const res = await fetch(`/api/formateur/sessions/${id}/envoyer-evaluations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Échec de l'envoi");
      const parts: string[] = [];
      if (json.sent) parts.push(`${json.sent} envoyé${json.sent > 1 ? "s" : ""}`);
      if (json.created) parts.push(`${json.created} questionnaire${json.created > 1 ? "s" : ""} créé${json.created > 1 ? "s" : ""}`);
      if (json.skipped) parts.push(`${json.skipped} ignoré${json.skipped > 1 ? "s" : ""}`);
      notify.success(`Questionnaires « ${meta.label} »`, parts.join(" · "));
      if (json.errors && json.errors.length > 0) {
        const lines = (json.errors as { stagiaire: string; raison: string }[])
          .map((e) => `${e.stagiaire} : ${e.raison}`)
          .join("\n");
        notify.error("Quelques échecs", lines);
      }
    } catch (err) {
      notify.error("Erreur", err instanceof Error ? err.message : "Envoi impossible");
    } finally {
      setSendingEval(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="py-12">
        <Link href="/espace-formateur/sessions" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200 mb-4">
          <ArrowLeft className="h-4 w-4" /> Retour
        </Link>
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-6 text-center">
          <p className="text-gray-300">Session introuvable ou vous n&apos;y etes pas assigne.</p>
        </div>
      </div>
    );
  }

  const st = SESSION_STATUTS[session.statut as keyof typeof SESSION_STATUTS];
  const canEmarger = ["confirmee", "en_cours", "terminee"].includes(session.statut);
  const stagiairesActifs = session.inscriptions.filter((i) => ["confirmee", "en_attente", "presente"].includes(i.statut));

  return (
    <div>
      <Breadcrumb
        items={[
          { label: "Mes sessions", href: "/espace-formateur/sessions" },
          { label: session.formation?.titre || "Session" },
        ]}
      />

      <Link
        href="/espace-formateur/sessions"
        className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200 mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Mes sessions
      </Link>

      <PageHeader
        title={session.formation.titre}
        description={`${formatDate(session.dateDebut)} - ${formatDate(session.dateFin)}`}
      />

      <div className="rounded-lg border border-gray-700 bg-gray-800 p-5 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <CalendarDays className="h-4 w-4 text-red-400" />
              {formatDate(session.dateDebut)} &mdash; {formatDate(session.dateFin)} ({session.formation.duree}h)
            </div>
            {session.lieu && (
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <MapPin className="h-4 w-4 text-red-400" />
                {session.lieu}
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Users className="h-4 w-4 text-red-400" />
              {session._count.inscriptions} / {session.capaciteMax} participants
            </div>
          </div>
          {st && <StatutBadge label={st.label} color={st.color} />}
        </div>

        {stagiairesActifs.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <p className="text-xs font-medium text-gray-400 mb-2">Stagiaires inscrits :</p>
            <div className="flex flex-wrap gap-2">
              {stagiairesActifs.map((insc) => (
                <span
                  key={insc.id}
                  className="inline-flex rounded-full bg-gray-700 px-2.5 py-0.5 text-xs text-gray-200"
                >
                  {insc.contact.prenom} {insc.contact.nom}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {canEmarger && stagiairesActifs.length > 0 && (
        <div className="rounded-lg border border-gray-700 bg-gray-800 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <h2 className="font-semibold text-gray-100 flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-green-500" />
              Emargement
            </h2>
          </div>
          <div className="p-4">
            <EmargementGrid
              sessionId={session.id}
              dateDebut={session.dateDebut}
              dateFin={session.dateFin}
              inscriptions={session.inscriptions}
              formationTitre={session.formation.titre}
              apiBasePath="/api/formateur/sessions"
            />
          </div>
        </div>
      )}

      {!canEmarger && (
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-5 text-center text-sm text-gray-400">
          L&apos;emargement sera disponible une fois la session confirmee.
        </div>
      )}

      {/* Envoi manuel des feuilles de présence (en complément du cron auto) */}
      {stagiairesActifs.length > 0 && sessionDays.length > 0 && (
        <div className="mt-6 rounded-lg border border-gray-700 bg-gray-800 p-5">
          <div className="mb-4">
            <h2 className="font-semibold text-gray-100 flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-red-400" />
              Envoyer une feuille de présence
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Envoi automatique chaque jour ouvré à 09:30 (matin) et 14:30 (après-midi).
              Tu peux aussi déclencher l&apos;envoi manuellement ci-dessous (utile en cas de rattrapage,
              session le weekend, ou si un stagiaire dit ne pas avoir reçu l&apos;email).
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-gray-300 mb-1">Jour de session</label>
              <select
                value={emargDate}
                onChange={(e) => setEmargDate(e.target.value)}
                className="w-full h-10 rounded-md border border-gray-600 bg-gray-900 px-3 text-sm text-gray-100"
              >
                <option value="">— Choisir une date —</option>
                {sessionDays.map((d) => (
                  <option key={d} value={d}>{new Date(d).toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => handleSendEmargement("matin")}
              disabled={!emargDate || sendingEmarg !== null}
              className="inline-flex items-center gap-2 rounded-md bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-white transition-colors"
            >
              <Sun className="h-4 w-4" /> {sendingEmarg === "matin" ? "Envoi…" : "Envoyer matin"}
            </button>
            <button
              type="button"
              onClick={() => handleSendEmargement("apres_midi")}
              disabled={!emargDate || sendingEmarg !== null}
              className="inline-flex items-center gap-2 rounded-md bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-white transition-colors"
            >
              <Sunset className="h-4 w-4" /> {sendingEmarg === "apres_midi" ? "Envoi…" : "Envoyer après-midi"}
            </button>
          </div>
        </div>
      )}

      {/* Envoi de questionnaires d'évaluation aux stagiaires */}
      {stagiairesActifs.length > 0 && (
        <div className="mt-6 rounded-lg border border-gray-700 bg-gray-800 p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-100 flex items-center gap-2">
                <Send className="h-4 w-4 text-red-400" />
                Envoyer des questionnaires
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Les stagiaires recevront un lien unique pour répondre depuis leur boîte mail.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(Object.keys(EVAL_META) as EvalType[]).map((type) => {
              const meta = EVAL_META[type];
              const Icon = meta.icon;
              const busy = sendingEval === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleSendEval(type)}
                  disabled={sendingEval !== null}
                  className="text-left rounded-md border border-gray-600 bg-gray-900/60 hover:border-red-500 hover:bg-gray-900 p-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="h-4 w-4 text-red-400" />
                    <span className="text-sm font-semibold text-gray-100">{meta.label}</span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-snug">{meta.description}</p>
                  <p className="text-[11px] text-red-400 mt-2 font-medium">
                    {busy ? "Envoi en cours…" : `Envoyer à ${stagiairesActifs.length} stagiaire${stagiairesActifs.length > 1 ? "s" : ""}`}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
