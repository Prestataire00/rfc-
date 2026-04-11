"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Star } from "lucide-react";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NIVEAUX_FORMATION, MODALITES_FORMATION, STATUTS_FORMATION, TYPES_FINANCEMENT } from "@/lib/constants";

const niveauOptions = NIVEAUX_FORMATION.map((n) => ({ value: n.value, label: n.label }));
const modaliteOptions = Object.entries(MODALITES_FORMATION).map(([value, { label }]) => ({ value, label }));
const statutOptions = Object.entries(STATUTS_FORMATION).map(([value, { label }]) => ({ value, label }));

export default function ModifierFormationPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    titre: "",
    description: "",
    duree: "",
    tarif: "",
    niveau: "tous",
    prerequis: "",
    objectifs: "",
    categorie: "",
    actif: true,
    modalite: "presentiel",
    statut: "brouillon",
    publicCible: "",
    contenuProgramme: "",
    methodesPedagogiques: "",
    methodesEvaluation: "",
    moyensTechniques: "",
    accessibilite: "",
    indicateursResultats: "",
    typesFinancement: [] as string[],
    certifiante: false,
    codeRNCP: "",
    dureeRecyclage: "",
    misEnAvant: false,
  });

  useEffect(() => {
    fetch(`/api/formations/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Formation introuvable");
        return res.json();
      })
      .then((data) => {
        let financements: string[] = [];
        try {
          financements = data.typesFinancement ? JSON.parse(data.typesFinancement) : [];
        } catch { financements = []; }

        setForm({
          titre: data.titre ?? "",
          description: data.description ?? "",
          duree: data.duree != null ? String(data.duree) : "",
          tarif: data.tarif != null ? String(data.tarif) : "",
          niveau: data.niveau ?? "tous",
          prerequis: data.prerequis ?? "",
          objectifs: data.objectifs ?? "",
          categorie: data.categorie ?? "",
          actif: data.actif ?? true,
          modalite: data.modalite ?? "presentiel",
          statut: data.statut ?? "brouillon",
          publicCible: data.publicCible ?? "",
          contenuProgramme: data.contenuProgramme ?? "",
          methodesPedagogiques: data.methodesPedagogiques ?? "",
          methodesEvaluation: data.methodesEvaluation ?? "",
          moyensTechniques: data.moyensTechniques ?? "",
          accessibilite: data.accessibilite ?? "",
          indicateursResultats: data.indicateursResultats ?? "",
          typesFinancement: financements,
          certifiante: data.certifiante ?? false,
          codeRNCP: data.codeRNCP ?? "",
          dureeRecyclage: data.dureeRecyclage != null ? String(data.dureeRecyclage) : "",
          misEnAvant: data.misEnAvant ?? false,
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      setForm((prev) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleFinancementToggle = (value: string) => {
    setForm((prev) => ({
      ...prev,
      typesFinancement: prev.typesFinancement.includes(value)
        ? prev.typesFinancement.filter((v) => v !== value)
        : [...prev.typesFinancement, value],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const payload: Record<string, unknown> = {
        titre: form.titre,
        niveau: form.niveau,
        actif: form.actif,
        modalite: form.modalite,
        statut: form.statut,
        certifiante: form.certifiante,
        misEnAvant: form.misEnAvant,
        duree: form.duree ? Number(form.duree) : undefined,
        tarif: form.tarif ? Number(form.tarif) : undefined,
        typesFinancement: JSON.stringify(form.typesFinancement),
        description: form.description || undefined,
        prerequis: form.prerequis || undefined,
        objectifs: form.objectifs || undefined,
        categorie: form.categorie || undefined,
        publicCible: form.publicCible || undefined,
        contenuProgramme: form.contenuProgramme || undefined,
        methodesPedagogiques: form.methodesPedagogiques || undefined,
        methodesEvaluation: form.methodesEvaluation || undefined,
        moyensTechniques: form.moyensTechniques || undefined,
        accessibilite: form.accessibilite || undefined,
        indicateursResultats: form.indicateursResultats || undefined,
        codeRNCP: form.codeRNCP || undefined,
        dureeRecyclage: form.dureeRecyclage ? Number(form.dureeRecyclage) : null,
      };

      const res = await fetch(`/api/formations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        let msg = "Erreur lors de la mise à jour";
        if (data?.error) {
          if (typeof data.error === "string") {
            msg = data.error;
          } else if (data.error.fieldErrors) {
            const fields = Object.entries(data.error.fieldErrors)
              .map(([k, v]) => `${k}: ${(v as string[]).join(", ")}`)
              .join(" | ");
            if (fields) msg = fields;
          } else if (data.error.formErrors?.length) {
            msg = data.error.formErrors[0];
          }
        }
        throw new Error(msg);
      }

      router.push(`/formations/${id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center py-24">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <Breadcrumb items={[
          { label: "Formations", href: "/formations" },
          { label: "Formation", href: `/formations/${id}` },
          { label: "Modifier" },
        ]} />
        <h1 className="text-2xl font-bold text-gray-100">Modifier la formation</h1>
        <p className="text-sm text-gray-400 mt-1">Mettez à jour les informations de la formation</p>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-900/20 border border-red-700 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Informations principales */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">Informations principales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="titre">Titre <span className="text-red-500">*</span></Label>
              <Input
                id="titre"
                name="titre"
                value={form.titre}
                onChange={handleChange}
                placeholder="SST - Sauveteur Secouriste du Travail"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="categorie">Catégorie</Label>
                <Input
                  id="categorie"
                  name="categorie"
                  value={form.categorie}
                  onChange={handleChange}
                  placeholder="Sécurité, Incendie, Secourisme..."
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="niveau">Niveau</Label>
                <Select
                  id="niveau"
                  name="niveau"
                  value={form.niveau}
                  onChange={handleChange}
                  options={niveauOptions}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="modalite">Modalité</Label>
                <Select
                  id="modalite"
                  name="modalite"
                  value={form.modalite}
                  onChange={handleChange}
                  options={modaliteOptions}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="statut">Statut</Label>
                <Select
                  id="statut"
                  name="statut"
                  value={form.statut}
                  onChange={handleChange}
                  options={statutOptions}
                />
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <input
                  id="actif"
                  name="actif"
                  type="checkbox"
                  checked={form.actif}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-gray-600 text-red-600"
                />
                <Label htmlFor="actif" className="cursor-pointer">Active</Label>
              </div>
              <div className="flex items-center gap-3">
                <input
                  id="misEnAvant"
                  name="misEnAvant"
                  type="checkbox"
                  checked={form.misEnAvant}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-gray-600 text-red-600"
                />
                <Label htmlFor="misEnAvant" className="cursor-pointer flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 text-amber-400" />
                  Mise en avant
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Durée et tarification */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">Durée et tarification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="duree">Durée (heures) <span className="text-red-500">*</span></Label>
                <Input
                  id="duree"
                  name="duree"
                  type="number"
                  min="1"
                  step="1"
                  value={form.duree}
                  onChange={handleChange}
                  placeholder="14"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tarif">Tarif (€ HT) <span className="text-red-500">*</span></Label>
                <Input
                  id="tarif"
                  name="tarif"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.tarif}
                  onChange={handleChange}
                  placeholder="1200"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Types de financement acceptés</Label>
              <div className="flex flex-wrap gap-2">
                {TYPES_FINANCEMENT.map((tf) => (
                  <button
                    key={tf.value}
                    type="button"
                    onClick={() => handleFinancementToggle(tf.value)}
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      form.typesFinancement.includes(tf.value)
                        ? "bg-red-900/30 text-red-400 border-red-700"
                        : "bg-gray-700 text-gray-400 border-gray-600 hover:border-gray-500"
                    }`}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Certification */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">Certification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                id="certifiante"
                name="certifiante"
                type="checkbox"
                checked={form.certifiante}
                onChange={handleChange}
                className="h-4 w-4 rounded border-gray-600 text-red-600"
              />
              <Label htmlFor="certifiante" className="cursor-pointer">Formation certifiante</Label>
            </div>
            {form.certifiante && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="codeRNCP">Code RNCP</Label>
                  <Input
                    id="codeRNCP"
                    name="codeRNCP"
                    value={form.codeRNCP}
                    onChange={handleChange}
                    placeholder="RNCP12345"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dureeRecyclage">Recyclage (mois)</Label>
                  <Input
                    id="dureeRecyclage"
                    name="dureeRecyclage"
                    type="number"
                    min="1"
                    value={form.dureeRecyclage}
                    onChange={handleChange}
                    placeholder="24"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contenu pédagogique */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">Contenu pédagogique</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Présentation générale de la formation..."
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="objectifs">Objectifs pédagogiques</Label>
              <Textarea
                id="objectifs"
                name="objectifs"
                value={form.objectifs}
                onChange={handleChange}
                placeholder="À la fin de cette formation, les participants seront capables de..."
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contenuProgramme">Contenu du programme</Label>
              <Textarea
                id="contenuProgramme"
                name="contenuProgramme"
                value={form.contenuProgramme}
                onChange={handleChange}
                placeholder="Module 1 : ... &#10;Module 2 : ..."
                rows={4}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="publicCible">Public cible</Label>
              <Textarea
                id="publicCible"
                name="publicCible"
                value={form.publicCible}
                onChange={handleChange}
                placeholder="Salariés, demandeurs d'emploi, professionnels de santé..."
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prerequis">Prérequis</Label>
              <Textarea
                id="prerequis"
                name="prerequis"
                value={form.prerequis}
                onChange={handleChange}
                placeholder="Aucun prérequis / Être titulaire de..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Méthodes et moyens */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">Méthodes et moyens</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="methodesPedagogiques">Méthodes pédagogiques</Label>
              <Textarea
                id="methodesPedagogiques"
                name="methodesPedagogiques"
                value={form.methodesPedagogiques}
                onChange={handleChange}
                placeholder="Apports théoriques, mises en situation, exercices pratiques..."
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="methodesEvaluation">Méthodes d'évaluation</Label>
              <Textarea
                id="methodesEvaluation"
                name="methodesEvaluation"
                value={form.methodesEvaluation}
                onChange={handleChange}
                placeholder="QCM, mise en situation, évaluation pratique..."
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="moyensTechniques">Moyens techniques</Label>
              <Textarea
                id="moyensTechniques"
                name="moyensTechniques"
                value={form.moyensTechniques}
                onChange={handleChange}
                placeholder="Mannequins, défibrillateur, extincteurs..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Accessibilité et indicateurs */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">Accessibilité et résultats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="accessibilite">Informations d'accessibilité</Label>
              <Textarea
                id="accessibilite"
                name="accessibilite"
                value={form.accessibilite}
                onChange={handleChange}
                placeholder="Formation accessible aux personnes en situation de handicap..."
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="indicateursResultats">Indicateurs de résultats</Label>
              <Textarea
                id="indicateursResultats"
                name="indicateursResultats"
                value={form.indicateursResultats}
                onChange={handleChange}
                placeholder="Taux de réussite : 95% — Taux de satisfaction : 4.8/5"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link
            href={`/formations/${id}`}
            className="inline-flex items-center rounded-md border border-gray-600 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors"
          >
            Annuler
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? "Enregistrement..." : "Enregistrer les modifications"}
          </Button>
        </div>
      </form>
    </div>
  );
}
