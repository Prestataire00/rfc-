"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  CheckCircle, AlertCircle, CalendarDays, Clock, MapPin,
  User, Building2, Search, Loader2, X,
} from "lucide-react";
import { useApi, useApiMutation, ApiError } from "@/hooks/useApi";

type SessionInfo = {
  formation: string;
  duree: number;
  description: string | null;
  dateDebut: string;
  dateFin: string;
  lieu: string | null;
  placesRestantes: number;
};

type TypeInscription = "entreprise" | "particulier";

type EntrepriseHit = {
  siret: string;
  siren: string;
  nom: string;
  adresse: string | null;
  codePostal: string | null;
  ville: string | null;
};

const PROFESSIONS = [
  "Médecin",
  "Infirmier(ère)",
  "Aide-soignant(e)",
  "Sage-femme",
  "Pharmacien(ne)",
  "Kinésithérapeute",
  "Secrétaire médical(e)",
  "Personnel administratif",
  "Étudiant en santé",
  "Cadre de santé",
  "Auxiliaire de puériculture",
  "Autre",
];

export default function InscriptionStagiairePage() {
  const { token } = useParams() as { token: string };
  const { data: info, error: fetchError, isLoading } = useApi<SessionInfo>(
    token ? `/api/inscription-publique/${token}` : null,
  );
  const submitMutation = useApiMutation<Record<string, unknown>>(
    `/api/inscription-publique/${token}`,
    "POST",
  );
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const [typeInscription, setTypeInscription] =
    useState<TypeInscription>("particulier");
  const [selectedEntreprise, setSelectedEntreprise] =
    useState<EntrepriseHit | null>(null);

  const [form, setForm] = useState({
    prenom: "",
    nom: "",
    email: "",
    telephone: "",
    adressePerso: "",
    codePostalPerso: "",
    villePerso: "",
    profession: "",
    numeroDiplome: "",
    dateNaissance: "",
    numeroSecuriteSociale: "",
    besoinsAdaptation: "",
    consentementRGPD: false,
  });

  const loading = isLoading;
  const submitting = submitMutation.isMutating;
  const loadError = fetchError
    ? typeof fetchError.body === "object" &&
      fetchError.body &&
      "error" in fetchError.body &&
      typeof (fetchError.body as { error: unknown }).error === "string"
      ? (fetchError.body as { error: string }).error
      : "Impossible de charger les données"
    : "";
  const error = submitError || loadError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.consentementRGPD) {
      setSubmitError("Le consentement RGPD est obligatoire");
      return;
    }
    if (typeInscription === "entreprise" && !selectedEntreprise) {
      setSubmitError("Sélectionnez votre entreprise dans la liste");
      return;
    }
    setSubmitError("");

    const payload: Record<string, unknown> = {
      prenom: form.prenom,
      nom: form.nom,
      email: form.email,
      telephone: form.telephone || undefined,
      adressePerso: form.adressePerso || undefined,
      codePostalPerso: form.codePostalPerso || undefined,
      villePerso: form.villePerso || undefined,
      profession: form.profession || undefined,
      numeroDiplome: form.numeroDiplome || undefined,
      dateNaissance: form.dateNaissance || undefined,
      numeroSecuriteSociale: form.numeroSecuriteSociale
        ? form.numeroSecuriteSociale.replace(/\s/g, "")
        : undefined,
      besoinsAdaptation: form.besoinsAdaptation || undefined,
      consentementRGPD: form.consentementRGPD,
    };

    if (typeInscription === "entreprise" && selectedEntreprise) {
      payload.entreprise = selectedEntreprise.nom;
      payload.entrepriseSiret = selectedEntreprise.siret;
      payload.entrepriseAdresse = selectedEntreprise.adresse;
      payload.entrepriseCodePostal = selectedEntreprise.codePostal;
      payload.entrepriseVille = selectedEntreprise.ville;
    }

    try {
      await submitMutation.trigger(payload);
      setSubmitted(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setSubmitError(err.message || "Erreur");
      } else {
        setSubmitError("Erreur");
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
      </div>
    );
  }

  if (loadError && !info) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
          <p className="text-gray-400">{loadError}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center max-w-md">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-100 mb-2">
            Inscription enregistrée !
          </h1>
          <p className="text-gray-400">
            Votre inscription à la formation{" "}
            <strong>&quot;{info?.formation}&quot;</strong> a bien été prise en
            compte. Vous recevrez une confirmation prochainement.
          </p>
        </div>
      </div>
    );
  }

  const dateDebut = info
    ? new Date(info.dateDebut).toLocaleDateString("fr-FR")
    : "";
  const dateFin = info ? new Date(info.dateFin).toLocaleDateString("fr-FR") : "";

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-red-600 text-white rounded-t-xl p-6">
          <h1 className="text-xl font-bold">Rescue Formation Conseil</h1>
          <p className="text-red-100 text-sm mt-1">Inscription à une formation</p>
        </div>

        <div className="bg-gray-800 border border-t-0 border-gray-700 rounded-b-xl p-6 space-y-6">
          {/* Formation info */}
          <div className="bg-red-900/20 rounded-lg p-4 space-y-2">
            <h2 className="font-semibold text-lg text-gray-100">{info?.formation}</h2>
            {info?.description && (
              <p className="text-sm text-gray-400">{info.description}</p>
            )}
            <div className="flex flex-wrap gap-4 text-sm text-gray-400 mt-2">
              <span className="flex items-center gap-1">
                <CalendarDays className="h-4 w-4" /> Du {dateDebut} au {dateFin}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" /> {info?.duree}h
              </span>
              {info?.lieu && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" /> {info.lieu}
                </span>
              )}
            </div>
            <p
              className={`text-sm font-medium ${
                info && info.placesRestantes > 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {info && info.placesRestantes > 0
                ? `${info.placesRestantes} place(s) restante(s)`
                : "Complet"}
            </p>
          </div>

          {info && info.placesRestantes <= 0 ? (
            <p className="text-center text-gray-400 py-4">
              Désolé, cette session est complète.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-900/20 border border-red-700 text-red-400 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Type d'inscription */}
              <section>
                <label className="block text-sm font-medium text-gray-100 mb-2">
                  Je m&apos;inscris en tant que <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {([
                    {
                      value: "particulier" as const,
                      label: "Particulier",
                      hint: "Inscription à titre personnel (hors cadre professionnel)",
                      icon: User,
                    },
                    {
                      value: "entreprise" as const,
                      label: "Entreprise",
                      hint: "Inscription via une société / structure (auto-fill SIRET)",
                      icon: Building2,
                    },
                  ]).map((opt) => {
                    const active = typeInscription === opt.value;
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setTypeInscription(opt.value);
                          if (opt.value === "particulier") {
                            setSelectedEntreprise(null);
                          }
                        }}
                        className={`text-left rounded-lg border p-4 transition-colors ${
                          active
                            ? "border-red-500 bg-red-500/10"
                            : "border-gray-600 bg-gray-900 hover:border-gray-500"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon
                            className={`h-4 w-4 ${
                              active ? "text-red-400" : "text-gray-400"
                            }`}
                          />
                          <span
                            className={`text-sm font-semibold ${
                              active ? "text-red-300" : "text-gray-200"
                            }`}
                          >
                            {opt.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 leading-snug">{opt.hint}</p>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Recherche entreprise (si type=entreprise) */}
              {typeInscription === "entreprise" && (
                <section>
                  <label className="block text-sm font-medium text-gray-100 mb-2">
                    Chercher par SIRET, SIREN ou nom{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <PublicEntrepriseSearch
                    value={selectedEntreprise}
                    onSelect={setSelectedEntreprise}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Données auto-remplies depuis le registre public des
                    entreprises (data.gouv).
                  </p>
                </section>
              )}

              {/* Identité */}
              <section className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wide">
                  Identité
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <Field
                    label="Prénom"
                    required
                    value={form.prenom}
                    onChange={(v) => setForm({ ...form, prenom: v })}
                  />
                  <Field
                    label="Nom"
                    required
                    value={form.nom}
                    onChange={(v) => setForm({ ...form, nom: v })}
                  />
                </div>
                <Field
                  label="Email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(v) => setForm({ ...form, email: v })}
                />
                <Field
                  label="Téléphone"
                  type="tel"
                  value={form.telephone}
                  onChange={(v) => setForm({ ...form, telephone: v })}
                  placeholder="06 12 34 56 78"
                />
              </section>

              {/* Adresse personnelle */}
              <section className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wide">
                  Adresse personnelle
                </h3>
                <Field
                  label="Adresse"
                  value={form.adressePerso}
                  onChange={(v) => setForm({ ...form, adressePerso: v })}
                  placeholder="Numéro et rue"
                />
                <div className="grid grid-cols-2 gap-4">
                  <Field
                    label="Code postal"
                    value={form.codePostalPerso}
                    onChange={(v) => setForm({ ...form, codePostalPerso: v })}
                    placeholder="75000"
                  />
                  <Field
                    label="Ville"
                    value={form.villePerso}
                    onChange={(v) => setForm({ ...form, villePerso: v })}
                    placeholder="Paris"
                  />
                </div>
              </section>

              {/* Profession & diplôme */}
              <section className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wide">
                  Profession & diplôme
                </h3>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Profession
                  </label>
                  <select
                    value={form.profession}
                    onChange={(e) => setForm({ ...form, profession: e.target.value })}
                    className="w-full border border-gray-600 bg-gray-900 text-gray-100 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Choisissez votre profession dans la liste</option>
                    {PROFESSIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Choisissez « Autre » si la vôtre n&apos;apparaît pas.
                  </p>
                </div>
                <Field
                  label="N° de diplôme"
                  value={form.numeroDiplome}
                  onChange={(v) => setForm({ ...form, numeroDiplome: v })}
                  placeholder="Numéro de diplôme ou intitulé"
                />
              </section>

              {/* Données Qualiopi */}
              <section className="pt-4 border-t border-gray-700 space-y-4">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                  Données légales (Qualiopi)
                </p>
                <Field
                  label="Date de naissance"
                  type="date"
                  required
                  value={form.dateNaissance}
                  onChange={(v) => setForm({ ...form, dateNaissance: v })}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Numéro de sécurité sociale
                  </label>
                  <input
                    type="text"
                    value={form.numeroSecuriteSociale}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        numeroSecuriteSociale: e.target.value.replace(/[^0-9\s]/g, ""),
                      })
                    }
                    maxLength={21}
                    placeholder="1 99 12 75 123 456 78"
                    className="w-full border border-gray-600 bg-gray-900 text-gray-100 rounded-lg px-3 py-2 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Besoins d&apos;adaptation (optionnel)
                  </label>
                  <textarea
                    value={form.besoinsAdaptation}
                    onChange={(e) =>
                      setForm({ ...form, besoinsAdaptation: e.target.value })
                    }
                    rows={2}
                    placeholder="RQTH, contraintes physiques, aménagements…"
                    className="w-full border border-gray-600 bg-gray-900 text-gray-100 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </section>

              {/* RGPD */}
              <div className="flex items-start gap-3 p-3 rounded-md border border-red-700/50 bg-red-900/10">
                <input
                  type="checkbox"
                  id="rgpd"
                  checked={form.consentementRGPD}
                  onChange={(e) =>
                    setForm({ ...form, consentementRGPD: e.target.checked })
                  }
                  className="mt-0.5 h-4 w-4"
                  required
                />
                <label htmlFor="rgpd" className="text-xs text-gray-300 cursor-pointer flex-1">
                  <strong>J&apos;accepte</strong> la collecte et le traitement de
                  mes données personnelles pour la réalisation de la formation,
                  conformément au RGPD. *
                </label>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {submitting
                  ? "Inscription en cours…"
                  : "M'inscrire à cette formation"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  type = "text",
  required = false,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  type?: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-600 bg-gray-900 text-gray-100 rounded-lg px-3 py-2 text-sm"
      />
    </div>
  );
}

/**
 * Recherche entreprise contre l'API publique data.gouv. Appel direct côté
 * navigateur (l'API gouv est CORS-friendly) — pas de proxy nécessaire, ce
 * qui évite d'exposer une route auth-required sur ce formulaire public.
 */
function PublicEntrepriseSearch({
  value,
  onSelect,
}: {
  value: EntrepriseHit | null;
  onSelect: (e: EntrepriseHit | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<EntrepriseHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(
          `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(query)}&per_page=5`,
        );
        if (r.ok) {
          const json = (await r.json()) as { results?: GouvEntreprise[] };
          const items = (json.results ?? []).map(toHit);
          setResults(items);
          setOpen(true);
        }
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (value) {
    return (
      <div className="rounded-lg border border-emerald-700/40 bg-emerald-900/10 p-3 flex items-start gap-3">
        <Building2 className="mt-0.5 h-5 w-5 text-emerald-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-100 truncate">{value.nom}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            SIRET {value.siret} {value.ville ? `· ${value.ville}` : ""}
          </p>
          {value.adresse ? (
            <p className="text-xs text-gray-500">
              {value.adresse}
              {value.codePostal ? ` · ${value.codePostal}` : ""}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="text-gray-400 hover:text-red-400 shrink-0"
          aria-label="Changer d'entreprise"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Ex : 552 100 554 ou nom de l'entreprise"
          className="w-full border border-gray-600 bg-gray-900 text-gray-100 rounded-lg pl-9 pr-9 py-2 text-sm"
          autoComplete="off"
        />
        {loading ? (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-500" />
        ) : null}
      </div>

      {open && results.length > 0 ? (
        <ul className="absolute z-50 mt-1 max-h-80 w-full overflow-y-auto rounded-lg border border-gray-600 bg-gray-800 shadow-xl">
          {results.map((r, i) => (
            <li key={`${r.siret}-${i}`}>
              <button
                type="button"
                onClick={() => {
                  onSelect(r);
                  setOpen(false);
                  setQuery("");
                }}
                className="w-full text-left px-3 py-2.5 hover:bg-gray-700 border-b border-gray-700/60 last:border-b-0"
              >
                <p className="font-medium text-gray-100 text-sm truncate">
                  {r.nom}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  SIRET {r.siret}
                  {r.ville ? ` · ${r.ville}` : ""}
                </p>
              </button>
            </li>
          ))}
        </ul>
      ) : open && !loading && query.length >= 2 ? (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-600 bg-gray-800 p-3 text-center text-sm text-gray-500 shadow-xl">
          Aucune entreprise trouvée pour « {query} »
        </div>
      ) : null}
    </div>
  );
}

type GouvEntreprise = {
  siren: string;
  nom_raison_sociale?: string;
  nom_complet?: string;
  siege?: {
    siret: string;
    adresse?: string;
    code_postal?: string;
    libelle_commune?: string;
  };
};

function toHit(e: GouvEntreprise): EntrepriseHit {
  return {
    siret: e.siege?.siret ?? "",
    siren: e.siren,
    nom: e.nom_raison_sociale ?? e.nom_complet ?? "(sans nom)",
    adresse: e.siege?.adresse ?? null,
    codePostal: e.siege?.code_postal ?? null,
    ville: e.siege?.libelle_commune ?? null,
  };
}
