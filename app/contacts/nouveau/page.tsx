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

const niveauFormationOptions = [
  { value: "", label: "Non precise" },
  { value: "sans_diplome", label: "Sans diplome" },
  { value: "cap", label: "CAP / BEP" },
  { value: "bac", label: "BAC" },
  { value: "bac+2", label: "BAC+2" },
  { value: "autre", label: "Autre" },
];

export default function NouveauContactPage() {
  const router = useRouter();

  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    // Renseignements personnels
    nom: "",
    prenom: "",
    sexe: "",
    dateNaissance: "",
    lieuNaissance: "",
    pays: "France",
    numeroSecuriteSociale: "",
    adressePerso: "",
    codePostalPerso: "",
    villePerso: "",
    telephone: "",
    email: "",
    numeroCartePro: "",
    numeroFranceTravail: "",
    // Diplome / Experience
    niveauFormation: "",
    diplomeObtenu: "",
    // Type & rattachement
    type: "prospect",
    entrepriseId: "",
    poste: "",
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
      // Strip empty optional fields
      const optionalKeys = [
        "entrepriseId", "telephone", "poste", "notes", "sexe", "lieuNaissance",
        "adressePerso", "codePostalPerso", "villePerso", "numeroCartePro",
        "numeroFranceTravail", "niveauFormation", "diplomeObtenu",
      ];
      for (const k of optionalKeys) {
        if (!payload[k]) delete payload[k];
      }
      // Date naissance
      if (form.dateNaissance) {
        payload.dateNaissance = new Date(form.dateNaissance).toISOString();
      } else {
        delete payload.dateNaissance;
      }
      // N° secu
      if (form.numeroSecuriteSociale) {
        payload.numeroSecuriteSociale = form.numeroSecuriteSociale.replace(/\s/g, "");
      } else {
        delete payload.numeroSecuriteSociale;
      }
      // Pays defaut France : on garde toujours

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
          className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux contacts
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Nouveau contact</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Saisissez les informations issues de la fiche d&apos;inscription individuelle
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* SECTION 1 : Renseignements personnels */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base text-red-600 dark:text-red-500">
              <h2>1. Renseignements personnels</h2>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="prenom">Prénom <span className="text-red-500">*</span></Label>
                <Input id="prenom" name="prenom" value={form.prenom} onChange={handleChange} placeholder="Jean" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nom">Nom <span className="text-red-500">*</span></Label>
                <Input id="nom" name="nom" value={form.nom} onChange={handleChange} placeholder="Dupont" required />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Sexe</Label>
              <div className="flex gap-4">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="sexe"
                    value="M"
                    checked={form.sexe === "M"}
                    onChange={handleChange}
                    className="text-red-600 focus:ring-red-500"
                  />
                  Masculin
                </label>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="sexe"
                    value="F"
                    checked={form.sexe === "F"}
                    onChange={handleChange}
                    className="text-red-600 focus:ring-red-500"
                  />
                  Feminin
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="dateNaissance">Date de naissance</Label>
                <Input id="dateNaissance" name="dateNaissance" type="date" value={form.dateNaissance} onChange={handleChange} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lieuNaissance">Lieu de naissance</Label>
                <Input id="lieuNaissance" name="lieuNaissance" value={form.lieuNaissance} onChange={handleChange} placeholder="Toulon" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="pays">Pays</Label>
                <Input id="pays" name="pays" value={form.pays} onChange={handleChange} placeholder="France" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="numeroSecuriteSociale">N° de securite sociale</Label>
                <Input
                  id="numeroSecuriteSociale"
                  name="numeroSecuriteSociale"
                  value={form.numeroSecuriteSociale}
                  onChange={(e) => setForm((p) => ({ ...p, numeroSecuriteSociale: e.target.value.replace(/[^0-9\s]/g, "") }))}
                  placeholder="1 99 12 75 123 456 78"
                  maxLength={21}
                  className="font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="adressePerso">Adresse personnelle</Label>
              <Input id="adressePerso" name="adressePerso" value={form.adressePerso} onChange={handleChange} placeholder="12 rue des Lilas" />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="codePostalPerso">Code postal</Label>
                <Input id="codePostalPerso" name="codePostalPerso" value={form.codePostalPerso} onChange={handleChange} placeholder="83000" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="villePerso">Ville</Label>
                <Input id="villePerso" name="villePerso" value={form.villePerso} onChange={handleChange} placeholder="Toulon" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="telephone">Téléphone</Label>
                <Input id="telephone" name="telephone" type="tel" value={form.telephone} onChange={handleChange} placeholder="06 12 34 56 78" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
                <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="jean.dupont@exemple.fr" required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="numeroCartePro">N° carte pro CNAPS / autorisation prealable</Label>
                <Input id="numeroCartePro" name="numeroCartePro" value={form.numeroCartePro} onChange={handleChange} placeholder="CAR-XXX..." />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="numeroFranceTravail">N° allocataire France Travail</Label>
                <Input id="numeroFranceTravail" name="numeroFranceTravail" value={form.numeroFranceTravail} onChange={handleChange} placeholder="Identifiant France Travail" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 2 : Diplome / Experience */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base text-red-600 dark:text-red-500">
              <h2>2. Diplome / Experience</h2>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="niveauFormation">Niveau de formation</Label>
                <Select id="niveauFormation" name="niveauFormation" value={form.niveauFormation} onChange={handleChange} options={niveauFormationOptions} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="diplomeObtenu">Diplome obtenu (le plus eleve)</Label>
                <Input id="diplomeObtenu" name="diplomeObtenu" value={form.diplomeObtenu} onChange={handleChange} placeholder="Ex: BAC Pro Securite" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 3 : Type & rattachement */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base text-red-600 dark:text-red-500">
              <h2>3. Type &amp; rattachement</h2>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Type <span className="text-red-500">*</span></Label>
              <div className="flex gap-4 flex-wrap">
                {typeOptions.map((opt) => (
                  <label key={opt.value} className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="type"
                      value={opt.value}
                      checked={form.type === opt.value}
                      onChange={handleChange}
                      className="text-red-600 focus:ring-red-500"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="entrepriseId">Entreprise</Label>
              <Select id="entrepriseId" name="entrepriseId" value={form.entrepriseId} onChange={handleChange} options={entrepriseOptions} placeholder="Selectionner une entreprise" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="poste">Poste</Label>
              <Input id="poste" name="poste" value={form.poste} onChange={handleChange} placeholder="Responsable formation" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" value={form.notes} onChange={handleChange} placeholder="Informations complementaires..." rows={3} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link
            href="/contacts"
            className="inline-flex items-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
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
