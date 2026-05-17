"use client";

// Page d'édition d'un projet — clone structurel de /projets/nouveau mais en
// mode édition : préchargement des données via GET /api/projets/[id], puis
// PUT à la soumission. Retour vers /projets/[id] après succès.

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Briefcase, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useApi } from "@/hooks/useApi";
import { api, ApiError } from "@/lib/fetcher";
import { notify } from "@/lib/toast";

type Entreprise = { id: string; nom: string };
type Formateur = { id: string; nom: string; prenom: string };
type ProjetData = {
  nom: string;
  description: string | null;
  statut: string;
  priorite: string;
  entrepriseId: string | null;
  chefProjet: string | null;
  budget: number | null;
  dateDebut: string | null;
  dateFinPrevue: string | null;
  objectifs: string | null;
  livrables: string | null;
  formateurs: Array<{ formateur: { id: string } }>;
};

function dateToInput(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 10);
}

export default function ProjetEditerPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const { data: projet, isLoading, error } = useApi<ProjetData>(`/api/projets/${id}`);
  const { data: entreprises } = useApi<Entreprise[]>("/api/entreprises");
  const { data: formateurs } = useApi<Formateur[]>("/api/formateurs");

  const [nom, setNom] = useState("");
  const [description, setDescription] = useState("");
  const [statut, setStatut] = useState("brouillon");
  const [priorite, setPriorite] = useState("normale");
  const [entrepriseId, setEntrepriseId] = useState("");
  const [chefProjet, setChefProjet] = useState("");
  const [budget, setBudget] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFinPrevue, setDateFinPrevue] = useState("");
  const [objectifs, setObjectifs] = useState("");
  const [livrables, setLivrables] = useState("");
  const [formateurIds, setFormateurIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Pré-remplir depuis le projet chargé
  useEffect(() => {
    if (!projet) return;
    setNom(projet.nom ?? "");
    setDescription(projet.description ?? "");
    setStatut(projet.statut ?? "brouillon");
    setPriorite(projet.priorite ?? "normale");
    setEntrepriseId(projet.entrepriseId ?? "");
    setChefProjet(projet.chefProjet ?? "");
    setBudget(projet.budget != null ? String(projet.budget) : "");
    setDateDebut(dateToInput(projet.dateDebut));
    setDateFinPrevue(dateToInput(projet.dateFinPrevue));
    setObjectifs(projet.objectifs ?? "");
    setLivrables(projet.livrables ?? "");
    setFormateurIds(new Set((projet.formateurs ?? []).map((pf) => pf.formateur.id)));
  }, [projet]);

  const toggleFormateur = (fid: string) =>
    setFormateurIds((prev) => {
      const next = new Set(prev);
      if (next.has(fid)) next.delete(fid);
      else next.add(fid);
      return next;
    });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nom.trim()) {
      notify.error("Le nom du projet est requis");
      return;
    }
    setSubmitting(true);
    try {
      await api.put(`/api/projets/${id}`, {
        nom: nom.trim(),
        description: description.trim() || null,
        statut,
        priorite,
        entrepriseId: entrepriseId || null,
        chefProjet: chefProjet.trim() || null,
        budget: budget ? Number(budget) : null,
        dateDebut: dateDebut ? new Date(dateDebut).toISOString() : null,
        dateFinPrevue: dateFinPrevue ? new Date(dateFinPrevue).toISOString() : null,
        objectifs: objectifs.trim() || null,
        livrables: livrables.trim() || null,
        formateurIds: Array.from(formateurIds),
      });
      notify.success("Projet enregistré");
      router.push(`/projets/${id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        notify.error(err.message);
      } else {
        notify.error("Erreur d'enregistrement");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    const ok = window.confirm(`Supprimer définitivement le projet « ${nom} » ? Cette action est irréversible.`);
    if (!ok) return;
    setDeleting(true);
    try {
      await api.delete(`/api/projets/${id}`);
      notify.success("Projet supprimé");
      router.push("/projets");
    } catch (err) {
      if (err instanceof ApiError) {
        notify.error(err.message);
      } else {
        notify.error("Erreur de suppression");
      }
    } finally {
      setDeleting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
      </div>
    );
  }
  if (error || !projet) {
    return (
      <div className="p-6 text-red-500">Projet introuvable</div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Modifier le projet"
        description={nom || "Édition d'un engagement client"}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="space-y-4 rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Informations générales
          </h2>

          <div>
            <Label htmlFor="nom">Nom du projet *</Label>
            <Input
              id="nom"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              required
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="statut">Statut</Label>
              <select
                id="statut"
                value={statut}
                onChange={(e) => setStatut(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="brouillon">Brouillon</option>
                <option value="en_cours">En cours</option>
                <option value="en_pause">En pause</option>
                <option value="termine">Terminé</option>
                <option value="archive">Archivé</option>
              </select>
            </div>
            <div>
              <Label htmlFor="priorite">Priorité</Label>
              <select
                id="priorite"
                value={priorite}
                onChange={(e) => setPriorite(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="basse">Basse</option>
                <option value="normale">Normale</option>
                <option value="haute">Haute</option>
                <option value="critique">Critique</option>
              </select>
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Pilotage
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="entreprise">Entreprise cliente</Label>
              <select
                id="entreprise"
                value={entrepriseId}
                onChange={(e) => setEntrepriseId(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">— Aucune —</option>
                {entreprises?.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nom}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="chef">Chef de projet (interne)</Label>
              <Input
                id="chef"
                value={chefProjet}
                onChange={(e) => setChefProjet(e.target.value)}
                placeholder="Nom du responsable"
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="dateDebut">Date de début</Label>
              <Input
                id="dateDebut"
                type="date"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="dateFinPrevue">Date de fin prévue</Label>
              <Input
                id="dateFinPrevue"
                type="date"
                value={dateFinPrevue}
                onChange={(e) => setDateFinPrevue(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="budget">Budget (TTC)</Label>
              <Input
                id="budget"
                type="number"
                step="100"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="0"
                className="mt-1"
              />
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Équipe formateurs
          </h2>

          {formateurs && formateurs.length > 0 ? (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
              {formateurs.map((f) => (
                <label
                  key={f.id}
                  className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer hover:bg-muted/40"
                >
                  <input
                    type="checkbox"
                    checked={formateurIds.has(f.id)}
                    onChange={() => toggleFormateur(f.id)}
                    className="h-4 w-4 rounded border-input"
                  />
                  {f.prenom} {f.nom}
                </label>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aucun formateur disponible.
            </p>
          )}
        </section>

        <section className="space-y-4 rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Pédagogie & livrables
          </h2>

          <div>
            <Label htmlFor="objectifs">Objectifs</Label>
            <Textarea
              id="objectifs"
              value={objectifs}
              onChange={(e) => setObjectifs(e.target.value)}
              rows={3}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="livrables">Livrables attendus</Label>
            <Textarea
              id="livrables"
              value={livrables}
              onChange={(e) => setLivrables(e.target.value)}
              rows={3}
              className="mt-1"
            />
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-3">
            <Button type="submit" disabled={submitting}>
              <Briefcase className="mr-2 h-4 w-4" />
              {submitting ? "Enregistrement…" : "Enregistrer"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/projets/${id}`)}
            >
              Annuler
            </Button>
          </div>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {deleting ? "Suppression…" : "Supprimer le projet"}
          </Button>
        </div>
      </form>
    </div>
  );
}
