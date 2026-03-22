"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NouvelleEntreprisePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    nom: "",
    secteur: "",
    adresse: "",
    ville: "",
    codePostal: "",
    siret: "",
    email: "",
    telephone: "",
    site: "",
    notes: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const payload: Record<string, unknown> = { ...form };
      // Remove empty optional fields
      Object.keys(payload).forEach((key) => {
        if (key !== "nom" && !payload[key]) delete payload[key];
      });

      const res = await fetch("/api/entreprises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        const fieldErrors = data.error?.fieldErrors;
        if (fieldErrors) {
          const msgs = Object.values(fieldErrors).flat().join(", ");
          throw new Error(msgs || "Erreur de validation");
        }
        throw new Error(data?.error?.message || data?.error || "Erreur lors de la création");
      }

      const entreprise = await res.json();
      router.push(`/entreprises/${entreprise.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href="/entreprises"
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-300 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux entreprises
        </Link>
        <h1 className="text-2xl font-bold text-gray-100">Nouvelle entreprise</h1>
        <p className="text-sm text-gray-400 mt-1">Ajoutez une nouvelle entreprise à votre CRM</p>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-900/20 border border-red-700 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">Informations générales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nom">Raison sociale <span className="text-red-500">*</span></Label>
              <Input
                id="nom"
                name="nom"
                value={form.nom}
                onChange={handleChange}
                placeholder="Acme Corp"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="secteur">Secteur d'activité</Label>
              <Input
                id="secteur"
                name="secteur"
                value={form.secteur}
                onChange={handleChange}
                placeholder="Informatique, BTP, Santé..."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="siret">SIRET</Label>
              <Input
                id="siret"
                name="siret"
                value={form.siret}
                onChange={handleChange}
                placeholder="12345678901234"
                maxLength={14}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">Adresse</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="adresse">Adresse</Label>
              <Input
                id="adresse"
                name="adresse"
                value={form.adresse}
                onChange={handleChange}
                placeholder="1 rue de la Paix"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="codePostal">Code postal</Label>
                <Input
                  id="codePostal"
                  name="codePostal"
                  value={form.codePostal}
                  onChange={handleChange}
                  placeholder="75001"
                  maxLength={10}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ville">Ville</Label>
                <Input
                  id="ville"
                  name="ville"
                  value={form.ville}
                  onChange={handleChange}
                  placeholder="Paris"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">Coordonnées</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="contact@acme.fr"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="telephone">Téléphone</Label>
              <Input
                id="telephone"
                name="telephone"
                type="tel"
                value={form.telephone}
                onChange={handleChange}
                placeholder="01 23 45 67 89"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="site">Site web</Label>
              <Input
                id="site"
                name="site"
                type="url"
                value={form.site}
                onChange={handleChange}
                placeholder="https://www.acme.fr"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes internes</Label>
              <Textarea
                id="notes"
                name="notes"
                value={form.notes}
                onChange={handleChange}
                placeholder="Informations complémentaires..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link
            href="/entreprises"
            className="inline-flex items-center rounded-md border border-gray-600 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors"
          >
            Annuler
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? "Création..." : "Créer l'entreprise"}
          </Button>
        </div>
      </form>
    </div>
  );
}
