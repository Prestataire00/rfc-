"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Users, MapPin, Award, Calendar, CheckCircle2, BookOpen, FileText } from "lucide-react";

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
  image: string | null;
  publicCible: string | null;
  prerequis: string | null;
  objectifs: string | null;
  contenuProgramme: string | null;
  methodesPedagogiques: string | null;
  accessibilite: string | null;
  typesFinancement: string;
  dureeRecyclage: number | null;
  sessions: Session[];
};

export default function FormationDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [formation, setFormation] = useState<Formation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/catalogue`)
      .then((r) => r.ok ? r.json() : { formations: [] })
      .then((d) => {
        const f = (d.formations || []).find((f: Formation) => f.id === slug);
        setFormation(f || null);
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" /></div>;
  }

  if (!formation) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 font-medium mb-2">Formation introuvable</p>
          <Link href="/catalogue" className="text-red-400 underline text-sm">Retour au catalogue</Link>
        </div>
      </div>
    );
  }

  let financements: string[] = [];
  try { financements = JSON.parse(formation.typesFinancement); } catch { /* keep empty */ }

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/catalogue" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-300 mb-6">
          <ArrowLeft className="h-4 w-4" /> Retour catalogue
        </Link>

        {/* Header */}
        <div className="rounded-xl border border-gray-700 bg-gray-800 overflow-hidden mb-6">
          {formation.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={formation.image} alt={formation.titre} className="w-full h-48 object-cover" />
          )}
          <div className="p-6">
            <div className="flex flex-wrap gap-2 mb-3">
              {formation.certifiante && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-900/40 border border-red-700 text-red-300 text-xs font-medium">
                  <Award className="h-3 w-3" /> Certifiante
                </span>
              )}
              {formation.categorie && (
                <span className="px-2 py-0.5 rounded-full bg-gray-700 text-gray-300 text-xs">{formation.categorie}</span>
              )}
              <span className="px-2 py-0.5 rounded-full bg-gray-700 text-gray-300 text-xs">{formation.modalite}</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-100 mb-2">{formation.titre}</h1>
            {formation.description && <p className="text-sm text-gray-400 mb-4">{formation.description}</p>}

            <div className="flex flex-wrap gap-4 text-sm text-gray-300">
              <span className="flex items-center gap-1"><Clock className="h-4 w-4 text-red-500" /> {formation.duree} heures</span>
              <span className="font-bold text-lg">{formation.tarif.toFixed(0)} EUR <span className="text-xs text-gray-500 font-normal">HT/stagiaire</span></span>
              {formation.dureeRecyclage && (
                <span className="text-xs text-amber-400">Recyclage tous les {formation.dureeRecyclage} mois</span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contenu */}
          <div className="lg:col-span-2 space-y-5">
            {formation.objectifs && (
              <Section title="Objectifs" icon={CheckCircle2}>{formation.objectifs}</Section>
            )}
            {formation.contenuProgramme && (
              <Section title="Programme" icon={BookOpen}>{formation.contenuProgramme}</Section>
            )}
            {formation.prerequis && (
              <Section title="Prerequis" icon={FileText}>{formation.prerequis}</Section>
            )}
            {formation.publicCible && (
              <Section title="Public cible" icon={Users}>{formation.publicCible}</Section>
            )}
            {formation.methodesPedagogiques && (
              <Section title="Methodes pedagogiques" icon={BookOpen}>{formation.methodesPedagogiques}</Section>
            )}
            {formation.accessibilite && (
              <Section title="Accessibilite" icon={Users}>{formation.accessibilite}</Section>
            )}
            {financements.length > 0 && (
              <div className="rounded-lg border border-gray-700 bg-gray-800 p-5">
                <h3 className="font-semibold text-gray-100 mb-2">Financements acceptes</h3>
                <div className="flex flex-wrap gap-2">
                  {financements.map((f) => (
                    <span key={f} className="px-2.5 py-1 rounded-full bg-gray-700 text-xs text-gray-300 uppercase">{f}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sessions disponibles */}
          <div>
            <div className="rounded-lg border border-gray-700 bg-gray-800 p-5 sticky top-6">
              <h3 className="font-semibold text-gray-100 mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-red-500" /> Sessions disponibles
              </h3>
              {formation.sessions.length === 0 ? (
                <p className="text-sm text-gray-500 italic">Aucune session planifiee.</p>
              ) : (
                <div className="space-y-3">
                  {formation.sessions.map((s) => (
                    <div key={s.id} className="rounded-lg border border-gray-600 bg-gray-900 p-3">
                      <p className="text-sm font-medium text-gray-200">
                        {new Date(s.dateDebut).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                      </p>
                      <p className="text-xs text-gray-400">
                        au {new Date(s.dateFin).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
                      </p>
                      {s.lieu && (
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" /> {s.lieu}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Users className="h-3 w-3" /> {s.placesRestantes} place{s.placesRestantes > 1 ? "s" : ""}
                        </span>
                        {s.tokenInscription && s.placesRestantes > 0 && (
                          <Link
                            href={`/inscription-stagiaire/${s.tokenInscription}`}
                            className="text-xs rounded-md bg-red-600 hover:bg-red-700 px-3 py-1.5 text-white font-medium"
                          >
                            S&apos;inscrire
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800 p-5">
      <h3 className="font-semibold text-gray-100 mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4 text-red-500" /> {title}
      </h3>
      <div className="text-sm text-gray-300 whitespace-pre-line">{children}</div>
    </div>
  );
}
