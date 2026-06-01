"use client";

// Page d'édition guidée : fiche pré-formation entreprise reçue → préparation
// du devis avec ajustement libre du prix → création (+ envoi signature optionnel).
// Cf. workflow CRM 2026-05-21 (génération devis sur mesure depuis besoin client).

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Send, FileText, Sparkles, Building2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { ProspectBackLink } from "@/components/shared/ProspectBackLink";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useApi } from "@/hooks/useApi";
import { api, ApiError } from "@/lib/fetcher";
import { notify } from "@/lib/toast";
import { formatCurrency } from "@/lib/utils";

type Fiche = {
  id: string;
  statut: string;
  dateReponse: string | null;
  effectifConcerne: number | null;
  effectifTotal: number | null;
  secteurActivite: string | null;
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
  entreprise: { id: string; nom: string } | null;
  // session optionnelle : la fiche peut exister pré-session (créée à la naissance du prospect).
  session: {
    id: string;
    formation: { id: string; titre: string; duree: number; tarif: number; certifiante: boolean };
  } | null;
  // formation directe (cas fiche pré-session). Au moins l'une des deux doit être présente.
  formation: { id: string; titre: string; duree: number; tarif: number; certifiante: boolean } | null;
};

type Ligne = { designation: string; quantite: number; prixUnitaire: number };

export default function GenererDevisDepuisFichePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const { data: fiche, isLoading, error } = useApi<Fiche>(`/api/qualiopi/fiches-entreprise/${id}`);

  const [objet, setObjet] = useState<string | null>(null);
  const [notes, setNotes] = useState<string | null>(null);
  const [dateValidite, setDateValidite] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });
  const [tauxTVA, setTauxTVA] = useState<number>(20);
  const [lignes, setLignes] = useState<Ligne[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [creatingSig, setCreatingSig] = useState(false);

  // Formation effective : priorité session.formation (legacy), sinon formation directe.
  const formationEff = fiche?.session?.formation ?? fiche?.formation ?? null;

  // Pré-remplir une fois la fiche chargée
  const lignesEff = useMemo<Ligne[]>(() => {
    if (lignes) return lignes;
    if (!formationEff) return [];
    const f = formationEff;
    const qte = Math.max(1, fiche?.effectifConcerne ?? 1);
    return [{
      designation: `${f.titre}${f.duree ? ` (${f.duree} h)` : ""}`,
      quantite: qte,
      prixUnitaire: f.tarif ?? 0,
    }];
  }, [formationEff, fiche, lignes]);

  const objetEff = useMemo(() => {
    if (objet !== null) return objet;
    if (!formationEff) return "";
    const f = formationEff;
    const qte = Math.max(1, fiche?.effectifConcerne ?? 1);
    return `Formation ${f.titre} - ${qte} stagiaire${qte > 1 ? "s" : ""}`;
  }, [formationEff, fiche, objet]);

  const notesEff = notes ?? (fiche
    ? `Devis généré depuis la fiche pré-formation entreprise reçue le ${fiche.dateReponse ? new Date(fiche.dateReponse).toLocaleDateString("fr-FR") : "—"}.`
    : "");

  const montantHT = lignesEff.reduce((s, l) => s + l.quantite * l.prixUnitaire, 0);
  const montantTTC = montantHT * (1 + tauxTVA / 100);

  function updateLigne(idx: number, field: keyof Ligne, value: string | number) {
    const next = [...lignesEff];
    const ligne = { ...next[idx], [field]: field === "designation" ? String(value) : Number(value) };
    next[idx] = ligne;
    setLignes(next);
  }

  function addLigne() {
    setLignes([...lignesEff, { designation: "", quantite: 1, prixUnitaire: 0 }]);
  }

  function removeLigne(idx: number) {
    if (lignesEff.length <= 1) {
      notify.error("Au moins une ligne est requise");
      return;
    }
    setLignes(lignesEff.filter((_, i) => i !== idx));
  }

  async function handleCreate(sendForSignature: boolean) {
    if (!fiche) return;
    const lignesClean = lignesEff.filter((l) => l.designation.trim());
    if (lignesClean.length === 0) {
      notify.error("Au moins une ligne avec une désignation est requise");
      return;
    }
    sendForSignature ? setCreatingSig(true) : setCreating(true);
    try {
      const result = await api.post<{ devisId: string; numero: string }>(
        `/api/qualiopi/fiches-entreprise/${id}/generate-devis`,
        {
          objet: objetEff,
          notes: notesEff,
          dateValidite,
          tauxTVA,
          lignes: lignesClean,
        },
      );
      notify.success(`Devis ${result.numero} créé`);

      if (sendForSignature) {
        // Envoi 1-clic via le endpoint dédié (orchestration complète)
        try {
          await api.post(`/api/devis/${result.devisId}/send-for-signature`, {});
          notify.success("Envoyé pour signature électronique");
        } catch (sigErr) {
          const msg = sigErr instanceof ApiError ? sigErr.message : "Envoi signature impossible";
          notify.error(msg);
          router.push(`/commercial/devis/${result.devisId}`);
          return;
        }
      }
      router.push(`/commercial/devis/${result.devisId}`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Création du devis impossible";
      notify.error(msg);
    } finally {
      setCreating(false);
      setCreatingSig(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
      </div>
    );
  }
  if (error || !fiche) {
    return <div className="p-6 text-red-500">Fiche introuvable</div>;
  }

  const blocked =
    fiche.statut !== "repondu" || !fiche.entreprise || !formationEff;

  return (
    <div className="space-y-6 p-6 pb-24 max-w-5xl mx-auto">
      <Breadcrumb items={[
        { label: "Fiches pré-formation", href: "/qualiopi/fiches-pre-formation" },
        { label: "Générer devis" },
      ]} />

      <ProspectBackLink ficheId={fiche.id} />

      <PageHeader
        title="Générer le devis"
        description="Ajustez le prix et les lignes en fonction du besoin exprimé dans la fiche, puis créez le devis (option : envoi signature en 1 clic)."
      />

      {blocked && (
        <div className="rounded-md border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-4 text-sm text-amber-800 dark:text-amber-200">
          <strong>Action impossible.</strong>{" "}
          {fiche.statut !== "repondu"
            ? `Statut actuel : ${fiche.statut} (attendu : repondu).`
            : !fiche.entreprise
              ? "Pas d'entreprise rattachée à la fiche."
              : "Pas de formation rattachée à la fiche."}
        </div>
      )}

      {/* Récap de la fiche reçue (lecture seule, contexte de décision prix) */}
      <section className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-red-500" />
          Contexte du client
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <RecapRow label="Entreprise" value={fiche.entreprise?.nom} />
          <RecapRow label="Formation" value={formationEff?.titre} />
          <RecapRow label="Effectif total" value={fiche.effectifTotal} />
          <RecapRow label="Effectif concerné" value={fiche.effectifConcerne} />
          <RecapRow label="Secteur d'activité" value={fiche.secteurActivite} />
          <RecapRow label="Objectif principal" value={fiche.objectifPrincipal?.replace(/_/g, " ")} />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 text-sm">
          <RecapRow label="Métiers des stagiaires" value={fiche.metiersStagiaires} multiline />
          <RecapRow label="Contexte de travail" value={fiche.contexteTravail} multiline />
          <RecapRow label="Contraintes spécifiques" value={fiche.contraintesSpecifiques} multiline />
          <RecapRow label="Objectifs clients" value={fiche.objectifsClient} multiline />
          {fiche.casAccidentsRecents && (
            <RecapRow label="Accidents récents" value={fiche.detailsCasAccidents || "Oui (détails non précisés)"} multiline />
          )}
          {fiche.aStagiairesHandicap && (
            <RecapRow label="Stagiaires en situation de handicap" value={fiche.detailsHandicap || "Oui"} multiline />
          )}
          <RecapRow label="Contraintes horaires" value={fiche.contraintesHoraires} multiline />
        </div>
      </section>

      {/* Édition libre du devis */}
      <section className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 space-y-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 flex items-center gap-2">
          <FileText className="h-4 w-4 text-red-500" />
          Devis à proposer
        </h2>

        <div>
          <Label htmlFor="objet">Objet</Label>
          <Input
            id="objet"
            value={objetEff}
            onChange={(e) => setObjet(e.target.value)}
            className="mt-1"
            disabled={blocked}
          />
        </div>

        {/* Lignes éditables */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Lignes du devis</Label>
            <Button type="button" variant="outline" size="sm" onClick={addLigne} disabled={blocked}>
              <Plus className="mr-1 h-3 w-3" /> Ligne
            </Button>
          </div>
          <div className="space-y-2">
            {lignesEff.map((l, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <Input
                  className="col-span-6"
                  placeholder="Désignation"
                  value={l.designation}
                  onChange={(e) => updateLigne(i, "designation", e.target.value)}
                  disabled={blocked}
                />
                <Input
                  type="number"
                  min={1}
                  className="col-span-1"
                  placeholder="Qté"
                  value={l.quantite}
                  onChange={(e) => updateLigne(i, "quantite", e.target.value)}
                  disabled={blocked}
                />
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  className="col-span-2"
                  placeholder="P.U. HT"
                  value={l.prixUnitaire}
                  onChange={(e) => updateLigne(i, "prixUnitaire", e.target.value)}
                  disabled={blocked}
                />
                <div className="col-span-2 text-right text-sm text-gray-700 dark:text-gray-300 font-medium">
                  {formatCurrency(l.quantite * l.prixUnitaire)}
                </div>
                <button
                  type="button"
                  onClick={() => removeLigne(i)}
                  className="col-span-1 inline-flex items-center justify-center h-9 w-9 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                  disabled={blocked}
                  title="Retirer la ligne"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="tva">TVA (%)</Label>
            <Input
              id="tva"
              type="number"
              min={0}
              step="0.1"
              value={tauxTVA}
              onChange={(e) => setTauxTVA(Number(e.target.value))}
              className="mt-1"
              disabled={blocked}
            />
          </div>
          <div>
            <Label htmlFor="validite">Date de validité</Label>
            <Input
              id="validite"
              type="date"
              value={dateValidite}
              onChange={(e) => setDateValidite(e.target.value)}
              className="mt-1"
              disabled={blocked}
            />
          </div>
        </div>

        <div className="rounded-md bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Montant HT</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(montantHT)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-right">Montant TTC ({tauxTVA}%)</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(montantTTC)}</p>
          </div>
        </div>

        <div>
          <Label htmlFor="notes">Notes (optionnel)</Label>
          <Textarea
            id="notes"
            value={notesEff}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="mt-1"
            disabled={blocked}
          />
        </div>
      </section>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 sticky bottom-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-lg">
        <Link
          href="/qualiopi/fiches-pre-formation"
          className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
        >
          <ArrowLeft className="h-4 w-4" /> Retour aux fiches
        </Link>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleCreate(false)}
            disabled={blocked || creating || creatingSig}
          >
            <FileText className="mr-2 h-4 w-4" />
            {creating ? "Création…" : "Créer le devis brouillon"}
          </Button>
          <Button
            type="button"
            onClick={() => handleCreate(true)}
            disabled={blocked || creating || creatingSig}
            className="bg-red-600 hover:bg-red-700"
          >
            <Send className="mr-2 h-4 w-4" />
            {creatingSig ? "Envoi…" : "Créer + envoyer pour signature"}
            <Sparkles className="ml-2 h-3 w-3 opacity-70" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function RecapRow({ label, value, multiline }: { label: string; value?: string | number | null; multiline?: boolean }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`text-sm text-gray-800 dark:text-gray-200 ${multiline ? "whitespace-pre-wrap" : ""}`}>{value}</p>
    </div>
  );
}
