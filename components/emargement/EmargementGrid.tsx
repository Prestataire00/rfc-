"use client";

// Grille d'émargement multi-jours × matin/après-midi.
// Refonte UI 2026-06 : compatible light+dark, libellés explicites, états
// présence/absence visuellement clairs, bouton "Tous présents" lisible,
// légende inline pour décoder les badges colorés.

import { useState, useEffect, useCallback } from "react";
import { Users, QrCode, Send, CheckCircle2, RefreshCw, Check, X, Sun, Sunset } from "lucide-react";
import { StatutBadge } from "./StatutSelector";
import { QrCodePresence } from "./QrCodePresence";
import { format, eachDayOfInterval } from "date-fns";
import { fr } from "date-fns/locale";

type PresenceRecord = {
  id: string;
  date: string;
  contactId: string;
  matin: boolean;
  apresMidi: boolean;
  statutMatin: string | null;
  statutApresMidi: string | null;
  retardMinutes: number | null;
  departMinutes: number | null;
  signatureMatin: string | null;
  signatureApresMidi: string | null;
  contact: { nom: string; prenom: string };
};

type EmargementTokenData = {
  id: string;
  date: string;
  creneau: string;
  token: string;
  expiresAt: string;
};

type Inscription = {
  id: string;
  contactId?: string;
  contact: { id: string; nom: string; prenom: string; email?: string };
  statut: string;
};

type Props = {
  sessionId: string;
  dateDebut: string;
  dateFin: string;
  inscriptions: Inscription[];
  formationTitre?: string;
  /** Base path for presence + emargement endpoints. Defaults to "/api/sessions" (admin).
   *  Use "/api/formateur/sessions" for the formateur space. */
  apiBasePath?: string;
  /** Hide actions reserved to admin/formateur (QR generation, bulk, send OTP). Default false. */
  readOnly?: boolean;
};

const CRENEAUX = [
  { key: "matin" as const, label: "Matin", labelShort: "Matin", icon: Sun },
  { key: "apres_midi" as const, label: "Après-midi", labelShort: "AM", icon: Sunset },
];

