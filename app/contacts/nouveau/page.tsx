"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, UserCheck, UserPlus, Mail, Phone, Building2, User, Briefcase,
  FileText, Check, ChevronDown, ChevronUp, GraduationCap, CreditCard,
} from "lucide-react";
import { notify } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { useApi, useApiMutation } from "@/hooks/useApi";
import { ApiError, api } from "@/lib/fetcher";
import {
  EntrepriseAutocomplete,
  type EntrepriseSuggestion,
} from "@/components/contacts/EntrepriseAutocomplete";

interface Entreprise {
  id: string;
  nom: string;
}

type ContactCreated = { id: string; prenom: string; nom: string };
type ContactType = "client" | "prospect";
type CategorieContact = "particulier" | "entreprise";

const TYPE_CARDS: Array<{
  value: ContactType;
  label: string;
  description: string;
  icon: typeof UserCheck;
  accent: "emerald" | "amber";
}> = [
  {
    value: "client",
    label: "Client",
    description:
      "Personne avec qui une relation commerciale est déjà engagée (devis signé, formation suivie, ou facturation en cours).",
    icon: UserCheck,
    accent: "emerald",
  },
  {
    value: "prospect",
    label: "Prospect",
    description:
      "Personne en cours de qualification. Pas encore de contrat ni de formation. Sera converti en client une fois un devis signé.",
    icon: UserPlus,
    accent: "amber",
  },
];

// Tailwind ne peut pas générer dynamiquement bg-{color}-500 → mapping manuel.
const ACCENT_CLASSES = {
  emerald: {
    border: "border-emerald-500",
    bg: "bg-emerald-500/10",
    ring: "ring-emerald-500/30",
    text: "text-emerald-300",
    iconBg: "bg-emerald-500/20",
  },
  amber: {
    border: "border-amber-500",
    bg: "bg-amber-500/10",
    ring: "ring-amber-500/30",
    text: "text-amber-300",
    iconBg: "bg-amber-500/20",
  },
} as const;

const niveauFormationOptions = [
  { value: "", label: "Non précisé" },
  { value: "sans_diplome", label: "Sans diplôme" },
  { value: "cap", label: "CAP / BEP" },
  { value: "bac", label: "BAC" },
  { value: "bac+2", label: "BAC+2" },
  { value: "autre", label: "Autre" },
];

