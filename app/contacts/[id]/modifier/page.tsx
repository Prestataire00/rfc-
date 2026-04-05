"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CONTACT_TYPES } from "@/lib/constants";

interface Entreprise {
  id: string;
  nom: string;
}

const typeOptions = Object.entries(CONTACT_TYPES).map(([key, val]) => ({
  value: key,
  label: val.label,
}));

export default function ModifierContactPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [entreprises, setEntreprises] = useState<Entreprise[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    nom: "",
    prenom: "",
    email: "",
    telephone: "",
    poste: "",
    type: "prospect",
    entrepriseId: "",
    notes: "",
  });

  useEffect(() => {
    Promise.all([
      fetch(`/api/contacts/${id}`).then((r) => r.ok ? r.json() : null),
      fetch("/api/entreprises").then((r) => r.ok ? r.json() : []),
    ])
      .then(([contact, ents]) => {
        if (!contact) { setError("Contact non trouvé"); return; }
        setForm({
          nom: contact.nom ?? "",
          prenom: contact.prenom ?? "",
          email: contact.email ?? "",
          telephone: contact.telephone ?? "",
          poste: contact.poste ?? "",
          type: contact.type ?? "prospect",
          entrepriseId: contact.entrepriseId ?? "",
          notes: contact.notes ?? "",
        });
        setEntreprises(Array.isArray(ents) ? ents : []);
      })
      .catch(() => setError("Erreur lors du chargement"))
      .finally(() => setLoading(false));
  }, [id]);

  const entrepriseOptions = [
    { value: "", label: "Aucune entreprise" },
    ...entreprises.map((e) => ({ value: e.id, label: e.nom })),
  ];

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const payload: Record<string, unknown> = { ...form };
      if (!payload.entrepriseId) delete payload.entrepriseId;
      if (!payload.email) delete payload.email;
      if (!payload.telephone) delete payload.telephone;
      if (!payload.poste) delete payload.poste;
      if (!payload.notes) delete payload.notes;

      const res = await fetch(`/api/contacts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error?.message || "Erreur lors de la mise à jour");
      }

      router.push(`/contacts/${id}`);
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
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <Breadcrumb items={[
          { label: "Contacts", href: "/contacts" },
          { label: "Contact", href: `/contacts/${id}` },
          { label: "Modifier" },
        ]} />
        <h1 className="text-2xl font-bold text-gray-100">Modifier le contact</h1>
        <p className="text-sm text-gray-400 mt-1">Mettez à jour les informations du contact</p>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-900/20 border border-red-700 px-4 py-3 text-sm text-red-400">
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
                  placeholder="Jean"
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
                  placeholder="Dupont"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="type">Type <span className="text-red-500">*</span></Label>
              <Select
                id="type"
                name="type"
                value={form.type}
                onChange={handleChange}
                options={typeOptions}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="poste">Poste</Label>
              <Input
                id="poste"
                name="poste"
                value={form.poste}
                onChange={handleChange}
                placeholder="Responsable formation"
              />
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
                placeholder="jean.dupont@exemple.fr"
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
            <CardTitle className="text-base">Entreprise & Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="entrepriseId">Entreprise</Label>
              <Select
                id="entrepriseId"
                name="entrepriseId"
                value={form.entrepriseId}
                onChange={handleChange}
                options={entrepriseOptions}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
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
            href={`/contacts/${id}`}
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
