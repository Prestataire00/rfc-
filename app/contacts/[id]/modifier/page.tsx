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
    dateNaissance: "",
    numeroSecuriteSociale: "",
    numeroPasseportPrevention: "",
    besoinsAdaptation: "",
    niveauFormation: "",
  });
  const [secuEditable, setSecuEditable] = useState(false);
  const [secuMasked, setSecuMasked] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`/api/contacts/${id}`).then((r) => r.ok ? r.json() : null),
      fetch("/api/entreprises").then((r) => r.ok ? r.json() : []),
    ])
      .then(([contact, ents]) => {
        if (!contact) { setError("Contact non trouvé"); return; }
        const rawSecu = contact.numeroSecuriteSociale ?? "";
        setSecuMasked(rawSecu ? `••••••••••••${rawSecu.slice(-3)}` : "");
        setForm({
          nom: contact.nom ?? "",
          prenom: contact.prenom ?? "",
          email: contact.email ?? "",
          telephone: contact.telephone ?? "",
          poste: contact.poste ?? "",
          type: contact.type ?? "prospect",
          entrepriseId: contact.entrepriseId ?? "",
          notes: contact.notes ?? "",
          dateNaissance: contact.dateNaissance ? contact.dateNaissance.slice(0, 10) : "",
          numeroSecuriteSociale: "",
          numeroPasseportPrevention: contact.numeroPasseportPrevention ?? "",
          besoinsAdaptation: contact.besoinsAdaptation ?? "",
          niveauFormation: contact.niveauFormation ?? "",
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
      if (!payload.numeroPasseportPrevention) delete payload.numeroPasseportPrevention;
      if (!payload.besoinsAdaptation) delete payload.besoinsAdaptation;
      if (!payload.niveauFormation) delete payload.niveauFormation;
      // Date naissance
      if (form.dateNaissance) {
        payload.dateNaissance = new Date(form.dateNaissance).toISOString();
      } else {
        delete payload.dateNaissance;
      }
      // N° secu : seulement si modifie (champ editable + rempli)
      if (!secuEditable || !form.numeroSecuriteSociale) {
        delete payload.numeroSecuriteSociale;
      } else {
        payload.numeroSecuriteSociale = form.numeroSecuriteSociale.replace(/\s/g, "");
      }

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

        {/* Donnees stagiaire (Qualiopi / BPF / Passeport Prevention) */}
        {form.type === "stagiaire" && (
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-base">Donnees stagiaire (Qualiopi)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="dateNaissance">Date de naissance</Label>
                  <Input id="dateNaissance" name="dateNaissance" type="date" value={form.dateNaissance} onChange={handleChange} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="niveauFormation">Niveau de formation</Label>
                  <select
                    id="niveauFormation"
                    name="niveauFormation"
                    value={form.niveauFormation}
                    onChange={handleChange}
                    className="w-full h-10 rounded-md border border-gray-600 bg-gray-800 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">Non precise</option>
                    <option value="sans_diplome">Sans diplome</option>
                    <option value="cap">CAP / BEP</option>
                    <option value="bac">BAC</option>
                    <option value="bac+2">BAC+2</option>
                    <option value="bac+3">BAC+3</option>
                    <option value="bac+5">BAC+5 ou plus</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="numeroSecuriteSociale">Numero de securite sociale</Label>
                  {!secuEditable && secuMasked && (
                    <button type="button" onClick={() => setSecuEditable(true)} className="text-xs text-red-500 hover:underline">Modifier</button>
                  )}
                </div>
                {secuEditable || !secuMasked ? (
                  <Input
                    id="numeroSecuriteSociale"
                    name="numeroSecuriteSociale"
                    value={form.numeroSecuriteSociale}
                    onChange={(e) => setForm((p) => ({ ...p, numeroSecuriteSociale: e.target.value.replace(/[^0-9\s]/g, "") }))}
                    placeholder="1 99 12 75 123 456 78"
                    maxLength={21}
                    className="font-mono"
                  />
                ) : (
                  <Input value={secuMasked} disabled className="font-mono bg-gray-900" />
                )}
                <p className="text-xs text-gray-500">Donnee sensible. Accessible uniquement en lecture pour audit Qualiopi.</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="numeroPasseportPrevention">Numero Passeport Prevention</Label>
                <Input
                  id="numeroPasseportPrevention"
                  name="numeroPasseportPrevention"
                  value={form.numeroPasseportPrevention}
                  onChange={handleChange}
                  placeholder="Obligation ministerielle (decret 2022-1434)"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="besoinsAdaptation">Besoins d&apos;adaptation / RQTH</Label>
                <Textarea
                  id="besoinsAdaptation"
                  name="besoinsAdaptation"
                  value={form.besoinsAdaptation}
                  onChange={handleChange}
                  placeholder="Contraintes, amenagements souhaites, RQTH..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        )}

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