export default function NouveauContactPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  // Accordéon des champs Qualiopi : replié par défaut. Utile surtout pour les
  // contacts qui sont/deviendront stagiaires (passeport prévention, certifications).
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [categorie, setCategorie] = useState<CategorieContact>("particulier");
  const [selectedEntreprise, setSelectedEntreprise] =
    useState<EntrepriseSuggestion | null>(null);

  const [form, setForm] = useState({
    // Type & rattachement (essentiel)
    type: "prospect" as ContactType,
    prenom: "",
    nom: "",
    email: "",
    telephone: "",
    entrepriseId: "",
    poste: "",
    notes: "",
    // Renseignements personnels (Qualiopi/Passeport Prévention, optionnels)
    sexe: "",
    dateNaissance: "",
    lieuNaissance: "",
    pays: "France",
    numeroSecuriteSociale: "",
    adressePerso: "",
    codePostalPerso: "",
    villePerso: "",
    numeroCartePro: "",
    numeroFranceTravail: "",
    // Diplôme / Expérience (optionnels)
    niveauFormation: "",
    diplomeObtenu: "",
  });

  const { data: entreprisesRaw } = useApi<Entreprise[]>("/api/entreprises");
  const entreprises: Entreprise[] = Array.isArray(entreprisesRaw) ? entreprisesRaw : [];
  const { trigger: createContact, isMutating: saving } = useApiMutation<
    Record<string, unknown>,
    ContactCreated
  >("/api/contacts", "POST");

  const entrepriseOptions = [
    { value: "", label: "Aucune entreprise" },
    ...entreprises.map((e) => ({ value: e.id, label: e.nom })),
  ];

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validateClient = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.prenom.trim()) errs.prenom = "Prénom requis";
    if (!form.nom.trim()) errs.nom = "Nom requis";
    if (!form.email.trim()) {
      errs.email = "Email requis";
    } else if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      errs.email = "Email invalide";
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validateClient()) return;

    try {
      // Champs toujours envoyés
      const payload: Record<string, unknown> = {
        type: form.type,
        prenom: form.prenom.trim(),
        nom: form.nom.trim(),
        email: form.email.trim(),
      };
      // Champs optionnels — n'envoie que si non vides (évite de polluer la BD avec "")
      const trimAndSet = (key: string, value: string) => {
        const v = value.trim();
        if (v) payload[key] = v;
      };
      trimAndSet("telephone", form.telephone);

      // Si catégorie = entreprise + sélection depuis l'autocomplete, on upsert
      // l'entreprise (création depuis SIRET ou récupération existante) avant
      // de créer le contact. Si déjà en base, on utilise l'id direct.
      if (categorie === "entreprise" && selectedEntreprise) {
        if (selectedEntreprise.existing && selectedEntreprise.id) {
          payload.entrepriseId = selectedEntreprise.id;
        } else if (selectedEntreprise.siret) {
          const created = await api.post<{ id: string }>(
            "/api/entreprises/upsert-by-siret",
            {
              siret: selectedEntreprise.siret,
              nom: selectedEntreprise.nom,
              adresse: selectedEntreprise.adresse,
              codePostal: selectedEntreprise.codePostal,
              ville: selectedEntreprise.ville,
            },
          );
          payload.entrepriseId = created.id;
        }
      } else if (form.entrepriseId) {
        // Fallback : ancien select (en cas de réutilisation manuelle)
        payload.entrepriseId = form.entrepriseId;
      }

      trimAndSet("poste", form.poste);
      trimAndSet("notes", form.notes);

      // Section Qualiopi
      if (form.sexe) payload.sexe = form.sexe;
      if (form.dateNaissance) {
        payload.dateNaissance = new Date(form.dateNaissance).toISOString();
      }
      trimAndSet("lieuNaissance", form.lieuNaissance);
      trimAndSet("pays", form.pays);
      if (form.numeroSecuriteSociale) {
        payload.numeroSecuriteSociale = form.numeroSecuriteSociale.replace(/\s/g, "");
      }
      trimAndSet("adressePerso", form.adressePerso);
      trimAndSet("codePostalPerso", form.codePostalPerso);
      trimAndSet("villePerso", form.villePerso);
      trimAndSet("numeroCartePro", form.numeroCartePro);
      trimAndSet("numeroFranceTravail", form.numeroFranceTravail);
      if (form.niveauFormation) payload.niveauFormation = form.niveauFormation;
      trimAndSet("diplomeObtenu", form.diplomeObtenu);

      const contact = await createContact(payload);
      notify.success("Contact créé", `${contact.prenom} ${contact.nom}`);
      router.push(`/contacts/${contact.id}`);
    } catch (err: unknown) {
      let msg = "Erreur lors de la création du contact";
      if (err instanceof ApiError) {
        const body = err.body as { error?: unknown } | null;
        const errBody = body?.error;
        if (typeof errBody === "string") {
          msg = errBody;
        } else if (errBody && typeof errBody === "object" && "fieldErrors" in errBody) {
          const fields = Object.entries(
            (errBody as { fieldErrors: Record<string, string[]> }).fieldErrors,
          )
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

  const accent = ACCENT_CLASSES[form.type === "client" ? "emerald" : "amber"];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Link
        href="/contacts"
        className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux contacts
      </Link>
      <h1 className="text-2xl font-bold text-gray-100">Nouveau contact</h1>
      <p className="text-sm text-gray-400 mt-1 mb-6">
        Commencez par choisir le type, puis renseignez l&apos;essentiel. Les détails
        Qualiopi (sécurité sociale, France Travail, diplôme…) sont optionnels et
        regroupés en bas.
      </p>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION 1 — Type (cards visuelles) */}
        <section>
          <h2 className="text-sm font-semibold text-gray-300 mb-2 uppercase tracking-wide">
            Type de contact
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TYPE_CARDS.map((card) => {
              const Icon = card.icon;
              const active = form.type === card.value;
              const c = ACCENT_CLASSES[card.accent];
              return (
                <button
                  key={card.value}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, type: card.value }))}
                  className={`relative text-left p-4 rounded-xl border-2 transition-all ${
                    active
                      ? `${c.border} ${c.bg} ring-2 ${c.ring}`
                      : "border-gray-700 bg-gray-800 hover:border-gray-600"
                  }`}
                >
                  {active && (
                    <span className={`absolute top-2 right-2 ${c.iconBg} rounded-full p-1`}>
                      <Check className={`h-3 w-3 ${c.text}`} />
                    </span>
                  )}
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                        active ? c.iconBg : "bg-gray-700"
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${active ? c.text : "text-gray-400"}`} />
                    </div>
                    <span
                      className={`font-semibold ${
                        active ? "text-gray-100" : "text-gray-300"
                      }`}
                    >
                      {card.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    {card.description}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {/* SECTION 2 — Identité */}
        <section>
          <h2 className="text-sm font-semibold text-gray-300 mb-2 uppercase tracking-wide flex items-center gap-2">
            <User className="h-4 w-4" /> Identité
          </h2>
          <div className="rounded-xl border border-gray-700 bg-gray-800 p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="prenom">
                  Prénom <span className={accent.text}>*</span>
                </Label>
                <Input
                  id="prenom"
                  name="prenom"
                  value={form.prenom}
                  onChange={handleChange}
                  placeholder="Jean"
                  required
                  aria-invalid={!!fieldErrors.prenom}
                />
                {fieldErrors.prenom && (
                  <p className="text-xs text-red-400">{fieldErrors.prenom}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nom">
                  Nom <span className={accent.text}>*</span>
                </Label>
                <Input
                  id="nom"
                  name="nom"
                  value={form.nom}
                  onChange={handleChange}
                  placeholder="Dupont"
                  required
                  aria-invalid={!!fieldErrors.nom}
                />
                {fieldErrors.nom && (
                  <p className="text-xs text-red-400">{fieldErrors.nom}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-gray-500" />
                  Email <span className={accent.text}>*</span>
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="jean.dupont@exemple.fr"
                  required
                  aria-invalid={!!fieldErrors.email}
                />
                {fieldErrors.email && (
                  <p className="text-xs text-red-400">{fieldErrors.email}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="telephone" className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-gray-500" />
                  Téléphone
                </Label>
                <Input
                  id="telephone"
                  name="telephone"
                  type="tel"
                  value={form.telephone}
                  onChange={handleChange}
                  placeholder="06 12 34 56 78"
                />
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3 — Catégorie + Rattachement */}
        <section>
          <h2 className="text-sm font-semibold text-gray-300 mb-2 uppercase tracking-wide flex items-center gap-2">
            <Briefcase className="h-4 w-4" /> Catégorie & rattachement
          </h2>
          <div className="rounded-xl border border-gray-700 bg-gray-800 p-4 space-y-4">
            {/* Toggle Particulier / Entreprise */}
            <div>
              <Label className="text-xs uppercase tracking-wide text-gray-400">
                Ce {form.type} est…
              </Label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {([
                  { value: "particulier", label: "Particulier", icon: User, hint: "Personne physique sans rattachement" },
                  { value: "entreprise", label: "Entreprise", icon: Building2, hint: "Liée à une société (auto-fill SIRET)" },
                ] as const).map((opt) => {
                  const active = categorie === opt.value;
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setCategorie(opt.value);
                        if (opt.value === "particulier") {
                          setSelectedEntreprise(null);
                          setForm((p) => ({ ...p, entrepriseId: "" }));
                        }
                      }}
                      className={`flex items-start gap-2.5 rounded-lg border p-3 text-left transition-colors ${
                        active
                          ? "border-emerald-500 bg-emerald-500/10"
                          : "border-gray-600 bg-gray-900/40 hover:border-gray-500"
                      }`}
                    >
                      <Icon
                        className={`mt-0.5 h-4 w-4 shrink-0 ${
                          active ? "text-emerald-400" : "text-gray-400"
                        }`}
                      />
                      <div className="min-w-0">
                        <p className={`text-sm font-medium ${active ? "text-emerald-300" : "text-gray-200"}`}>
                          {opt.label}
                        </p>
                        <p className="text-xs text-gray-500 leading-snug">{opt.hint}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {categorie === "entreprise" ? (
              <>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-gray-500" />
                    Entreprise
                  </Label>
                  <EntrepriseAutocomplete
                    value={selectedEntreprise}
                    onSelect={setSelectedEntreprise}
                  />
                  <p className="text-xs text-gray-500">
                    Tapez le nom ou le SIRET. Si l'entreprise n'est pas encore en base, elle sera créée automatiquement à l'enregistrement avec les données publiques (data.gouv).
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="poste">Poste / fonction</Label>
                  <Input
                    id="poste"
                    name="poste"
                    value={form.poste}
                    onChange={handleChange}
                    placeholder={
                      form.type === "client" ? "Responsable formation" : "Directeur, Manager…"
                    }
                  />
                </div>
              </>
            ) : (
              <p className="text-xs text-gray-500">
                Particulier : pas de rattachement professionnel à saisir. Les
                coordonnées personnelles (adresse, etc.) sont dans la section
                « Informations détaillées » plus bas.
              </p>
            )}
          </div>
        </section>

        {/* SECTION 4 — Notes */}
        <section>
          <h2 className="text-sm font-semibold text-gray-300 mb-2 uppercase tracking-wide flex items-center gap-2">
            <FileText className="h-4 w-4" /> Notes internes
          </h2>
          <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
            <Textarea
              id="notes"
              name="notes"
              value={form.notes}
              onChange={handleChange}
              placeholder={
                form.type === "prospect"
                  ? "Source du prospect, contexte de premier contact, sujet d'intérêt…"
                  : "Contexte commercial, préférences, historique…"
              }
              rows={4}
            />
          </div>
        </section>

        {/* SECTION 5 — Détails Qualiopi (accordéon collapsible) */}
        <section>
          <button
            type="button"
            onClick={() => setDetailsOpen((v) => !v)}
            className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-700 bg-gray-800 hover:border-gray-600 transition-colors"
            aria-expanded={detailsOpen}
            aria-controls="qualiopi-section"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-300 uppercase tracking-wide">
              <CreditCard className="h-4 w-4" />
              Informations détaillées
              <span className="text-[10px] font-normal text-gray-500 normal-case tracking-normal ml-1">
                (Qualiopi / Passeport Prévention — optionnel)
              </span>
            </div>
            {detailsOpen ? (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </button>

          {detailsOpen && (
            <div id="qualiopi-section" className="mt-3 space-y-4">
              {/* Renseignements personnels */}
              <div className="rounded-xl border border-gray-700 bg-gray-800 p-4 space-y-4">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Renseignements personnels
                </h3>

                <div className="space-y-1.5">
                  <Label>Sexe</Label>
                  <div className="flex gap-4">
                    {(["M", "F"] as const).map((s) => (
                      <label key={s} className="inline-flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="sexe"
                          value={s}
                          checked={form.sexe === s}
                          onChange={handleChange}
                          className="text-red-600 focus:ring-red-500"
                        />
                        {s === "M" ? "Masculin" : "Féminin"}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="dateNaissance">Date de naissance</Label>
                    <Input
                      id="dateNaissance"
                      name="dateNaissance"
                      type="date"
                      value={form.dateNaissance}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lieuNaissance">Lieu de naissance</Label>
                    <Input
                      id="lieuNaissance"
                      name="lieuNaissance"
                      value={form.lieuNaissance}
                      onChange={handleChange}
                      placeholder="Toulon"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="pays">Pays</Label>
                    <Input
                      id="pays"
                      name="pays"
                      value={form.pays}
                      onChange={handleChange}
                      placeholder="France"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="numeroSecuriteSociale">N° de sécurité sociale</Label>
                    <Input
                      id="numeroSecuriteSociale"
                      name="numeroSecuriteSociale"
                      value={form.numeroSecuriteSociale}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          numeroSecuriteSociale: e.target.value.replace(/[^0-9\s]/g, ""),
                        }))
                      }
                      placeholder="1 99 12 75 123 456 78"
                      maxLength={21}
                      className="font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="adressePerso">Adresse personnelle</Label>
                  <Input
                    id="adressePerso"
                    name="adressePerso"
                    value={form.adressePerso}
                    onChange={handleChange}
                    placeholder="12 rue des Lilas"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="codePostalPerso">Code postal</Label>
                    <Input
                      id="codePostalPerso"
                      name="codePostalPerso"
                      value={form.codePostalPerso}
                      onChange={handleChange}
                      placeholder="83000"
                    />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label htmlFor="villePerso">Ville</Label>
                    <Input
                      id="villePerso"
                      name="villePerso"
                      value={form.villePerso}
                      onChange={handleChange}
                      placeholder="Toulon"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="numeroCartePro">
                      N° carte pro CNAPS / autorisation préalable
                    </Label>
                    <Input
                      id="numeroCartePro"
                      name="numeroCartePro"
                      value={form.numeroCartePro}
                      onChange={handleChange}
                      placeholder="CAR-XXX..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="numeroFranceTravail">N° allocataire France Travail</Label>
                    <Input
                      id="numeroFranceTravail"
                      name="numeroFranceTravail"
                      value={form.numeroFranceTravail}
                      onChange={handleChange}
                      placeholder="Identifiant France Travail"
                    />
                  </div>
                </div>
              </div>

              {/* Diplôme / Expérience */}
              <div className="rounded-xl border border-gray-700 bg-gray-800 p-4 space-y-4">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-2">
                  <GraduationCap className="h-3.5 w-3.5" /> Diplôme / Expérience
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="niveauFormation">Niveau de formation</Label>
                    <Select
                      id="niveauFormation"
                      name="niveauFormation"
                      value={form.niveauFormation}
                      onChange={handleChange}
                      options={niveauFormationOptions}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="diplomeObtenu">Diplôme obtenu (le plus élevé)</Label>
                    <Input
                      id="diplomeObtenu"
                      name="diplomeObtenu"
                      value={form.diplomeObtenu}
                      onChange={handleChange}
                      placeholder="Ex: BAC Pro Sécurité"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        <div className="flex justify-end gap-3 pt-2">
          <Link
            href="/contacts"
            className="inline-flex items-center rounded-md border border-gray-600 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors"
          >
            Annuler
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? "Création…" : `Créer le ${form.type}`}
          </Button>
        </div>
      </form>
    </div>
  );
}
