"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NIVEAUX_FORMATION } from "@/lib/constants";

const niveauOptions = NIVEAUX_FORMATION.map((n) => ({ value: n.value, label: n.label }));

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
  });

  useEffect(() => {
    fetch(`/api/formations/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Formation introuvable");
        return res.json();
      })
      .then((data) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const payload: Record<string, unknown> = {
        titre: form.titre,
        niveau: form.niveau,
        actif: form.actif,
        duree: form.duree ? Number(form.duree) : undefined,
        tarif: form.tarif ? Number(form.tarif) : undefined,
      };
      if (form.description) payload.description = form.description;
      if (form.prerequis) payload.prerequis = form.prerequis;
      if (form.objectifs) payload.objectifs = form.objectifs;
      if (form.categorie) payload.categorie = form.categorie;

      const res = await fetch(`/api/formations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error?.message || "Erreur lors de la mise à jour");
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
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href={`/formations/${id}`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à la formation
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Modifier la formation</h1>
        <p className="text-sm text-gray-500 mt-1">Mettez à jour les informations de la formation</p>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
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
                placeholder="Excel avancé pour professionnels"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="categorie">Catégorie</Label>
              <Input
                id="categorie"
                name="categorie"
                value={form.categorie}
                onChange={handleChange}
                placeholder="Bureautique, Management, Langue..."
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
            <div className="flex items-center gap-3">
              <input
                id="actif"
                name="actif"
                type="checkbox"
                checked={form.actif}
                onChange={handleChange}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              <Label htmlFor="actif" className="cursor-pointer">
                Formation active (visible dans le catalogue)
              </Label>
            </div>
          </CardContent>
        </Card>

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
                  step="0.5"
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
          </CardContent>
        </Card>

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
                rows={4}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prerequis">Prérequis</Label>
              <Textarea
                id="prerequis"
                name="prerequis"
                value={form.prerequis}
                onChange={handleChange}
                placeholder="Connaissances requises avant la formation..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link
            href={`/formations/${id}`}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
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
