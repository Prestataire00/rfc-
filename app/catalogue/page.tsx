"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { BookOpen, Clock, Users, MapPin, Award, Filter, Calendar } from "lucide-react";
import { useApi } from "@/hooks/useApi";

type Session = {
  id: string;
  dateDebut: string;
  dateFin: string;
  lieu: string | null;
  placesRestantes: number;
  tokenInscription: string | null;
};

type Formation = {
  id: string;
  titre: string;
  description: string | null;
  duree: number;
  tarif: number;
  categorie: string | null;
  modalite: string;
  certifiante: boolean;
  niveau: string;
  misEnAvant: boolean;
  image: string | null;
  publicCible: string | null;
  sessions: Session[];
};

const MODALITE_LABELS: Record<string, string> = {
  presentiel: "Presentiel",
  distanciel: "Distanciel",
  mixte: "Mixte",
};

type CatalogueResponse = { formations: Formation[]; categories?: string[] };

export default function CataloguePage() {
  const [filterCat, setFilterCat] = useState("");
  const [filterModalite, setFilterModalite] = useState("");

  const url = useMemo(() => {
    const params = new URLSearchParams();
    if (filterCat) params.set("categorie", filterCat);
    if (filterModalite) params.set("modalite", filterModalite);
    return `/api/catalogue?${params.toString()}`;
  }, [filterCat, filterModalite]);

  const { data, isLoading: loading } = useApi<CatalogueResponse>(url);
  const formations: Formation[] = data?.formations || [];
  const categories: string[] = data?.categories || [];

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header public */}
      <div className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-lg bg-red-600 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-100">Catalogue de formations</h1>
              <p className="text-sm text-gray-400">RFC — Rescue Formation Conseil</p>
            </div>
          </div>
          <p className="text-sm text-gray-400 mt-2">
            Securite, incendie, prevention — formations certifiantes et recyclages obligatoires.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Filtres */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} className="h-9 rounded-md border border-gray-700 bg-gray-800 text-sm text-gray-200 px-3">
              <option value="">Toutes les categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <select value={filterModalite} onChange={(e) => setFilterModalite(e.target.value)} className="h-9 rounded-md border border-gray-700 bg-gray-800 text-sm text-gray-200 px-3">
            <option value="">Toutes les modalites</option>
            <option value="presentiel">Presentiel</option>
            <option value="distanciel">Distanciel</option>
            <option value="mixte">Mixte</option>
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
          </div>
        ) : formations.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="h-12 w-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">Aucune formation disponible</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {formations.map((f) => (
              <Link
                key={f.id}
                href={`/catalogue/${f.id}`}
                className={`rounded-xl border bg-gray-800 overflow-hidden hover:border-red-600 transition-colors group ${
                  f.misEnAvant ? "border-red-700 ring-1 ring-red-700/30" : "border-gray-700"
                }`}
              >
                {/* Image ou placeholder */}
                {f.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.image} alt={f.titre} className="w-full h-40 object-cover" />
                ) : (
                  <div className="w-full h-40 bg-gradient-to-br from-red-900/30 to-gray-800 flex items-center justify-center">
                    <BookOpen className="h-12 w-12 text-red-700/50" />
                  </div>
                )}

                <div className="p-4">
                  {f.misEnAvant && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-red-400 mb-2">
                      <Award className="h-3 w-3" /> Mise en avant
                    </span>
                  )}
                  <h3 className="font-semibold text-gray-100 group-hover:text-red-400 transition-colors line-clamp-2 mb-2">
                    {f.titre}
                  </h3>
                  {f.description && (
                    <p className="text-xs text-gray-400 line-clamp-2 mb-3">{f.description}</p>
                  )}

                  <div className="flex flex-wrap gap-2 text-[11px] text-gray-400 mb-3">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {f.duree}h</span>
                    <span className="px-1.5 py-0.5 rounded bg-gray-700 text-gray-300">{MODALITE_LABELS[f.modalite] || f.modalite}</span>
                    {f.certifiante && <span className="px-1.5 py-0.5 rounded bg-red-900/40 text-red-300 border border-red-700">Certifiante</span>}
                    {f.categorie && <span className="text-gray-500">{f.categorie}</span>}
                  </div>

                  {/* Prochaines sessions */}
                  {f.sessions.length > 0 ? (
                    <div className="border-t border-gray-700 pt-3 space-y-1.5">
                      {f.sessions.slice(0, 2).map((s) => (
                        <div key={s.id} className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1 text-gray-300">
                            <Calendar className="h-3 w-3 text-red-500" />
                            {new Date(s.dateDebut).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                            {s.lieu && <span className="text-gray-500 flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{s.lieu}</span>}
                          </span>
                          <span className="flex items-center gap-1 text-gray-400">
                            <Users className="h-3 w-3" /> {s.placesRestantes} place{s.placesRestantes > 1 ? "s" : ""}
                          </span>
                        </div>
                      ))}
                      {f.sessions.length > 2 && (
                        <p className="text-[10px] text-gray-500">+{f.sessions.length - 2} autre{f.sessions.length - 2 > 1 ? "s" : ""} session{f.sessions.length - 2 > 1 ? "s" : ""}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 border-t border-gray-700 pt-3">Pas de session planifiee</p>
                  )}

                  <div className="mt-3 text-right">
                    <span className="text-lg font-bold text-gray-100">{f.tarif.toFixed(0)} EUR</span>
                    <span className="text-xs text-gray-500 ml-1">HT / stagiaire</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-gray-900 border-t border-gray-800 py-6 mt-12">
        <div className="max-w-6xl mx-auto px-4 text-center text-xs text-gray-500">
          RFC — Rescue Formation Conseil | Securite - Incendie - Prevention
        </div>
      </div>
    </div>
  );
}
