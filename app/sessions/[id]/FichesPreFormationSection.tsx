"use client";

import { ClipboardList, Send, Accessibility } from "lucide-react";
import { formatDate, cn } from "@/lib/utils";
import type { BesoinClient, BesoinStagiaire } from "./types";

type Props = {
  besoinsClient: BesoinClient[];
  besoinsStagiaire: BesoinStagiaire[];
  sendingFiches: boolean;
  fichesMsg: string;
  inscriptionsCount: number;
  onSendFiches: () => void;
  onResendFiche: (type: "client" | "stagiaire", ficheId: string) => void;
};

export function FichesBesoinSection({
  besoinsClient,
  besoinsStagiaire,
  sendingFiches,
  fichesMsg,
  inscriptionsCount,
  onSendFiches,
  onResendFiche,
}: Props) {
  return (
    <div className="rounded-lg border bg-gray-800 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-100 flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-red-500" /> Fiches besoin
        </h2>
        <button
          onClick={onSendFiches}
          disabled={sendingFiches || inscriptionsCount === 0}
          className="inline-flex items-center gap-1 rounded-md bg-red-600 hover:bg-red-700 px-2.5 py-1 text-xs font-medium text-white transition-colors disabled:opacity-50"
        >
          <Send className="h-3 w-3" />
          {sendingFiches ? "Envoi..." : besoinsClient.length + besoinsStagiaire.length === 0 ? "Envoyer" : "Renvoyer"}
        </button>
      </div>
      {fichesMsg && <p className="text-xs text-gray-400">{fichesMsg}</p>}

      {/* Fiche client */}
      <div>
        <p className="text-xs uppercase tracking-wide text-gray-500 mb-1.5">Client</p>
        {besoinsClient.length === 0 ? (
          <p className="text-xs text-gray-500 italic">Aucune fiche envoyee</p>
        ) : besoinsClient.map((b) => (
          <div key={b.id} className="flex items-center justify-between p-2 rounded-md border border-gray-700 bg-gray-900 text-xs mb-1">
            <div className="flex-1 min-w-0">
              <p className="text-gray-200 truncate">{b.destinataireNom || b.destinataireEmail || "Destinataire inconnu"}</p>
              <p className="text-gray-500 text-[10px]">
                {b.statut === "repondu" && b.dateReponse
                  ? `Repondu le ${formatDate(b.dateReponse)}`
                  : b.dateEnvoi ? `Envoye le ${formatDate(b.dateEnvoi)}` : "En attente"}
                {b.optionnel && " · optionnel"}
              </p>
            </div>
            <span className={cn(
              "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
              b.statut === "repondu" ? "bg-emerald-900/30 text-emerald-400" :
              b.statut === "envoye" ? "bg-blue-900/30 text-blue-400" :
              "bg-gray-700 text-gray-400"
            )}>
              {b.statut === "repondu" ? "Repondu" : b.statut === "envoye" ? "Envoye" : "En attente"}
            </span>
          </div>
        ))}
      </div>

      {/* Fiches stagiaires */}
      <div>
        <p className="text-xs uppercase tracking-wide text-gray-500 mb-1.5">Stagiaires</p>
        {besoinsStagiaire.length === 0 ? (
          <p className="text-xs text-gray-500 italic">Aucune fiche envoyee</p>
        ) : besoinsStagiaire.map((b) => (
          <div key={b.id} className="flex items-center justify-between p-2 rounded-md border border-gray-700 bg-gray-900 text-xs mb-1">
            <div className="flex-1 min-w-0">
              <p className="text-gray-200 truncate flex items-center gap-1">
                {b.contact.prenom} {b.contact.nom}
                {b.estRQTH && <Accessibility className="h-3 w-3 text-orange-400" />}
              </p>
              <p className="text-gray-500 text-[10px]">
                {b.statut === "repondu" && b.dateReponse
                  ? `Repondu le ${formatDate(b.dateReponse)}`
                  : b.dateEnvoi ? `Envoye le ${formatDate(b.dateEnvoi)}` : "En attente"}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => onResendFiche("stagiaire", b.id)} className="text-gray-400 hover:text-gray-200" title="Renvoyer l'email">
                <Send className="h-3 w-3" />
              </button>
              <span className={cn(
                "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                b.statut === "repondu" ? "bg-emerald-900/30 text-emerald-400" :
                b.statut === "envoye" ? "bg-blue-900/30 text-blue-400" :
                "bg-gray-700 text-gray-400"
              )}>
                {b.statut === "repondu" ? "OK" : b.statut === "envoye" ? "Envoye" : "Attente"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
