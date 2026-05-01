"use client";

import { Award, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import type { Attestation, FeuillePresence } from "./types";

type Props = {
  attestations: Attestation[];
  feuillesPresence: FeuillePresence[];
};

export function DocumentsTab({ attestations, feuillesPresence }: Props) {
  return (
    <div className="space-y-6">
      {/* Attestations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="h-4 w-4 text-gray-400" /> Attestations
            {attestations.length > 0 && (
              <span className="ml-auto text-xs text-gray-400">{attestations.length} attestation(s)</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {attestations.length === 0 ? (
            <p className="text-sm text-gray-500 italic py-4 text-center">Aucune attestation generee.</p>
          ) : (
            <div className="space-y-3">
              {attestations.map((att) => (
                <div key={att.id} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-200">
                      {att.type === "fin_formation" ? "Attestation de fin de formation" :
                       att.type === "presence" ? "Attestation de presence" :
                       att.type === "competences" ? "Attestation de competences" : att.type}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{att.session?.formation?.titre} - {formatDate(att.createdAt)}</p>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    att.statut === "envoyee" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                    att.statut === "validee" ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" :
                    "bg-gray-700 text-gray-300 border border-gray-600"
                  }`}>
                    {att.statut === "generee" ? "Generee" : att.statut === "validee" ? "Validee" : "Envoyee"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feuilles de presence */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-gray-400" /> Feuilles de presence
            {feuillesPresence.length > 0 && (
              <span className="ml-auto text-xs text-gray-400">{feuillesPresence.length} feuille(s)</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {feuillesPresence.length === 0 ? (
            <p className="text-sm text-gray-500 italic py-4 text-center">Aucune feuille de presence.</p>
          ) : (
            <div className="space-y-3">
              {feuillesPresence.map((fp) => (
                <div key={fp.id} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-200">{fp.session?.formation?.titre}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(fp.date)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${fp.matin ? "bg-emerald-500/20 text-emerald-400" : "bg-gray-700 text-gray-500"}`}>
                      {fp.matin ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />} Matin
                    </span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${fp.apresMidi ? "bg-emerald-500/20 text-emerald-400" : "bg-gray-700 text-gray-500"}`}>
                      {fp.apresMidi ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />} Apres-midi
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
