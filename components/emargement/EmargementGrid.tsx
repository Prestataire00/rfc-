"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, QrCode, Send, CheckCircle2, RefreshCw } from "lucide-react";
import { StatutBadge, type PresenceStatut } from "./StatutSelector";
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
  contactId: string;
  contact: { id: string; nom: string; prenom: string; email: string };
  statut: string;
};

type Props = {
  sessionId: string;
  dateDebut: string;
  dateFin: string;
  inscriptions: Inscription[];
  formationTitre?: string;
};

export function EmargementGrid({ sessionId, dateDebut, dateFin, inscriptions, formationTitre }: Props) {
  const [presences, setPresences] = useState<PresenceRecord[]>([]);
  const [tokens, setTokens] = useState<EmargementTokenData[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingOtp, setSendingOtp] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const days = eachDayOfInterval({
    start: new Date(dateDebut),
    end: new Date(dateFin),
  }).slice(0, 5); // max 5 jours pour la lisibilite

  const fetchData = useCallback(async () => {
    const [presRes, tokRes] = await Promise.all([
      fetch(`/api/sessions/${sessionId}/presence`).then((r) => r.ok ? r.json() : []),
      fetch(`/api/sessions/${sessionId}/emargement`).then((r) => r.ok ? r.json() : []),
    ]);
    setPresences(Array.isArray(presRes) ? presRes : []);
    setTokens(Array.isArray(tokRes) ? tokRes : []);
    setLoading(false);
  }, [sessionId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getPresence = (contactId: string, dateStr: string) => {
    return presences.find((p) => p.contactId === contactId && p.date.startsWith(dateStr));
  };

  const getToken = (dateStr: string, creneau: string) => {
    return tokens.find((t) => t.date.startsWith(dateStr) && t.creneau === creneau);
  };

  const generateTokens = async () => {
    setLoading(true);
    await fetch(`/api/sessions/${sessionId}/emargement`, { method: "POST" });
    await fetchData();
  };

  const handleBulk = async (dateStr: string, creneau: string) => {
    setBulkLoading(true);
    await fetch(`/api/sessions/${sessionId}/presence/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: dateStr, creneau }),
    });
    await fetchData();
    setBulkLoading(false);
    setMsg("Tous presents");
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
      setMsg("Lien OTP envoye");
      setTimeout(() => setMsg(""), 2500);
    }
    setSendingOtp(null);
  };

  const handleToggleV1 = async (contactId: string, dateStr: string, field: "matin" | "apresMidi", current: boolean) => {
    const presence = getPresence(contactId, dateStr);
    await fetch(`/api/sessions/${sessionId}/presence`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contactId,
        date: dateStr,
        matin: field === "matin" ? !current : (presence?.matin ?? false),
        apresMidi: field === "apresMidi" ? !current : (presence?.apresMidi ?? false),
      }),
    });
    await fetchData();
  };

  const activeInscrits = inscriptions.filter((i) => ["confirmee", "en_attente", "presente"].includes(i.statut));

  if (loading) {
    return <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-red-600 border-t-transparent" /></div>;
  }

  return (
    <div>
      {/* Actions globales */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          {tokens.length === 0 ? (
            <button
              onClick={generateTokens}
              className="inline-flex items-center gap-1.5 rounded-md bg-red-600 hover:bg-red-700 px-3 py-1.5 text-xs font-medium text-white"
            >
              <QrCode className="h-3.5 w-3.5" /> Generer les QR codes
            </button>
          ) : (
            <button
              onClick={fetchData}
              className="inline-flex items-center gap-1 rounded-md border border-gray-600 bg-gray-800 px-2.5 py-1.5 text-xs text-gray-300 hover:bg-gray-700"
            >
              <RefreshCw className="h-3 w-3" /> Rafraichir
            </button>
          )}
        </div>
        {msg && (
          <span className="text-xs text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> {msg}
          </span>
        )}
      </div>

      {/* Grille par jour */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left px-3 py-2 font-medium text-gray-400 sticky left-0 bg-gray-900 z-10 min-w-[160px]">
                Stagiaire
              </th>
              {days.map((day) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const label = format(day, "EEE dd/MM", { locale: fr });
                return (
                  <th key={dateStr} colSpan={2} className="text-center px-1 py-2 font-medium text-gray-300 border-l border-gray-700">
                    <div>{label}</div>
                    <div className="flex gap-0.5 mt-1 justify-center">
                      {["matin", "apres_midi"].map((cr) => {
                        const tk = getToken(dateStr, cr);
                        return (
                          <div key={cr} className="flex items-center gap-1">
                            <span className="text-[9px] text-gray-500">{cr === "matin" ? "M" : "AM"}</span>
                            {tk && <QrCodePresence token={tk.token} date={dateStr} creneau={cr} formationTitre={formationTitre} />}
                          </div>
                        );
                      })}
                    </div>
                    {/* Bulk buttons */}
                    <div className="flex gap-1 mt-1 justify-center">
                      {["matin", "apres_midi"].map((cr) => (
                        <button
                          key={cr}
                          onClick={() => handleBulk(dateStr, cr)}
                          disabled={bulkLoading}
                          className="text-[8px] px-1 py-0.5 rounded bg-gray-800 border border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
                          title={`Tous presents ${cr === "matin" ? "matin" : "apres-midi"}`}
                        >
                          <Users className="h-2.5 w-2.5 inline" /> Tous
                        </button>
                      ))}
                    </div>
                  </th>
                );
              })}
              <th className="px-2 py-2 text-center font-medium text-gray-400 border-l border-gray-700 min-w-[60px]">
                OTP
              </th>
            </tr>
          </thead>
          <tbody>
            {activeInscrits.map((insc) => (
              <tr key={insc.contactId} className="border-b border-gray-800 hover:bg-gray-800/50">
                <td className="px-3 py-2 sticky left-0 bg-gray-900 z-10">
                  <span className="text-sm text-gray-100 font-medium">{insc.contact.prenom} {insc.contact.nom}</span>
                </td>
                {days.map((day) => {
                  const dateStr = format(day, "yyyy-MM-dd");
                  const p = getPresence(insc.contactId, dateStr);
                  return ["matin", "apresMidi"].map((slot) => {
                    const statutField = slot === "matin" ? "statutMatin" : "statutApresMidi";
                    const sigField = slot === "matin" ? "signatureMatin" : "signatureApresMidi";
                    const statut = p?.[statutField as keyof PresenceRecord] as string | null;
                    const sig = p?.[sigField as keyof PresenceRecord] as string | null;
                    const boolField = slot === "matin" ? "matin" : "apresMidi";
                    const boolVal = p?.[boolField as keyof PresenceRecord] as boolean | undefined;
                    const retard = slot === "matin" ? p?.retardMinutes : null;
                    const depart = slot !== "matin" ? p?.departMinutes : null;

                    return (
                      <td key={`${dateStr}-${slot}`} className="px-1 py-2 text-center border-l border-gray-800">
                        {statut ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <StatutBadge statut={statut} retardMinutes={retard} departMinutes={depart} />
                            {sig && (
                              <div className="w-8 h-4 rounded border border-gray-600 overflow-hidden" title="Signe">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={sig} alt="" className="w-full h-full object-contain" />
                              </div>
                            )}
                          </div>
                        ) : (
                          <input
                            type="checkbox"
                            checked={!!boolVal}
                            onChange={() => handleToggleV1(insc.contactId, dateStr, boolField as "matin" | "apresMidi", !!boolVal)}
                            className="h-4 w-4 rounded"
                          />
                        )}
                      </td>
                    );
                  });
                })}
                <td className="px-2 py-2 text-center border-l border-gray-800">
                  <button
                    onClick={() => {
                      const today = format(new Date(), "yyyy-MM-dd");
                      const hour = new Date().getHours();
                      const creneau = hour < 13 ? "matin" : "apres_midi";
                      handleSendOtp(insc.contactId, today, creneau);
                    }}
                    disabled={sendingOtp === `${insc.contactId}-${format(new Date(), "yyyy-MM-dd")}-${new Date().getHours() < 13 ? "matin" : "apres_midi"}`}
                    className="inline-flex items-center gap-0.5 rounded border border-gray-600 bg-gray-800 px-1.5 py-1 text-[10px] text-gray-300 hover:bg-gray-700 disabled:opacity-40"
                    title="Envoyer lien OTP par email"
                  >
                    <Send className="h-2.5 w-2.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {activeInscrits.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-6 italic">Aucun stagiaire inscrit.</p>
      )}
    </div>
  );
}
