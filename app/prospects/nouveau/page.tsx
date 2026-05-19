"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  User,
  GraduationCap,
  Phone,
  Mail,
  MapPin,
  Globe,
  Search,
  X,
  ChevronDown,
  Plus,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { AIButton } from "@/components/shared/AIButton";
import {
  EntrepriseAutocomplete,
  type EntrepriseGouv,
} from "@/components/shared/EntrepriseAutocomplete";
import { notify } from "@/lib/toast";
import { useApi, useApiMutation, ApiError } from "@/hooks/useApi";

// ---------------------------------------------------------------------------
// Constantes UI
// ---------------------------------------------------------------------------

type EntrepriseOption = {
  id: string;
  nom: string;
  secteur?: string | null;
  effectif?: number | null;
};

type FormationOption = {
  id: string;
  titre: string;
  categorie?: string | null;
};

// TYPE DE PROSPECT (amélioration #2)
const PROSPECT_TYPES = [
  {
    value: "entreprise" as const,
    label: "Entreprise",
    sublabel: "Manager RH d'une entreprise",
    icon: Building2,
    color: "border-blue-600 bg-blue-900/10",
  },
  {
    value: "stagiaire" as const,
    label: "Stagiaire individuel",
    sublabel: "Particulier qui demande une formation pour lui",
    icon: User,
    color: "border-green-600 bg-green-900/10",
  },
  {
    value: "organisme" as const,
    label: "Organisme / société tierce",
    sublabel: "Sous-traitant, OPCO, autre structure",
    icon: GraduationCap,
    color: "border-purple-600 bg-purple-900/10",
  },
];

type ProspectType = "entreprise" | "stagiaire" | "organisme";

// Mapping prospectType → origine (envoyé en payload, plus saisi à la main) :
//   entreprise → "client" · stagiaire → "stagiaire" · organisme → "client"
// Cf. useEffect [prospectType] qui synchronise form.origine.

const SOURCE_CONTACT = [
  { value: "telephone", label: "Telephone", icon: Phone },
  { value: "mail", label: "Mail", icon: Mail },
  { value: "agence", label: "Agence", icon: MapPin },
  { value: "site_internet", label: "Site internet", icon: Globe },
];

