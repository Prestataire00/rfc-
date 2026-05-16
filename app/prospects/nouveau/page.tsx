"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Building2, User, GraduationCap, Phone, Mail, MapPin, Globe } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { AIButton } from "@/components/shared/AIButton";
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

const ORIGINES = [
  {
    value: "client",
    label: "Client / Entreprise",
    icon: Building2,
    description: "La demande vient d'une entreprise cliente",
    color: "border-blue-600 bg-blue-900/10",
  },
  {
    value: "stagiaire",
    label: "Stagiaire / Individu",
    icon: User,
    description: "La demande vient d'un individu",
    color: "border-green-600 bg-green-900/10",
  },
  {
    value: "centre",
    label: "Centre de formation",
    icon: GraduationCap,
    description: "Initiative interne du centre",
    color: "border-red-600 bg-red-900/10",
  },
];

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

  // ---- Contact (décideur) ----
  const [contact, setContact] = useState({
    prenom: "",
    nom: "",
    email: "",
    telephone: "",
    poste: "",
  });

  // ---- Mode entreprise ----
  const [entrepriseMode, setEntrepriseMode] = useState<"existante" | "nouvelle">("existante");

  // ---- Formulaire principal (même shape que l'ancien /demandes/nouveau) ----
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
    // Autres
    sourceContact: "",
    lieu: "",
    observation: "",
    priorite: "normale",
    materielSurPlace: [] as string[],
  });

  // ---- APIs ----
  const { data: entreprisesRaw } = useApi<EntrepriseOption[] | { entreprises: EntrepriseOption[] }>("/api/entreprises");
  const { data: entrepriseDetail } = useApi<EntrepriseOption>(
    form.entrepriseId ? `/api/entreprises/${form.entrepriseId}` : null
  );
  const { trigger: createProspect, isMutating: saving } = useApiMutation<Record<string, unknown>, ProspectResult>(
    "/api/prospects",
    "POST"
  );

  const entreprises: EntrepriseOption[] = Array.isArray(entreprisesRaw)
    ? entreprisesRaw
    : (entreprisesRaw as { entreprises?: EntrepriseOption[] })?.entreprises ?? [];

  // Auto-remplir nature + nbSalaries depuis l'entreprise sélectionnée
  useEffect(() => {
    if (!entrepriseDetail) return;
    setForm((f) => ({
      ...f,
      nature: f.nature || entrepriseDetail.secteur || "",
      nbSalaries: f.nbSalaries || (entrepriseDetail.effectif != null ? String(entrepriseDetail.effectif) : ""),
      // Pré-remplir aussi les champs "nouvelle" pour cohérence
      entrepriseSecteur: f.entrepriseSecteur || entrepriseDetail.secteur || "",
      entrepriseEffectif: f.entrepriseEffectif || (entrepriseDetail.effectif != null ? String(entrepriseDetail.effectif) : ""),
    }));
  }, [entrepriseDetail]);

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

    // Payload vers POST /api/prospects
    const payload: Record<string, unknown> = {
      contact: {
        prenom: contact.prenom,
        nom: contact.nom,
        email: contact.email,
        telephone: contact.telephone || undefined,
        poste: contact.poste || undefined,
      },
      entrepriseMode,
      ...(entrepriseMode === "existante"
        ? { entrepriseId: form.entrepriseId }
        : {
            entrepriseNouvelle: {
              nom: form.entrepriseNom,
              siret: form.entrepriseSiret || undefined,
              adresse: form.entrepriseAdresse || undefined,
              codePostal: form.entrepriseCodePostal || undefined,
              ville: form.entrepriseVille || undefined,
              secteur: form.entrepriseSecteur || undefined,
              effectif: form.entrepriseEffectif ? Number(form.entrepriseEffectif) : undefined,
            },
          }),
      demande: {
        origine: form.origine,
        sourceContact: form.sourceContact || undefined,
        formationSouhaitee: form.titre,
        nbStagiaires: form.nbStagiaires ? Number(form.nbStagiaires) : undefined,
        datesSouhaitees: form.datesSouhaitees || undefined,
        budgetEnvisage: form.budget ? Number(form.budget) : undefined,
      },
      besoinsParticuliers: {
        handicapContraintes: form.observation || undefined,
        materielSurPlace: form.materielSurPlace.length > 0 ? form.materielSurPlace.join(", ") : undefined,
      },
      notesInternes,
    };

    try {
      const result = await createProspect(payload);
      notify.success("Prospect créé", `${contact.prenom} ${contact.nom}`);
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

  // ---- Render ----
  return (
    <div>
      <PageHeader
        title="Nouvelle demande"
        description="Capturez en une fois le contact, l'entreprise et le besoin de formation."
      />

      {error && (
        <div className="max-w-2xl mb-4 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">

        {/* SECTION 0 : Contact (décideur) */}
        <div className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
          <h2 className="text-base font-semibold text-red-600 dark:text-red-500">Contact (décideur)</h2>

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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Poste / Fonction</label>
              <input
                type="text"
                value={contact.poste}
                onChange={(e) => setC("poste", e.target.value)}
                placeholder="Responsable formation"
                className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 text-sm"
              />
            </div>
          </div>
        </div>

        {/* SECTION 1 : Origine de la demande */}
        <div className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-3">
          <h2 className="text-base font-semibold text-red-600 dark:text-red-500">Origine de la demande *</h2>
          <div className="grid grid-cols-3 gap-3">
            {ORIGINES.map((o) => {
              const Icon = o.icon;
              const selected = form.origine === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setF("origine", o.value)}
                  className={`rounded-lg border-2 p-4 text-left transition-all ${
                    selected
                      ? o.color
                      : "border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 hover:border-gray-400 dark:hover:border-gray-500"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 mb-2 ${selected ? "text-gray-900 dark:text-gray-100" : "text-gray-500 dark:text-gray-400"}`}
                  />
                  <p
                    className={`text-sm font-semibold ${selected ? "text-gray-900 dark:text-gray-100" : "text-gray-700 dark:text-gray-300"}`}
                  >
                    {o.label}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{o.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* SECTION 2 : Prise de contact */}
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

        {/* SECTION 3 : Entreprise */}
        <div className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-red-600 dark:text-red-500">Entreprise</h2>
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
                  Entreprise *
                </label>
                <select
                  value={form.entrepriseId}
                  onChange={(e) => handleEntrepriseChange(e.target.value)}
                  required={entrepriseMode === "existante"}
                  className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 text-sm"
                >
                  <option value="">-- Sélectionner une entreprise --</option>
                  {entreprises.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nom}
                    </option>
                  ))}
                </select>
              </div>

              {/* Nature + Nb salariés (auto depuis entreprise) */}
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
            /* Nouvelle entreprise */
            <>
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Secteur</label>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nb de stagiaires (à former)
            </label>
            <input
              type="number"
              value={form.nbStagiaires}
              onChange={(e) => setF("nbStagiaires", e.target.value)}
              className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 text-sm"
            />
          </div>
        </div>

        {/* SECTION 4 : Formation souhaitée */}
        <div className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4">
          <h2 className="text-base font-semibold text-red-600 dark:text-red-500">Formation souhaitée</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Titre de la demande *
            </label>
            <input
              type="text"
              required
              value={form.titre}
              onChange={(e) => setF("titre", e.target.value)}
              placeholder="Ex: Formation Sécurité Incendie pour 10 salariés"
              className="w-full h-10 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 text-sm"
            />
          </div>

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

        {/* SECTION 5 : Besoins particuliers */}
        <div className="rounded-lg border border-red-300 dark:border-red-700/30 bg-red-50/50 dark:bg-red-900/5 p-6 space-y-4">
          <h2 className="text-base font-semibold text-red-600 dark:text-red-500">Besoins particuliers</h2>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Descriptif de la demande *
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
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2.5 text-sm resize-y min-h-[140px]"
              rows={6}
              placeholder="Contexte, objectifs, contraintes, délais..."
            />
            <p className="text-xs text-gray-500 text-right">{form.description.length} caractères</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Observation / Contraintes
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

        {/* SECTION 6 : Matériel sur place */}
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