export function EmargementGrid({
  sessionId,
  dateDebut,
  dateFin,
  inscriptions,
  formationTitre,
  apiBasePath = "/api/sessions",
  readOnly = false,
}: Props) {
  const [presences, setPresences] = useState<PresenceRecord[]>([]);
  const [tokens, setTokens] = useState<EmargementTokenData[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingOtp, setSendingOtp] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const days = eachDayOfInterval({
    start: new Date(dateDebut),
    end: new Date(dateFin),
  }).slice(0, 5); // max 5 jours pour la lisibilité

  const fetchData = useCallback(async () => {
    const [presRes, tokRes] = await Promise.all([
      fetch(`${apiBasePath}/${sessionId}/presence`).then((r) => (r.ok ? r.json() : [])),
      fetch(`${apiBasePath}/${sessionId}/emargement`).then((r) => (r.ok ? r.json() : [])),
    ]);
    setPresences(Array.isArray(presRes) ? presRes : []);
    setTokens(Array.isArray(tokRes) ? tokRes : []);
    setLoading(false);
  }, [sessionId, apiBasePath]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getPresence = (contactId: string, dateStr: string) =>
    presences.find((p) => p.contactId === contactId && p.date.startsWith(dateStr));

  const getToken = (dateStr: string, creneau: string) =>
    tokens.find((t) => t.date.startsWith(dateStr) && t.creneau === creneau);

  const generateTokens = async () => {
    setLoading(true);
    await fetch(`${apiBasePath}/${sessionId}/emargement`, { method: "POST" });
    await fetchData();
  };

  const handleBulk = async (dateStr: string, creneau: string) => {
    setBulkLoading(true);
    await fetch(`${apiBasePath}/${sessionId}/presence/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: dateStr, creneau }),
    });
    await fetchData();
    setBulkLoading(false);
    setMsg("Tous marqués présents");
    setTimeout(() => setMsg(""), 2000);
  };

  const handleSendOtp = async (contactId: string, dateStr: string, creneau: string) => {
    setSendingOtp(`${contactId}-${dateStr}-${creneau}`);
    const res = await fetch("/api/emargement/otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, contactId, date: dateStr, creneau }),
    });
    if (res.ok) {
      setMsg("Lien d'émargement envoyé");
      setTimeout(() => setMsg(""), 2500);
    }
    setSendingOtp(null);
  };

  const handleToggle = async (
    contactId: string,
    dateStr: string,
    field: "matin" | "apresMidi",
    current: boolean,
  ) => {
    // PATCH ciblé sur le seul créneau cliqué : pose un statut explicite
    // (present / absent) sans toucher l'autre demi-journée. Le statut "absent"
    // désactive le lien de signature du stagiaire pour ce créneau ; re-cocher
    // (present) le réactive.
    const creneau = field === "matin" ? "matin" : "apres_midi";
    await fetch(`${apiBasePath}/${sessionId}/presence`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contactId,
        date: dateStr,
        creneau,
        statut: !current ? "present" : "absent",
      }),
    });
    await fetchData();
  };

  const activeInscrits = inscriptions.filter((i) =>
    ["confirmee", "en_attente", "presente"].includes(i.statut),
  );

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Actions globales + message flash */}
      {!readOnly && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {tokens.length === 0 ? (
              <button
                onClick={generateTokens}
                className="inline-flex items-center gap-1.5 rounded-md bg-red-600 hover:bg-red-700 px-3 py-1.5 text-xs font-medium text-white shadow-sm"
              >
                <QrCode className="h-3.5 w-3.5" /> Générer les QR codes
              </button>
            ) : (
              <button
                onClick={fetchData}
                className="inline-flex items-center gap-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2.5 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <RefreshCw className="h-3 w-3" /> Rafraîchir
              </button>
            )}
          </div>
          {msg && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
              <CheckCircle2 className="h-3 w-3" /> {msg}
            </span>
          )}
        </div>
      )}

      {/* Grille */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400 sticky left-0 bg-gray-50 dark:bg-gray-900 z-10 min-w-[180px]">
                Stagiaire
              </th>
              {days.map((day) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const dayLabel = format(day, "EEE dd MMM", { locale: fr });
                return (
                  <th
                    key={dateStr}
                    colSpan={2}
                    className="text-center px-2 py-3 font-medium text-gray-700 dark:text-gray-300 border-l border-gray-200 dark:border-gray-700"
                  >
                    <div className="text-xs uppercase tracking-wide mb-1.5">{dayLabel}</div>
                    {/* Sous-en-têtes Matin / Après-midi avec QR + Tous présents */}
                    <div className="grid grid-cols-2 gap-1">
                      {CRENEAUX.map((cr) => {
                        const tk = getToken(dateStr, cr.key);
                        const CIcon = cr.icon;
                        return (
                          <div
                            key={cr.key}
                            className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-1.5 flex flex-col items-center gap-1"
                          >
                            <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-700 dark:text-gray-300">
                              <CIcon className="h-3 w-3" /> {cr.label}
                            </div>
                            {tk && (
                              <QrCodePresence
                                token={tk.token}
                                date={dateStr}
                                creneau={cr.key}
                                formationTitre={formationTitre}
                              />
                            )}
                            {!readOnly && (
                              <button
                                onClick={() => handleBulk(dateStr, cr.key)}
                                disabled={bulkLoading}
                                className="inline-flex items-center gap-1 rounded-sm bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 px-1.5 py-0.5 text-[9px] font-medium disabled:opacity-40 transition-colors"
                                title={`Marquer tous les stagiaires présents le ${dayLabel} ${cr.label}`}
                              >
                                <Users className="h-2.5 w-2.5" /> Tous présents
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </th>
                );
              })}
              <th className="px-3 py-3 text-center font-medium text-gray-600 dark:text-gray-400 border-l border-gray-200 dark:border-gray-700 min-w-[90px]">
                <div className="text-xs">Lien email</div>
                <div className="text-[9px] text-gray-500 dark:text-gray-500 mt-0.5">
                  pour signer
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {activeInscrits.map((insc, rowIdx) => (
              <tr
                key={insc.contact.id}
                className={`border-b border-gray-200 dark:border-gray-700 last:border-0 ${
                  rowIdx % 2 === 1 ? "bg-gray-50/50 dark:bg-gray-900/30" : ""
                } hover:bg-gray-100/60 dark:hover:bg-gray-700/40 transition-colors`}
              >
                <td className="px-4 py-3 sticky left-0 z-10 bg-inherit">
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {insc.contact.prenom} {insc.contact.nom}
                  </div>
                  {insc.contact.email && (
                    <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[180px]">
                      {insc.contact.email}
                    </div>
                  )}
                </td>
                {days.map((day) => {
                  const dateStr = format(day, "yyyy-MM-dd");
                  const p = getPresence(insc.contact.id, dateStr);
                  return CRENEAUX.map((cr) => {
                    const slot = cr.key === "matin" ? "matin" : "apresMidi";
                    const statutField = slot === "matin" ? "statutMatin" : "statutApresMidi";
                    const sigField = slot === "matin" ? "signatureMatin" : "signatureApresMidi";
                    const statut = p?.[statutField as keyof PresenceRecord] as string | null;
                    const sig = p?.[sigField as keyof PresenceRecord] as string | null;
                    const boolField = slot === "matin" ? "matin" : "apresMidi";
                    const boolVal = p?.[boolField as keyof PresenceRecord] as boolean | undefined;
                    const retard = slot === "matin" ? p?.retardMinutes : null;
                    const depart = slot !== "matin" ? p?.departMinutes : null;

                    return (
                      <td
                        key={`${dateStr}-${cr.key}`}
                        className="px-2 py-2 text-center border-l border-gray-200 dark:border-gray-700"
                      >
                        {statut ? (
                          <div className="flex flex-col items-center gap-1">
                            <StatutBadge
                              statut={statut}
                              retardMinutes={retard}
                              departMinutes={depart}
                            />
                            {sig && (
                              <div
                                className="w-10 h-5 rounded border border-gray-300 dark:border-gray-600 overflow-hidden bg-white"
                                title="Signature reçue"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={sig} alt="signature" className="w-full h-full object-contain" />
                              </div>
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              handleToggle(
                                insc.contact.id,
                                dateStr,
                                slot as "matin" | "apresMidi",
                                !!boolVal,
                              )
                            }
                            disabled={readOnly}
                            className={`inline-flex items-center justify-center h-7 w-7 rounded-md border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                              boolVal
                                ? "bg-emerald-500 border-emerald-600 text-white hover:bg-emerald-600 shadow-sm"
                                : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400 hover:border-emerald-400 hover:text-emerald-500"
                            }`}
                            title={boolVal ? "Présent — cliquer pour décocher" : "Absent — cliquer pour marquer présent"}
                          >
                            {boolVal ? (
                              <Check className="h-4 w-4" strokeWidth={3} />
                            ) : (
                              <X className="h-3.5 w-3.5 opacity-40" />
                            )}
                          </button>
                        )}
                      </td>
                    );
                  });
                })}
                <td className="px-2 py-2 text-center border-l border-gray-200 dark:border-gray-700">
                  {!readOnly && (
                    <button
                      onClick={() => {
                        const today = format(new Date(), "yyyy-MM-dd");
                        const hour = new Date().getHours();
                        const creneau = hour < 13 ? "matin" : "apres_midi";
                        handleSendOtp(insc.contact.id, today, creneau);
                      }}
                      disabled={
                        sendingOtp ===
                        `${insc.contact.id}-${format(new Date(), "yyyy-MM-dd")}-${new Date().getHours() < 13 ? "matin" : "apres_midi"}`
                      }
                      className="inline-flex items-center gap-1 rounded-md border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 px-2 py-1 text-[11px] font-medium disabled:opacity-40 transition-colors"
                      title="Envoyer le lien d'émargement par email (signature à distance)"
                    >
                      <Send className="h-3 w-3" /> Envoyer
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {activeInscrits.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6 italic">
          Aucun stagiaire inscrit.
        </p>
      )}

      {/* Légende */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 dark:text-gray-400 px-1">
        <span className="font-medium uppercase tracking-wide">Légende :</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-emerald-500 text-white">
            <Check className="h-3 w-3" strokeWidth={3} />
          </span>
          Présent
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
            <X className="h-2.5 w-2.5 text-gray-400" />
          </span>
          Non émargé
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-emerald-500 border border-emerald-200 dark:border-emerald-700 text-white">
            <Users className="h-3 w-3" />
          </span>
          Bouton « Tous présents » (marque toute la promo en 1 clic)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Send className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          Envoyer lien email (signature à distance par OTP)
        </span>
      </div>
    </div>
  );
}
