"use client";

// Badge cliquable qui ramène l'utilisateur vers le prospect/demande source
// d'un devis, d'une facture ou d'une fiche pré-formation. Affiché en haut
// des pages détail (commercial/devis/[id], commercial/factures/[id],
// qualiopi/fiches-pre-formation/[id]/...) pour rendre visible la
// continuité du dossier dans le tunnel Prospect → Gagné.
//
// Resolveur côté client : 1 fetch /api/funnel/resolve-prospect?devisId=...
// (ou ?factureId, ?ficheId). Retourne null si aucune demande trouvée → pas
// d'affichage (évite un badge inutile sur les devis "orphelins" créés à la
// main sans passage par le pipeline prospect).

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type ResolvedProspect = {
  demandeId: string;
  titre: string;
  contactNom: string | null;
  entrepriseNom: string | null;
  statutLabel: string | null;
};

export function ProspectBackLink({
  devisId,
  factureId,
  ficheId,
}: {
  devisId?: string;
  factureId?: string;
  ficheId?: string;
}) {
  const [prospect, setProspect] = useState<ResolvedProspect | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (devisId) params.set("devisId", devisId);
    if (factureId) params.set("factureId", factureId);
    if (ficheId) params.set("ficheId", ficheId);
    if (!params.toString()) {
      setLoaded(true);
      return;
    }
    fetch(`/api/funnel/resolve-prospect?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        setProspect(data?.demandeId ? data : null);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [devisId, factureId, ficheId]);

  if (!loaded || !prospect) return null;

  const label = prospect.contactNom || prospect.entrepriseNom || prospect.titre;
  const sublabel = prospect.contactNom && prospect.entrepriseNom
    ? prospect.entrepriseNom
    : null;

  return (
    <Link
      href={`/prospects/${prospect.demandeId}`}
      className="inline-flex items-center gap-2 rounded-md border border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-900/20 px-3 py-1.5 text-xs text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/40 transition-colors"
      title="Retour au dossier prospect"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      <span className="font-medium">Prospect : {label}</span>
      {sublabel && <span className="text-sky-500 dark:text-sky-400">· {sublabel}</span>}
      {prospect.statutLabel && (
        <span className="rounded-full bg-sky-100 dark:bg-sky-800 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
          {prospect.statutLabel}
        </span>
      )}
    </Link>
  );
}
