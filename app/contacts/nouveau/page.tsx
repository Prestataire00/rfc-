"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notify } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CONTACT_TYPES } from "@/lib/constants";
import { useApi, useApiMutation } from "@/hooks/useApi";
import { ApiError } from "@/lib/fetcher";

interface Entreprise {
  id: string;
  nom: string;
}

type ContactCreated = { id: string; prenom: string; nom: string };

const typeOptions = Object.entries(CONTACT_TYPES).map(([key, val]) => ({
  value: key,
  label: val.label,
}));

export default function NouveauContactPage() {
  const router = useRouter();

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

  const { data: entreprisesRaw } = useApi<Entreprise[]>("/api/entreprises");
  const entreprises: Entreprise[] = Array.isArray(entreprisesRaw) ? entreprisesRaw : [];
  const { trigger: createContact, isMutating: saving } = useApiMutation<Record<string, unknown>, ContactCreated>(
    "/api/contacts",
    "POST"
  );

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

    try {
      const payload: Record<string, unknown> = { ...form };
      if (!payload.entrepriseId) delete payload.entrepriseId;
      if (!payload.telephone) delete payload.telephone;
      if (!payload.poste) delete payload.poste;
      if (!payload.notes) delete payload.notes;

      const contact = await createContact(payload);
      notify.success("Contact cree", `${contact.prenom} ${contact.nom}`);
      router.push(`/contacts/${contact.id}`);
    } catch (err: unknown) {
      let msg = "Erreur lors de la creation du contact";
      if (err instanceof ApiError) {
        const body = err.body as { error?: unknown } | null;
        const errBody = body?.error;
        if (typeof errBody === "string") {
          msg = errBody;
        } else if (errBody && typeof errBody === "object" && "fieldErrors" in errBody) {
          const fields = Object.entries((errBody as { fieldErrors: Record<string, string[]> }).fieldErrors)
            .map(([k, v]) => `${k}: ${v.join(", ")}`)
            .join(" | ");
          if (fields) msg = fields;
        } else {
          msg = err.message || msg;
        }
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setError(msg);
      notify.error("Erreur", msg);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href="/contacts"
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-300 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux contacts
        </Link>
        <h1 className="text-2xl font-bold text-gray-100">Nouveau contact</h1>
        <p className="text-sm text-gray-400 mt-1">Ajoutez un nouveau client, prospect ou stagiaire</p>
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
              <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="jean.dupont@exemple.fr" required
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
                placeholder="Sélectionner une entreprise"
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
            href="/contacts"
            className="inline-flex items-center rounded-md border border-gray-600 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors"
          >
            Annuler
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? "Création..." : "Créer le contact"}
          </Button>
        </div>
      </form>
    </div>
  );
}
