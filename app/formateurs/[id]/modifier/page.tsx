"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { parseSpecialites } from "@/lib/utils";

export default function ModifierFormateurPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    nom: "",
    prenom: "",
    email: "",
    telephone: "",
    specialites: "",
    tarifJournalier: "",
    notes: "",
  });

  useEffect(() => {
    fetch(`/api/formateurs/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Formateur introuvable");
        return res.json();
      })
      .then((data) => {
        const specialitesArray = parseSpecialites(data.specialites ?? "[]");
        setForm({
          nom: data.nom ?? "",
          prenom: data.prenom ?? "",
          email: data.email ?? "",
          telephone: data.telephone ?? "",
          specialites: specialitesArray.join(", "),
          tarifJournalier: data.tarifJournalier != null ? String(data.tarifJournalier) : "",
          notes: data.notes ?? "",
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

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
      // Convert comma-separated specialites string to array
      const specialitesArray = form.specialites
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const payload: Record<string, unknown> = {
        nom: form.nom,
        prenom: form.prenom,
        specialites: specialitesArray,
      };
      if (form.email) payload.email = form.email;
      if (form.telephone) payload.telephone = form.telephone;
      if (form.tarifJournalier) payload.tarifJournalier = Number(form.tarifJournalier);
      if (form.notes) payload.notes = form.notes;

      const res = await fetch(`/api/formateurs/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error?.message || "Erreur lors de la mise à jour");
      }

      router.push(`/formateurs/${id}`);
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
          href={`/formateurs/${id}`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au formateur
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Modifier le formateur</h1>
        <p className="text-sm text-gray-500 mt-1">Mettez à jour les informations du formateur</p>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">Identité</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="prenom">Prénom <span className="text-red-500">*</span></Label>
                <Input
                  id="prenom"
                  name="prenom"
                  value={form.prenom}
                  onChange={handleChange}
                  placeholder="Marie"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nom">Nom <span className="text-red-500">*</span></Label>
                <Input
                  id="nom"
                  name="nom"
                  value={form.nom}
                  onChange={handleChange}
                  placeholder="Martin"
                  required
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
                placeholder="marie.martin@exemple.fr"
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
                placeholder="06 12 34 56 78"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">Expertise & Tarification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="specialites">Spécialités</Label>
              <Input
                id="specialites"
                name="specialites"
                value={form.specialites}
                onChange={handleChange}
                placeholder="Excel, PowerPoint, Management (séparées par des virgules)"
              />
              <p className="text-xs text-gray-500">
                Saisissez les spécialités séparées par des virgules
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tarifJournalier">Tarif journalier (€ HT)</Label>
              <Input
                id="tarifJournalier"
                name="tarifJournalier"
                type="number"
                min="0"
                step="0.01"
                value={form.tarifJournalier}
                onChange={handleChange}
                placeholder="600"
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
                placeholder="Informations complémentaires sur le formateur..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link
            href={`/formateurs/${id}`}
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
