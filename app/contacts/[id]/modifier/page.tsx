"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
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

interface ContactData {
  nom?: string;
  prenom?: string;
  email?: string | null;
  telephone?: string | null;
  poste?: string | null;
  type?: string;
  entrepriseId?: string | null;
  notes?: string | null;
  dateNaissance?: string | null;
  numeroSecuriteSociale?: string | null;
  numeroPasseportPrevention?: string | null;
  besoinsAdaptation?: string | null;
  niveauFormation?: string | null;
  // Champs RFC paper
  sexe?: string | null;
  lieuNaissance?: string | null;
  pays?: string | null;
  adressePerso?: string | null;
  codePostalPerso?: string | null;
  villePerso?: string | null;
  numeroCartePro?: string | null;
  numeroFranceTravail?: string | null;
  diplomeObtenu?: string | null;
}

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
  { value: "bac+3", label: "BAC+3" },
  { value: "bac+5", label: "BAC+5 ou plus" },
  { value: "autre", label: "Autre" },
];

export default function ModifierContactPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

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
    // Stagiaire-only legacy
    numeroPasseportPrevention: "",
    besoinsAdaptation: "",
  });
  const [secuEditable, setSecuEditable] = useState(false);
  const [secuMasked, setSecuMasked] = useState("");

  const { data: contact, error: contactError, isLoading: loadingContact } = useApi<ContactData>(`/api/contacts/${id}`);
  const { data: entreprisesData, isLoading: loadingEnts } = useApi<Entreprise[]>("/api/entreprises");
  const entreprises: Entreprise[] = Array.isArray(entreprisesData) ? entreprisesData : [];
  const loading = loadingContact || loadingEnts;
  const { trigger: updateContact, isMutating: saving } = useApiMutation<Record<string, unknown>>(`/api/contacts/${id}`, "PUT");

  useEffect(() => {
    if (!contact) return;
    const rawSecu = contact.numeroSecuriteSociale ?? "";
    setSecuMasked(rawSecu ? `••••••••••••${rawSecu.slice(-3)}` : "");
    setForm({
      nom: contact.nom ?? "",
      prenom: contact.prenom ?? "",
      sexe: contact.sexe ?? "",
      dateNaissance: contact.dateNaissance ? contact.dateNaissance.slice(0, 10) : "",
      lieuNaissance: contact.lieuNaissance ?? "",
      pays: contact.pays ?? "France",
      numeroSecuriteSociale: "",
      adressePerso: contact.adressePerso ?? "",
      codePostalPerso: contact.codePostalPerso ?? "",
      villePerso: contact.villePerso ?? "",
      telephone: contact.telephone ?? "",
      email: contact.email ?? "",
      numeroCartePro: contact.numeroCartePro ?? "",
      numeroFranceTravail: contact.numeroFranceTravail ?? "",
      niveauFormation: contact.niveauFormation ?? "",
      diplomeObtenu: contact.diplomeObtenu ?? "",
      type: contact.type ?? "prospect",
      entrepriseId: contact.entrepriseId ?? "",
      poste: contact.poste ?? "",
      notes: contact.notes ?? "",
      numeroPasseportPrevention: contact.numeroPasseportPrevention ?? "",
      besoinsAdaptation: contact.besoinsAdaptation ?? "",
    });
  }, [contact]);

  useEffect(() => {
    if (contactError) setError("Contact non trouvé");
  }, [contactError]);

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

    const payload: Record<string, unknown> = { ...form };
    const optionalKeys = [
      "entrepriseId", "email", "telephone", "poste", "notes", "sexe", "lieuNaissance",
      "adressePerso", "codePostalPerso", "villePerso", "numeroCartePro",
      "numeroFranceTravail", "niveauFormation", "diplomeObtenu",
      "numeroPasseportPrevention", "besoinsAdaptation",
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
    // N° secu : seulement si modifie (champ editable + rempli)
    if (!secuEditable || !form.numeroSecuriteSociale) {
      delete payload.numeroSecuriteSociale;
    } else {
      payload.numeroSecuriteSociale = form.numeroSecuriteSociale.replace(/\s/g, "");
    }

    try {
      await updateContact(payload);
      router.push(`/contacts/${id}`);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message || "Erreur lors de la mise à jour");
      } else {
        setError(err instanceof Error ? err.message : "Une erreur est survenue");
      }
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Modifier le contact</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Mettez à jour les informations issues de la fiche d&apos;inscription individuelle
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
                  <input type="radio" name="sexe" value="M" checked={form.sexe === "M"} onChange={handleChange} className="text-red-600 focus:ring-red-500" />
                  Masculin
                </label>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="radio" name="sexe" value="F" checked={form.sexe === "F"} onChange={handleChange} className="text-red-600 focus:ring-red-500" />
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="numeroSecuriteSociale">N° de securite sociale</Label>
                  {!secuEditable && secuMasked && (
                    <button type="button" onClick={() => setSecuEditable(true)} className="text-xs text-red-600 hover:underline">Modifier</button>
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
                  <Input value={secuMasked} disabled className="font-mono bg-gray-100 dark:bg-gray-900" />
                )}
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
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="jean.dupont@exemple.fr" />
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
                    <input type="radio" name="type" value={opt.value} checked={form.type === opt.value} onChange={handleChange} className="text-red-600 focus:ring-red-500" />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="entrepriseId">Entreprise</Label>
              <Select id="entrepriseId" name="entrepriseId" value={form.entrepriseId} onChange={handleChange} options={entrepriseOptions} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="poste">Poste</Label>
              <Input id="poste" name="poste" value={form.poste} onChange={handleChange} placeholder="Responsable formation" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" value={form.notes} onChange={handleChange} placeholder="Informations complémentaires..." rows={3} />
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
              <div className="space-y-1.5">
                <Label htmlFor="numeroPasseportPrevention">Numero Passeport Prevention</Label>
                <Input id="numeroPasseportPrevention" name="numeroPasseportPrevention" value={form.numeroPasseportPrevention} onChange={handleChange} placeholder="Obligation ministerielle (decret 2022-1434)" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="besoinsAdaptation">Besoins d&apos;adaptation / RQTH</Label>
                <Textarea id="besoinsAdaptation" name="besoinsAdaptation" value={form.besoinsAdaptation} onChange={handleChange} placeholder="Contraintes, amenagements souhaites, RQTH..." rows={3} />
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end gap-3">
          <Link
            href={`/contacts/${id}`}
            className="inline-flex items-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
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
