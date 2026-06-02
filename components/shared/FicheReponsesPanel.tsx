"use client";

// Panneau "Besoin client — réponses à la fiche pré-formation" affiché sur
// la page détail du devis. Fetch lazy : ne charge la fiche qu'au montage.
// Affichage conditionnel : si pas de fiche rattachée (devis hors pipeline),
// le panneau ne s'affiche pas (return null).
//
// Deux variantes selon le type :
//   - "entreprise" : sections Entreprise / Stagiaires / Formation / Accessibilité
//   - "stagiaire" : sections Prérequis / Accessibilité / Consentement

import { useEffect, useState } from "react";
import { ClipboardList, AlertTriangle, Accessibility } from "lucide-react";

type FicheEntreprise = {
  id: string;
  statut: string;
  dateReponse: string | null;
  secteurActivite: string | null;
  effectifTotal: number | null;
  effectifConcerne: number | null;
  metiersStagiaires: string | null;
  contexteTravail: string | null;
  contraintesSpecifiques: string | null;
  objectifPrincipal: string | null;
  objectifsClient: string | null;
  casAccidentsRecents: boolean;
  detailsCasAccidents: string | null;
  contraintesHoraires: string | null;
  aStagiairesHandicap: boolean;
  detailsHandicap: string | null;
  entreprise: { nom: string } | null;
  formation: { titre: string } | null;
};

type FicheStagiaire = {
  id: string;
  statut: string;
  dateReponse: string | null;
  dejaSuivi: boolean;
  dateDerniereFormation: string | null;
  niveauFormation: string | null;
  niveauPrerequis: string | null;
  estRQTH: boolean;
  detailsRQTH: string | null;
  contraintesPhysiques: string | null;
  contraintesLangue: string | null;
  contraintesAlimentaires: string | null;
  consentementRGPD: boolean;
  consentementBPF: boolean;
  contact: { prenom: string; nom: string } | null;
  formation: { titre: string } | null;
};

type FicheResponse =
  | { type: "entreprise"; fiche: FicheEntreprise }
  | { type: "stagiaire"; fiche: FicheStagiaire }
  | { type: null };