const MATERIEL = [
  { key: "salles", label: "Salles" },
  { key: "videoprojecteur", label: "Videoprojecteur" },
  { key: "paperboard", label: "Paperboard" },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ProspectResult = {
  demandeId: string;
  contactId: string;
  entrepriseId: string;
  redirectUrl: string;
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function NouveauProspectPage() {
  const router = useRouter();

  const [error, setError] = useState("");

  // ---- Type de prospect (amélioration #2) ----
  const [prospectType, setProspectType] = useState<ProspectType>("entreprise");

  // ---- Contact (décideur) ----
  const [contact, setContact] = useState({
    prenom: "",
    nom: "",
    email: "",
    telephone: "",
    poste: "",
  });

  // ---- Stagiaires nominaux (uniquement pour type entreprise) ----
  type StagiaireRow = { prenom: string; nom: string; email: string; telephone: string };
  const [stagiaires, setStagiaires] = useState<StagiaireRow[]>([]);
  const [showStagiairesNominal, setShowStagiairesNominal] = useState(false);

  function addStagiaire() {
    setStagiaires((s) => [...s, { prenom: "", nom: "", email: "", telephone: "" }]);
  }
  function updateStagiaire(idx: number, field: keyof StagiaireRow, value: string) {
    setStagiaires((s) => s.map((row, i) => (i === idx ? { ...row, [field]: value } : row)));
  }
  function removeStagiaire(idx: number) {
    setStagiaires((s) => s.filter((_, i) => i !== idx));
  }

  // ---- Mode entreprise ----
  const [entrepriseMode, setEntrepriseMode] = useState<"existante" | "nouvelle">("existante");

  // ---- Formulaire principal ----
  const [form, setForm] = useState({
    titre: "",
    description: "",
    origine: "client",
    nbStagiaires: "",
    datesSouhaitees: "",
    budget: "",
    notes: "",
    // Entreprise existante
    entrepriseId: "",
    // Nature/effectif (auto-fill depuis entreprise existante)
    nature: "",
    nbSalaries: "",
    // Entreprise nouvelle
    entrepriseNom: "",
    entrepriseSiret: "",
    entrepriseAdresse: "",
    entrepriseCodePostal: "",
    entrepriseVille: "",
    entrepriseSecteur: "",
    entrepriseEffectif: "",
    // Organisme : nature supplémentaire
    natureOrganisme: "",
    // Autres
    sourceContact: "",
    lieu: "",
    observation: "",
    priorite: "normale",
    materielSurPlace: [] as string[],
    // Formation catalogue (amélioration #3)
    formationId: "",
    formationAutre: "", // texte libre si "Autre"
  });

  // ---- Formation autocomplete (amélioration #3) ----
  const [formationSearch, setFormationSearch] = useState("");
  const [formationDropdownOpen, setFormationDropdownOpen] = useState(false);
  const [selectedFormationLabel, setSelectedFormationLabel] = useState("");
  const formationRef = useRef<HTMLDivElement>(null);

  // Note : la recherche SIRET / nom via API gouv est encapsulée dans le
  // composant <EntrepriseAutocomplete>. Voir handleEntrepriseGouvSelect.

  // ---- APIs ----
  const { data: entreprisesRaw } = useApi<EntrepriseOption[] | { entreprises: EntrepriseOption[] }>("/api/entreprises");
  const { data: entrepriseDetail } = useApi<EntrepriseOption>(
    form.entrepriseId ? `/api/entreprises/${form.entrepriseId}` : null
  );
  const { data: formationsRaw } = useApi<{ formations: FormationOption[] } | FormationOption[]>(
    "/api/formations?actif=true&limit=100"
  );
  const { trigger: createProspect, isMutating: saving } = useApiMutation<Record<string, unknown>, ProspectResult>(
    "/api/prospects",
    "POST"
  );

  const entreprises: EntrepriseOption[] = Array.isArray(entreprisesRaw)
    ? entreprisesRaw
    : (entreprisesRaw as { entreprises?: EntrepriseOption[] })?.entreprises ?? [];

  const formations: FormationOption[] = Array.isArray(formationsRaw)
    ? formationsRaw
    : (formationsRaw as { formations?: FormationOption[] })?.formations ?? [];

  // Filtrer formations selon recherche
  const filteredFormations = formations.filter((f) =>
    formationSearch.trim() === "" ||
    f.titre.toLowerCase().includes(formationSearch.toLowerCase()) ||
    (f.categorie && f.categorie.toLowerCase().includes(formationSearch.toLowerCase()))
  );

  // Auto-remplir nature + nbSalaries depuis l'entreprise sélectionnée
  useEffect(() => {
    if (!entrepriseDetail) return;
    setForm((f) => ({
      ...f,
      nature: f.nature || entrepriseDetail.secteur || "",
      nbSalaries: f.nbSalaries || (entrepriseDetail.effectif != null ? String(entrepriseDetail.effectif) : ""),
      entrepriseSecteur: f.entrepriseSecteur || entrepriseDetail.secteur || "",
      entrepriseEffectif: f.entrepriseEffectif || (entrepriseDetail.effectif != null ? String(entrepriseDetail.effectif) : ""),
    }));
  }, [entrepriseDetail]);

  // Fermer dropdown formation au clic extérieur
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (formationRef.current && !formationRef.current.contains(e.target as Node)) {
        setFormationDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Quand le type de prospect change → ajuster l'origine par défaut
  useEffect(() => {
    if (prospectType === "stagiaire") {
      setForm((f) => ({ ...f, origine: "stagiaire" }));
    } else {
      setForm((f) => ({ ...f, origine: "client" }));
    }
  }, [prospectType]);

  const setF = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));
  const setC = (field: string, value: string) => setContact((c) => ({ ...c, [field]: value }));

  const toggleMateriel = (key: string) => {
    setForm((f) => ({
      ...f,
      materielSurPlace: f.materielSurPlace.includes(key)
        ? f.materielSurPlace.filter((k) => k !== key)
        : [...f.materielSurPlace, key],
    }));
  };

  function handleEntrepriseChange(newId: string) {
    setForm((f) => ({
      ...f,
      entrepriseId: newId,
      nature: "",
      nbSalaries: "",
    }));
  }

  // Sélectionner une formation depuis le catalogue (amélioration #3)
  function handleFormationSelect(formation: FormationOption | null) {
    if (!formation) {
      // "Autre" : texte libre
      setForm((f) => ({ ...f, formationId: "", titre: formationSearch }));
      setSelectedFormationLabel("Autre — saisie libre");
    } else {
      setForm((f) => ({ ...f, formationId: formation.id, titre: formation.titre }));
      setSelectedFormationLabel(formation.titre);
    }
    setFormationSearch("");
    setFormationDropdownOpen(false);
  }

  // Auto-fill depuis API gouv (amélioration #4) — callback du composant
  // <EntrepriseAutocomplete>, qui gère lui-même la fermeture du dropdown.
  function handleEntrepriseGouvSelect(ent: EntrepriseGouv) {
    setForm((f) => ({
      ...f,
      entrepriseNom: ent.nom_raison_sociale || f.entrepriseNom,
      entrepriseSiret: ent.siege?.siret || f.entrepriseSiret,
      entrepriseAdresse: ent.siege?.adresse || f.entrepriseAdresse,
      entrepriseCodePostal: ent.siege?.code_postal || f.entrepriseCodePostal,
      entrepriseVille: ent.siege?.libelle_commune || f.entrepriseVille,
      entrepriseSecteur: ent.siege?.activite_principale || f.entrepriseSecteur,
      entrepriseEffectif: f.entrepriseEffectif, // pas dans l'API gouv de manière fiable
    }));
  }

  // ---- Submit ----
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // Construction des notes enrichies (lieu + nature/nbSalaries → notes)
    const extra: string[] = [];
    if (form.lieu) extra.push(`Lieu : ${form.lieu}`);
    if (form.nature) extra.push(`Nature de l'entreprise : ${form.nature}`);
    if (form.nbSalaries) extra.push(`Nb de salaries : ${form.nbSalaries}`);
    const notesInternes = [form.notes, ...extra].filter(Boolean).join("\n") || undefined;

    // Déterminer entrepriseMode selon prospectType
    let entrepriseModePayload: "nouvelle" | "existante" | "aucune";
    if (prospectType === "stagiaire") {
      entrepriseModePayload = "aucune";
    } else {
      entrepriseModePayload = entrepriseMode === "nouvelle" ? "nouvelle" : "existante";
    }

    // Titre : si formation catalogue choisie → utiliser son titre ; sinon form.titre
    const formationSouhaitee = form.titre || selectedFormationLabel || "";

    // Payload vers POST /api/prospects
    const payload: Record<string, unknown> = {
      contact: {
        prenom: contact.prenom,
        nom: contact.nom,
        email: contact.email,
        telephone: contact.telephone || undefined,
        poste: contact.poste || undefined,
        type: prospectType === "stagiaire" ? "stagiaire" : "prospect",
      },
      prospectType,
      entrepriseMode: entrepriseModePayload,
      ...(entrepriseModePayload === "existante"
        ? { entrepriseId: form.entrepriseId }
        : entrepriseModePayload === "nouvelle"
        ? {
            entrepriseNouvelle: {
              nom: form.entrepriseNom,
              siret: form.entrepriseSiret || undefined,
              adresse: form.entrepriseAdresse || undefined,
              codePostal: form.entrepriseCodePostal || undefined,
              ville: form.entrepriseVille || undefined,
              secteur: form.entrepriseSecteur || undefined,
              effectif: form.entrepriseEffectif ? Number(form.entrepriseEffectif) : undefined,
              natureOrganisme: prospectType === "organisme" ? (form.natureOrganisme || undefined) : undefined,
            },
          }
        : {}),
      demande: {
        origine: form.origine as "client" | "stagiaire" | "centre" | "prospection",
        sourceContact: form.sourceContact || undefined,
        formationSouhaitee: formationSouhaitee || "Non précisée",
        formationId: form.formationId || undefined,
        nbStagiaires: form.nbStagiaires ? Number(form.nbStagiaires) : undefined,
        datesSouhaitees: form.datesSouhaitees || undefined,
        budgetEnvisage: form.budget ? Number(form.budget) : undefined,
      },
      besoinsParticuliers: {
        handicapContraintes: form.observation || undefined,
        materielSurPlace: form.materielSurPlace.length > 0 ? form.materielSurPlace.join(", ") : undefined,
      },
      notesInternes,
      // Stagiaires nominaux : envoyés uniquement pour type entreprise, filtrés
      // sur les lignes ayant au moins prénom + nom.
      ...(prospectType === "entreprise" && stagiaires.length > 0
        ? {
            stagiaires: stagiaires
              .filter((s) => s.prenom.trim() && s.nom.trim())
              .map((s) => ({
                prenom: s.prenom.trim(),
                nom: s.nom.trim(),
                email: s.email.trim() || undefined,
                telephone: s.telephone.trim() || undefined,
              })),
          }
        : {}),
    };

    try {
      const result = await createProspect(payload) as ProspectResult & { stagiairesCrees?: number };
      const stagiairesMsg =
        result.stagiairesCrees && result.stagiairesCrees > 0
          ? ` · ${result.stagiairesCrees} stagiaire${result.stagiairesCrees > 1 ? "s" : ""} rattaché${result.stagiairesCrees > 1 ? "s" : ""}`
          : "";
      notify.success("Prospect créé", `${contact.prenom} ${contact.nom}${stagiairesMsg}`);
      router.push(`/prospects/${result.demandeId}`);
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as { error?: unknown } | null;
        const errBody = body?.error;
        let msg = err.message || "Erreur lors de la création";
        if (typeof errBody === "string") {
          msg = errBody;
        } else if (errBody && typeof errBody === "object" && "message" in errBody) {
          msg = String((errBody as { message: unknown }).message) || msg;
        } else if (errBody && typeof errBody === "object" && "fieldErrors" in errBody) {
          const fe = (errBody as { fieldErrors: Record<string, string[]> }).fieldErrors;
          msg = Object.entries(fe).map(([k, v]) => `${k}: ${v.join(", ")}`).join(" | ") || msg;
        }
        setError(msg);
        notify.error("Erreur", msg);
      } else {
        setError("Erreur de connexion au serveur");
        notify.error("Erreur", "Connexion au serveur impossible");
      }
    }
  }

  // Label dynamique selon type prospect
  const contactSectionLabel =
    prospectType === "stagiaire" ? "Stagiaire" : "Contact (décideur)";
  const entrepriseSectionLabel =
    prospectType === "organisme" ? "Organisme" : "Entreprise";

  // ---- Render ----
  return (
    <div>
      <PageHeader
        title="Nouvelle demande"
        description="Capturez en une fois le contact, l'entreprise et le besoin de formation."
      />

      {error && (
        <div className="mb-4 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* SECTION TYPE DE PROSPECT (amélioration #2) */}
        <div className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-3">
          <h2 className="text-base font-semibold text-red-600 dark:text-red-500">Type de prospect</h2>
          <div className="grid grid-cols-3 gap-3">
            {PROSPECT_TYPES.map((pt) => {
              const Icon = pt.icon;
              const selected = prospectType === pt.value;
              return (
                <button
                  key={pt.value}
                  type="button"
                  onClick={() => setProspectType(pt.value)}
                  className={`rounded-lg border-2 p-4 text-left transition-all ${
                    selected
                      ? pt.color
                      : "border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 hover:border-gray-400 dark:hover:border-gray-500"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 mb-2 ${selected ? "text-gray-900 dark:text-gray-100" : "text-gray-500 dark:text-gray-400"}`}
                  />
                  <p
                    className={`text-sm font-semibold ${selected ? "text-gray-900 dark:text-gray-100" : "text-gray-700 dark:text-gray-300"}`}
                  >
                    {pt.label}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{pt.sublabel}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* SECTION CONTACT */}
        <div className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
          <h2 className="text-base font-semibold text-red-600 dark:text-red-500">{contactSectionLabel}</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prénom *</label>
              <input
                type="text"
                required
                value={contact.prenom}
                onChange={(e) => setC("prenom", e.target.value)}
                className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom *</label>
              <input
                type="text"
                required
                value={contact.nom}
                onChange={(e) => setC("nom", e.target.value)}
                className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
            <input
              type="email"
              required
              value={contact.email}
              onChange={(e) => setC("email", e.target.value)}
              className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Téléphone</label>
              <input
                type="tel"
                value={contact.telephone}
                onChange={(e) => setC("telephone", e.target.value)}
                className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {prospectType === "stagiaire" ? "Entreprise / Organisme employeur" : "Poste / Fonction"}
              </label>
              <input
                type="text"
                value={contact.poste}
                onChange={(e) => setC("poste", e.target.value)}
                placeholder={prospectType === "stagiaire" ? "Optionnel" : "Responsable formation"}
                className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Origine de la demande : auto-déduit du type de prospect en haut.
            entreprise → client · stagiaire → stagiaire · organisme → client.
            Cf. useEffect [prospectType] qui synchronise form.origine. */}

        {/* SECTION PRISE DE CONTACT */}
        <div className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-3">
          <h2 className="text-base font-semibold text-red-600 dark:text-red-500">Prise de contact</h2>
          <div className="grid grid-cols-4 gap-3">
            {SOURCE_CONTACT.map((s) => {
              const Icon = s.icon;
              const selected = form.sourceContact === s.value;
              return (
                <label
                  key={s.value}
                  className={`cursor-pointer rounded-md border-2 p-3 text-center transition-all ${
                    selected
                      ? "border-red-600 bg-red-50 dark:bg-red-900/10"
                      : "border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 hover:border-gray-400 dark:hover:border-gray-500"
                  }`}
                >
                  <input
                    type="radio"
                    name="sourceContact"
                    value={s.value}
                    checked={selected}
                    onChange={(e) => setF("sourceContact", e.target.value)}
                    className="sr-only"
                  />
                  <Icon
                    className={`h-5 w-5 mx-auto mb-1 ${selected ? "text-red-600 dark:text-red-500" : "text-gray-500 dark:text-gray-400"}`}
                  />
                  <p
                    className={`text-xs font-medium ${selected ? "text-gray-900 dark:text-gray-100" : "text-gray-700 dark:text-gray-300"}`}
                  >
                    {s.label}
                  </p>
                </label>
              );
            })}
          </div>
        </div>

        {/* SECTION ENTREPRISE / ORGANISME — masquée si Stagiaire (amélioration #2) */}
        {prospectType !== "stagiaire" && (
          <div className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-red-600 dark:text-red-500">{entrepriseSectionLabel}</h2>
              <div className="flex rounded-md border border-gray-300 dark:border-gray-600 overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => setEntrepriseMode("existante")}
                  className={`px-3 py-1.5 transition-colors ${
                    entrepriseMode === "existante"
                      ? "bg-red-600 text-white"
                      : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                  }`}
                >
                  Existante
                </button>
                <button
                  type="button"
                  onClick={() => setEntrepriseMode("nouvelle")}
                  className={`px-3 py-1.5 transition-colors ${
                    entrepriseMode === "nouvelle"
                      ? "bg-red-600 text-white"
                      : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                  }`}
                >
                  Nouvelle
                </button>
              </div>
            </div>

            {entrepriseMode === "existante" ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {entrepriseSectionLabel} *
                  </label>
                  <select
                    value={form.entrepriseId}
                    onChange={(e) => handleEntrepriseChange(e.target.value)}
                    required={entrepriseMode === "existante"}
                    className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 text-sm"
                  >
                    <option value="">-- Sélectionner --</option>
                    {entreprises.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.nom}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nature (secteur)
                    </label>
                    <input
                      type="text"
                      value={form.nature}
                      onChange={(e) => setF("nature", e.target.value)}
                      placeholder="Auto-rempli depuis l'entreprise"
                      className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nb de salariés
                    </label>
                    <input
                      type="number"
                      value={form.nbSalaries}
                      onChange={(e) => setF("nbSalaries", e.target.value)}
                      placeholder="Auto depuis effectif"
                      className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 text-sm"
                    />
                  </div>
                </div>
              </>
            ) : (
              /* Nouvelle entreprise/organisme */
              <>
                {/* Recherche SIRET / nom API gouv (amélioration #4) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Rechercher par nom ou SIRET
                    <span className="ml-1 text-xs text-gray-400 dark:text-gray-500 font-normal">(auto-fill via API gouvernement)</span>
                  </label>
                  <EntrepriseAutocomplete onSelect={handleEntrepriseGouvSelect} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Raison sociale *
                  </label>
                  <input
                    type="text"
                    required={entrepriseMode === "nouvelle"}
                    value={form.entrepriseNom}
                    onChange={(e) => setF("entrepriseNom", e.target.value)}
                    className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 text-sm"
                  />
                </div>

                {/* Champ "Nature de l'organisme" visible uniquement si type = organisme (amélioration #2) */}
                {prospectType === "organisme" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nature de l'organisme
                    </label>
                    <select
                      value={form.natureOrganisme}
                      onChange={(e) => setF("natureOrganisme", e.target.value)}
                      className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 text-sm"
                    >
                      <option value="">-- Sélectionner --</option>
                      <option value="opco">OPCO</option>
                      <option value="sous-traitant">Sous-traitant</option>
                      <option value="partenaire">Partenaire</option>
                      <option value="autre">Autre</option>
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SIRET</label>
                    <input
                      type="text"
                      value={form.entrepriseSiret}
                      onChange={(e) => setF("entrepriseSiret", e.target.value)}
                      placeholder="14 chiffres"
                      className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Secteur / Code NAF</label>
                    <input
                      type="text"
                      value={form.entrepriseSecteur}
                      onChange={(e) => setF("entrepriseSecteur", e.target.value)}
                      className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Adresse</label>
                  <input
                    type="text"
                    value={form.entrepriseAdresse}
                    onChange={(e) => setF("entrepriseAdresse", e.target.value)}
                    className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Code postal</label>
                    <input
                      type="text"
                      value={form.entrepriseCodePostal}
                      onChange={(e) => setF("entrepriseCodePostal", e.target.value)}
                      className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ville</label>
                    <input
                      type="text"
                      value={form.entrepriseVille}
                      onChange={(e) => setF("entrepriseVille", e.target.value)}
                      className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Effectif</label>
                  <input
                    type="number"
                    value={form.entrepriseEffectif}
                    onChange={(e) => setF("entrepriseEffectif", e.target.value)}
                    placeholder="Nb de salariés"
                    className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 text-sm"
                  />
                </div>
              </>
            )}

            {/* Nb stagiaires : compteur pour entreprise/organisme, désactivé si
                stagiaires nominaux saisis (auto-sync sur stagiaires.length). */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nb de stagiaires {prospectType === "entreprise" ? "(à former)" : "(à former par l'organisme)"}
              </label>
              <input
                type="number"
                min="1"
                value={
                  prospectType === "entreprise" && stagiaires.length > 0
                    ? String(stagiaires.length)
                    : form.nbStagiaires
                }
                onChange={(e) => setF("nbStagiaires", e.target.value)}
                disabled={prospectType === "entreprise" && stagiaires.length > 0}
                className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 text-sm disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:text-gray-500"
              />
              {prospectType === "entreprise" && stagiaires.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">Auto-rempli depuis la liste nominale ci-dessous.</p>
              )}
            </div>
          </div>
        )}

        {/* Liste des stagiaires nominaux — uniquement pour type Entreprise */}
        {prospectType === "entreprise" && (
          <div className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-red-600" />
                <h2 className="text-base font-semibold text-red-600 dark:text-red-500">
                  Stagiaires à former <span className="text-xs text-gray-500 font-normal">(optionnel)</span>
                </h2>
              </div>
              {!showStagiairesNominal && stagiaires.length === 0 ? (
                <button
                  type="button"
                  onClick={() => { setShowStagiairesNominal(true); addStagiaire(); }}
                  className="inline-flex items-center gap-1 rounded-md border border-red-600 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Plus className="h-3.5 w-3.5" /> Saisir nominalement
                </button>
              ) : (
                <button
                  type="button"
                  onClick={addStagiaire}
                  className="inline-flex items-center gap-1 rounded-md border border-red-600 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Plus className="h-3.5 w-3.5" /> Ajouter
                </button>
              )}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Si l&apos;entreprise a fourni la liste, saisis-la maintenant. Sinon laisse vide et indique juste le nombre — les noms seront saisis plus tard à l&apos;inscription en session.
            </p>

            {stagiaires.length > 0 && (
              <div className="space-y-3">
                {stagiaires.map((s, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end p-3 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
                    <div className="md:col-span-3">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Prénom *</label>
                      <input
                        type="text"
                        value={s.prenom}
                        onChange={(e) => updateStagiaire(idx, "prenom", e.target.value)}
                        className="w-full h-9 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 text-sm"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nom *</label>
                      <input
                        type="text"
                        value={s.nom}
                        onChange={(e) => updateStagiaire(idx, "nom", e.target.value)}
                        className="w-full h-9 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 text-sm"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Email</label>
                      <input
                        type="email"
                        value={s.email}
                        onChange={(e) => updateStagiaire(idx, "email", e.target.value)}
                        className="w-full h-9 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 text-sm"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Téléphone</label>
                      <input
                        type="tel"
                        value={s.telephone}
                        onChange={(e) => updateStagiaire(idx, "telephone", e.target.value)}
                        className="w-full h-9 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 text-sm"
                      />
                    </div>
                    <div className="md:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeStagiaire(idx)}
                        className="h-9 w-9 inline-flex items-center justify-center rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="Retirer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION FORMATION SOUHAITÉE — avec autocomplete catalogue (amélioration #3) */}
        <div className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
          <h2 className="text-base font-semibold text-red-600 dark:text-red-500">Formation souhaitée</h2>

          {/* Combobox / autocomplete formation */}
          <div ref={formationRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Formation du catalogue
              <span className="ml-1 text-xs text-gray-400 dark:text-gray-500 font-normal">(ou saisie libre)</span>
            </label>

            {selectedFormationLabel && !formationDropdownOpen ? (
              <div className="flex items-center gap-2 h-10 rounded-md border border-red-400 dark:border-red-500 bg-red-50 dark:bg-red-900/10 px-3">
                <span className="text-sm text-gray-900 dark:text-gray-100 flex-1 truncate">{selectedFormationLabel}</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFormationLabel("");
                    setForm((f) => ({ ...f, formationId: "", titre: "" }));
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={formationSearch}
                    onChange={(e) => {
                      setFormationSearch(e.target.value);
                      setFormationDropdownOpen(true);
                    }}
                    onFocus={() => setFormationDropdownOpen(true)}
                    placeholder="Rechercher une formation (ex : SST, incendie...)"
                    className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 pl-9 pr-4 text-sm"
                  />
                </div>

                {formationDropdownOpen && (
                  <ul className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredFormations.length === 0 && formationSearch.trim() !== "" ? (
                      <li>
                        <button
                          type="button"
                          onClick={() => handleFormationSelect(null)}
                          className="w-full text-left px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-500 dark:text-gray-400"
                        >
                          Autre — saisir &ldquo;{formationSearch}&rdquo; manuellement
                        </button>
                      </li>
                    ) : (
                      <>
                        {filteredFormations.slice(0, 10).map((f) => (
                          <li key={f.id}>
                            <button
                              type="button"
                              onClick={() => handleFormationSelect(f)}
                              className="w-full text-left px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{f.titre}</span>
                              {f.categorie && (
                                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">{f.categorie}</span>
                              )}
                            </button>
                          </li>
                        ))}
                        <li>
                          <button
                            type="button"
                            onClick={() => handleFormationSelect(null)}
                            className="w-full text-left px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-600"
                          >
                            Autre — saisir manuellement
                          </button>
                        </li>
                      </>
                    )}
                  </ul>
                )}
              </>
            )}
          </div>

          {/* Titre libre — affiché si pas de formation catalogue choisie OU si "Autre" */}
          {(!form.formationId) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Titre de la demande *
              </label>
              <input
                type="text"
                required={!form.formationId}
                value={form.titre}
                onChange={(e) => setF("titre", e.target.value)}
                placeholder="Ex: Formation Sécurité Incendie pour 10 salariés"
                className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 text-sm"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Dates souhaitées
              </label>
              <input
                type="text"
                value={form.datesSouhaitees}
                onChange={(e) => setF("datesSouhaitees", e.target.value)}
                placeholder="Ex: semaine du 15 mai"
                className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Lieu</label>
              <input
                type="text"
                value={form.lieu}
                onChange={(e) => setF("lieu", e.target.value)}
                placeholder="Sur site / Centre RFC / Autre"
                className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Budget indicatif (EUR)
            </label>
            <input
              type="number"
              value={form.budget}
              onChange={(e) => setF("budget", e.target.value)}
              className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 text-sm"
            />
          </div>
        </div>

        {/* SECTION DÉCRIVEZ LE BESOIN (amélioration #1) */}
        <div className="rounded-lg border border-red-300 dark:border-red-700/30 bg-red-50/50 dark:bg-red-900/5 p-6 space-y-4">
          <h2 className="text-base font-semibold text-red-600 dark:text-red-500">Décrivez le besoin</h2>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Description du besoin *
                </label>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                  Contexte, objectifs, contraintes, délais, public cible...
                </p>
              </div>
              <AIButton
                endpoint="/api/ai/demande"
                payload={{
                  action: "brief",
                  titre: form.titre,
                  description: form.description,
                  origine: form.origine,
                  nbStagiaires: form.nbStagiaires,
                  entrepriseId: form.entrepriseId,
                }}
                onResult={(t) => setF("description", t)}
                label="Générer un brief IA"
              />
            </div>
            <textarea
              value={form.description}
              onChange={(e) => setF("description", e.target.value)}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2.5 text-sm resize-y min-h-[160px]"
              rows={7}
              placeholder="Contexte, objectifs, contraintes, délais..."
            />
            <p className="text-xs text-gray-500 text-right">{form.description.length} caractères</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Observation / Contraintes spécifiques
            </label>
            <textarea
              value={form.observation}
              onChange={(e) => setF("observation", e.target.value)}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
              rows={3}
              placeholder="Remarques particulières, handicap, points de vigilance..."
            />
          </div>
        </div>

        {/* SECTION MATÉRIEL SUR PLACE */}
        <div className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-3">
          <h2 className="text-base font-semibold text-red-600 dark:text-red-500">Matériel sur place</h2>
          <p className="text-xs text-gray-600 dark:text-gray-400">Cocher le matériel disponible chez le client.</p>
          <div className="grid grid-cols-3 gap-3">
            {MATERIEL.map((m) => {
              const checked = form.materielSurPlace.includes(m.key);
              return (
                <label
                  key={m.key}
                  className={`cursor-pointer rounded-md border-2 px-4 py-3 text-sm flex items-center gap-2 transition-all ${
                    checked
                      ? "border-red-600 bg-red-50 dark:bg-red-900/10 text-gray-900 dark:text-gray-100"
                      : "border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleMateriel(m.key)}
                    className="text-red-600 focus:ring-red-500"
                  />
                  {m.label}
                </label>
              );
            })}
          </div>
        </div>

        {/* Notes internes */}
        <div className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes internes</label>
          <textarea
            value={form.notes}
            onChange={(e) => setF("notes", e.target.value)}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
            rows={3}
          />
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-sm text-white font-medium disabled:opacity-50"
          >
            {saving ? "Création..." : "Créer la demande"}
          </button>
        </div>
      </form>
    </div>
  );
}