export function FicheReponsesPanel({ devisId }: { devisId: string }) {
  const [data, setData] = useState<FicheResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/devis/${devisId}/fiche`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled) setData(d ?? { type: null });
      })
      .catch(() => {
        if (!cancelled) setData({ type: null });
      });
    return () => {
      cancelled = true;
    };
  }, [devisId]);

  if (!data || data.type === null) return null;

  // En-tête commun (statut + date réponse + qui)
  const header = (() => {
    if (data.type === "entreprise") {
      const f = data.fiche;
      return (
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-red-500" />
            <h2 className="text-base font-semibold text-gray-100">
              Besoin client — fiche pré-formation
            </h2>
            <span className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide bg-sky-500/20 text-sky-300 border border-sky-500/30">
              Entreprise
            </span>
          </div>
          <div className="text-xs text-gray-400">
            {f.statut === "repondu" && f.dateReponse
              ? `Reçue le ${new Date(f.dateReponse).toLocaleDateString("fr-FR")}`
              : `Statut : ${f.statut}`}
          </div>
        </div>
      );
    }
    const f = data.fiche;
    return (
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-red-500" />
          <h2 className="text-base font-semibold text-gray-100">
            Besoin client — fiche pré-formation
          </h2>
          <span className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide bg-violet-500/20 text-violet-300 border border-violet-500/30">
            Stagiaire individuel
          </span>
        </div>
        <div className="text-xs text-gray-400">
          {f.statut === "repondu" && f.dateReponse
            ? `Reçue le ${new Date(f.dateReponse).toLocaleDateString("fr-FR")}`
            : `Statut : ${f.statut}`}
        </div>
      </div>
    );
  })();

  // Si fiche pas encore répondue : afficher un placeholder informatif.
  if (data.fiche.statut !== "repondu") {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-800 p-5 space-y-3">
        {header}
        <p className="text-sm text-gray-400">
          Le client n&apos;a pas encore répondu à la fiche pré-formation.
          Le devis a été créé sans contexte de besoin documenté.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800 p-5 space-y-5">
      {header}
      {data.type === "entreprise" ? (
        <EntrepriseRecap fiche={data.fiche} />
      ) : (
        <StagiaireRecap fiche={data.fiche} />
      )}
    </div>
  );
}

function EntrepriseRecap({ fiche }: { fiche: FicheEntreprise }) {
  return (
    <div className="space-y-4">
      {/* Données chiffrées */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Effectif total" value={fiche.effectifTotal} />
        <Stat label="Effectif concerné" value={fiche.effectifConcerne} />
        <Stat label="Secteur" value={fiche.secteurActivite?.replace(/_/g, " ")} />
        <Stat label="Objectif principal" value={fiche.objectifPrincipal?.replace(/_/g, " ")} />
      </div>

      {/* Réponses libres */}
      <div className="space-y-2 border-t border-gray-700 pt-3">
        <RecapRow label="Métiers des stagiaires" value={fiche.metiersStagiaires} />
        <RecapRow label="Contexte de travail" value={fiche.contexteTravail} />
        <RecapRow label="Contraintes spécifiques" value={fiche.contraintesSpecifiques} />
        <RecapRow label="Objectifs clients" value={fiche.objectifsClient} />
        <RecapRow label="Contraintes horaires" value={fiche.contraintesHoraires} />
      </div>

      {/* Drapeaux importants */}
      {(fiche.casAccidentsRecents || fiche.aStagiairesHandicap) && (
        <div className="space-y-2 border-t border-gray-700 pt-3">
          {fiche.casAccidentsRecents && (
            <div className="rounded-md border border-amber-700 bg-amber-900/20 p-3 text-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-amber-300 mb-1 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Accidents récents
              </div>
              <div className="text-amber-200 whitespace-pre-line">
                {fiche.detailsCasAccidents || "Oui (détails non précisés)"}
              </div>
            </div>
          )}
          {fiche.aStagiairesHandicap && (
            <div className="rounded-md border border-orange-700 bg-orange-900/20 p-3 text-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-orange-300 mb-1 flex items-center gap-1">
                <Accessibility className="h-3 w-3" /> Stagiaires en situation de handicap
              </div>
              <div className="text-orange-200 whitespace-pre-line">
                {fiche.detailsHandicap || "Oui"}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StagiaireRecap({ fiche }: { fiche: FicheStagiaire }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="A déjà suivi" value={fiche.dejaSuivi ? "Oui" : "Non"} />
        {fiche.dejaSuivi && fiche.dateDerniereFormation && (
          <Stat
            label="Dernière formation"
            value={new Date(fiche.dateDerniereFormation).toLocaleDateString("fr-FR")}
          />
        )}
        <Stat label="Niveau général" value={fiche.niveauFormation?.replace(/_/g, " ")} />
        <Stat label="Niveau sur le sujet" value={fiche.niveauPrerequis?.replace(/_/g, " ")} />
      </div>

      <div className="space-y-2 border-t border-gray-700 pt-3">
        <RecapRow label="Contraintes physiques" value={fiche.contraintesPhysiques} />
        <RecapRow label="Contraintes de langue" value={fiche.contraintesLangue} />
        <RecapRow label="Contraintes alimentaires" value={fiche.contraintesAlimentaires} />
      </div>

      {fiche.estRQTH && (
        <div className="rounded-md border border-orange-700 bg-orange-900/20 p-3 text-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-orange-300 mb-1 flex items-center gap-1">
            <Accessibility className="h-3 w-3" /> Reconnaissance RQTH
          </div>
          <div className="text-orange-200 whitespace-pre-line">
            {fiche.detailsRQTH || "Oui"}
          </div>
        </div>
      )}

      {/* Consentements (utiles pour BPF/Qualiopi) */}
      <div className="flex gap-3 text-xs text-gray-400 border-t border-gray-700 pt-3">
        <span className={fiche.consentementRGPD ? "text-emerald-400" : "text-red-400"}>
          RGPD : {fiche.consentementRGPD ? "✓ Accepté" : "✗ Refusé"}
        </span>
        <span className={fiche.consentementBPF ? "text-emerald-400" : "text-red-400"}>
          BPF : {fiche.consentementBPF ? "✓ Accepté" : "✗ Refusé"}
        </span>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number | null | undefined }) {
  const displayed = value != null && String(value).trim() ? String(value) : "—";
  return (
    <div className="rounded-md bg-gray-900/40 border border-gray-700 p-3">
      <div className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">{label}</div>
      <div className="text-sm font-semibold text-gray-100">{displayed}</div>
    </div>
  );
}

function RecapRow({ label, value }: { label: string; value: string | null | undefined }) {
  const displayed = value && String(value).trim() ? String(value) : "—";
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-1 sm:gap-3 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-200 whitespace-pre-line">{displayed}</span>
    </div>
  );
}
