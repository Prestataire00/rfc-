"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { CheckCircle2, AlertCircle, Loader2, Building2, Users, BookOpen, Accessibility, Plus, Trash2, UserPlus } from "lucide-react";
import { useApi, useApiMutation, ApiError } from "@/hooks/useApi";

type Fiche = {
  id: string;
  statut: string;
  optionnel: boolean;
  destinataireNom: string | null;
  // session optionnelle : la fiche peut être créée à la naissance du prospect,
  // avant qu'une session ne soit planifiée.
  session: {
    id: string;
    dateDebut: string;
    dateFin: string;
    formation: { titre: string; categorie: string | null; duree: number };
  } | null;
  // formation directe (cas fiche pré-session)
  formation: { titre: string; categorie: string | null; duree: number } | null;
  entreprise: { id: string; nom: string; secteur: string | null; effectif: number | null } | null;
  secteurActivite: string | null;
  effectifTotal: number | null;
  effectifConcerne: number | null;
  metiersStagiaires: string | null;
  contexteTravail: string | null;
  contraintesSpecifiques: string | null;
  objectifPrincipal: string | null;
  objectifsClient: string | null;
  casAccidentsRecents: boolean;
  detailsCasAccidents: string | null;
  contraintesHoraires: string | null;
  aStagiairesHandicap: boolean;
  detailsHandicap: string | null;
  stagiairesData?: string | null;
};

type StagiaireRow = {
  prenom: string;
  nom: string;
  email: string;
  dateNaissance: string;
  sexe: string;
  lieuNaissance: string;
};

const emptyStagiaire: StagiaireRow = { prenom: "", nom: "", email: "", dateNaissance: "", sexe: "", lieuNaissance: "" };

const SECTEURS = [
  { value: "securite_privee", label: "Securite privee" },
  { value: "btp", label: "BTP" },
  { value: "sante", label: "Sante" },
  { value: "transport", label: "Transport" },
  { value: "industrie", label: "Industrie" },
  { value: "commerce", label: "Commerce" },
  { value: "autre", label: "Autre" },
];

const OBJECTIFS = [
  { value: "renouvellement_carte_pro", label: "Renouvellement carte professionnelle" },
  { value: "premiere_habilitation", label: "Premiere habilitation" },
  { value: "recyclage_annuel", label: "Recyclage annuel" },
  { value: "autre", label: "Autre" },
];

export default function FichePreFormationEntreprisePage() {
  const { token } = useParams<{ token: string }>();
  const { data: fiche, error: fetchError, isLoading, mutate } = useApi<Fiche>(
    token ? `/api/qualiopi/fiches-entreprise/public/${token}` : null
  );
  const submitMutation = useApiMutation<Record<string, unknown>>(
    `/api/qualiopi/fiches-entreprise/public/${token}`,
    "POST"
  );
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [stagiaires, setStagiaires] = useState<StagiaireRow[]>([]);

  const loading = isLoading;
  const saving = submitMutation.isMutating;
  const loadError = fetchError ? "Lien invalide ou expire" : "";
  const error = submitError || loadError;

  // Hydrate form when fiche is loaded
  useEffect(() => {
    if (!fiche) return;
    setForm({
      secteurActivite: fiche.secteurActivite ?? fiche.entreprise?.secteur ?? "",
      effectifTotal: fiche.effectifTotal ?? fiche.entreprise?.effectif ?? "",
      effectifConcerne: fiche.effectifConcerne ?? "",
      metiersStagiaires: fiche.metiersStagiaires ?? "",
      contexteTravail: fiche.contexteTravail ?? "",
      contraintesSpecifiques: fiche.contraintesSpecifiques ?? "",
      objectifPrincipal: fiche.objectifPrincipal ?? "",
      objectifsClient: fiche.objectifsClient ?? "",
      casAccidentsRecents: fiche.casAccidentsRecents ?? false,
      detailsCasAccidents: fiche.detailsCasAccidents ?? "",
      contraintesHoraires: fiche.contraintesHoraires ?? "",
      aStagiairesHandicap: fiche.aStagiairesHandicap ?? false,
      detailsHandicap: fiche.detailsHandicap ?? "",
    });
  }, [fiche]);

  const set = (k: string, v: unknown) => setForm((p) => ({ ...p, [k]: v }));

  const addStagiaire = () => setStagiaires((p) => [...p, { ...emptyStagiaire }]);
  const removeStagiaire = (i: number) => setStagiaires((p) => p.filter((_, idx) => idx !== i));
  const updateStagiaire = (i: number, k: keyof StagiaireRow, v: string) =>
    setStagiaires((p) => p.map((s, idx) => (idx === i ? { ...s, [k]: v } : s)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    // Ne garde que les stagiaires réellement renseignés (prénom + nom + email).
    const stagiairesRemplis = stagiaires.filter(
      (s) => s.prenom.trim() && s.nom.trim() && s.email.trim(),
    );
    // Détecte une ligne partiellement remplie (au moins un champ mais incomplète).
    const ligneIncomplete = stagiaires.some(
      (s) =>
        (s.prenom.trim() || s.nom.trim() || s.email.trim() || s.dateNaissance || s.sexe || s.lieuNaissance) &&
        !(s.prenom.trim() && s.nom.trim() && s.email.trim()),
    );
    if (ligneIncomplete) {
      setSubmitError("Chaque stagiaire doit avoir au minimum un prénom, un nom et un email.");
      return;
    }

    const payload = {
      ...form,
      effectifTotal: form.effectifTotal ? Number(form.effectifTotal) : null,
      effectifConcerne: form.effectifConcerne ? Number(form.effectifConcerne) : null,
      stagiaires: stagiairesRemplis.map((s) => ({
        prenom: s.prenom.trim(),
        nom: s.nom.trim(),
        email: s.email.trim(),
        dateNaissance: s.dateNaissance || null,
        sexe: s.sexe || null,
        lieuNaissance: s.lieuNaissance || null,
      })),
    };
    try {
      await submitMutation.trigger(payload);
      setSuccess(true);
      // Rafraîchit la fiche pour afficher le récap avec les valeurs persistées
      await mutate();
    } catch (err) {
      if (err instanceof ApiError) {
        setSubmitError(err.message || "Erreur lors de l'envoi");
      } else {
        setSubmitError("Erreur reseau");
      }
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-100"><Loader2 className="h-8 w-8 animate-spin text-red-600" /></div>;

  if (loadError && !fiche) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="max-w-md bg-white rounded-xl shadow p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Lien invalide</h1>
          <p className="text-sm text-gray-600">{loadError}</p>
        </div>
      </div>
    );
  }

  if (success || fiche?.statut === "repondu") {
    if (!fiche) return null;
    const formation = fiche.session?.formation ?? fiche.formation;
    const secteurLabel = SECTEURS.find((s) => s.value === fiche.secteurActivite)?.label
      ?? (fiche.secteurActivite ? fiche.secteurActivite.replace(/_/g, " ") : "—");
    const objectifLabel = OBJECTIFS.find((o) => o.value === fiche.objectifPrincipal)?.label
      ?? (fiche.objectifPrincipal ? fiche.objectifPrincipal.replace(/_/g, " ") : "—");

    let stagiairesRecap: StagiaireRow[] = [];
    try {
      stagiairesRecap = fiche.stagiairesData ? (JSON.parse(fiche.stagiairesData) as StagiaireRow[]) : [];
    } catch {
      stagiairesRecap = [];
    }

    return (
      <div className="min-h-screen bg-gray-100 py-8 px-4">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Header de remerciement */}
          <div className="bg-white rounded-xl shadow-sm p-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
            <h1 className="text-xl font-bold text-gray-900 mb-1">Fiche transmise</h1>
            <p className="text-sm text-gray-600">
              Merci, votre réponse a bien été enregistrée. Henri adaptera le programme en conséquence.
            </p>
            {formation && (
              <p className="text-xs text-gray-500 mt-2">
                Formation : <strong>{formation.titre}</strong>
                {fiche.entreprise?.nom && <> · {fiche.entreprise.nom}</>}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-3">
              Récapitulatif ci-dessous pour vous (et pour l&apos;admin qui ouvre ce lien).
            </p>
          </div>

          {/* Récap des réponses */}
          <Section title="Entreprise" icon={Building2}>
            <RecapField label="Secteur d'activité" value={secteurLabel} />
            <RecapField label="Effectif total" value={fiche.effectifTotal != null ? String(fiche.effectifTotal) : null} />
            <RecapField label="Effectif concerné par la formation" value={fiche.effectifConcerne != null ? String(fiche.effectifConcerne) : null} />
          </Section>

          <Section title="Stagiaires" icon={Users}>
            <RecapField label="Métiers des stagiaires" value={fiche.metiersStagiaires} multiline />
            <RecapField label="Contexte de travail" value={fiche.contexteTravail} multiline />
            <RecapField label="Contraintes spécifiques" value={fiche.contraintesSpecifiques} multiline />
          </Section>

          {stagiairesRecap.length > 0 && (
            <Section title={`Stagiaires à former (${stagiairesRecap.length})`} icon={UserPlus}>
              <div className="space-y-2">
                {stagiairesRecap.map((s, i) => (
                  <div key={i} className="text-sm text-gray-900 flex flex-wrap gap-x-2">
                    <span className="font-medium">{s.prenom} {s.nom}</span>
                    <span className="text-gray-500">· {s.email}</span>
                    {s.dateNaissance && <span className="text-gray-500">· né(e) le {new Date(s.dateNaissance).toLocaleDateString("fr-FR")}</span>}
                    {s.lieuNaissance && <span className="text-gray-500">à {s.lieuNaissance}</span>}
                  </div>
                ))}
              </div>
            </Section>
          )}

          <Section title="La formation" icon={BookOpen}>
            <RecapField label="Objectif principal" value={objectifLabel} />
            <RecapField label="Objectifs clients" value={fiche.objectifsClient} multiline />
            <RecapField label="Accidents récents" value={fiche.casAccidentsRecents ? (fiche.detailsCasAccidents || "Oui (détails non précisés)") : "Non"} multiline />
            <RecapField label="Contraintes horaires" value={fiche.contraintesHoraires} multiline />
          </Section>

          <Section title="Accessibilité" icon={Accessibility}>
            <RecapField label="Stagiaires en situation de handicap" value={fiche.aStagiairesHandicap ? (fiche.detailsHandicap || "Oui") : "Non"} multiline />
          </Section>
        </div>
      </div>
    );
  }

  if (!fiche) return null;

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Image src="/logorescue.png" alt="RFC" width={48} height={48} className="rounded-lg" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Fiche pré-formation entreprise</h1>
              <p className="text-xs text-gray-500">Rescue Formation Conseil</p>
            </div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            {(() => {
              const formation = fiche.session?.formation ?? fiche.formation;
              if (formation) {
                return (
                  <p className="text-sm text-gray-700">
                    Formation : <strong>{formation.titre}</strong> ({formation.duree}h)
                    {fiche.session?.dateDebut && (
                      <> — debut le {new Date(fiche.session.dateDebut).toLocaleDateString("fr-FR")}</>
                    )}
                  </p>
                );
              }
              return (
                <p className="text-sm text-gray-700">
                  Questionnaire de pré-formation — merci de nous aider à comprendre votre besoin.
                </p>
              );
            })()}
            {fiche.entreprise && <p className="text-xs text-gray-600 mt-1">Entreprise : {fiche.entreprise.nom}</p>}
          </div>
          {fiche.optionnel && (
            <div className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
              Cette fiche est optionnelle (session express). Repondez si vous avez le temps, sinon elle sera completee apres la formation.
            </div>
          )}
          <p className="text-sm text-gray-600 mt-3">Merci de repondre a ce questionnaire pour nous permettre d&apos;adapter la formation a votre contexte. Temps estime : 5 minutes.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1 - Entreprise */}
          <Section title="L'entreprise" icon={Building2}>
            <Field label="Secteur d'activite">
              <select value={form.secteurActivite as string} onChange={(e) => set("secteurActivite", e.target.value)} className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm bg-white">
                <option value="">Selectionner...</option>
                {SECTEURS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Effectif total">
                <input type="number" min={0} value={form.effectifTotal as string} onChange={(e) => set("effectifTotal", e.target.value)} className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm" />
              </Field>
              <Field label="Salaries concernes par la formation">
                <input type="number" min={0} value={form.effectifConcerne as string} onChange={(e) => set("effectifConcerne", e.target.value)} className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm" />
              </Field>
            </div>
          </Section>

          {/* Section 2 - Stagiaires */}
          <Section title="Les stagiaires" icon={Users}>
            <Field label="Metier exact des stagiaires">
              <input value={form.metiersStagiaires as string} onChange={(e) => set("metiersStagiaires", e.target.value)} placeholder="Ex : agents de securite cynophiles" className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm" />
            </Field>
            <Field label="Conditions reelles de travail">
              <textarea value={form.contexteTravail as string} onChange={(e) => set("contexteTravail", e.target.value)} placeholder="Ex : agents de nuit en centre commercial, debout 8h" rows={3} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </Field>
            <Field label="Contraintes particulieres sur le lieu de formation">
              <textarea value={form.contraintesSpecifiques as string} onChange={(e) => set("contraintesSpecifiques", e.target.value)} placeholder="Connexion internet, espace disponible, materiel specifique..." rows={2} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </Field>
          </Section>

          {/* Section 2b - Stagiaires nominatifs */}
          <Section title="Vos stagiaires à former" icon={UserPlus}>
            <p className="text-sm text-gray-600 -mt-1">
              Renseignez chaque personne à former. Nous créerons leur dossier et leur enverrons
              automatiquement le programme et leur convention dès la signature du devis.
            </p>
            {stagiaires.length === 0 && (
              <p className="text-sm text-gray-400 italic">Aucun stagiaire ajouté pour l&apos;instant.</p>
            )}
            <div className="space-y-4">
              {stagiaires.map((s, i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-4 bg-gray-50/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500">Stagiaire {i + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeStagiaire(i)}
                      className="text-gray-400 hover:text-red-600 transition-colors inline-flex items-center gap-1 text-xs"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Retirer
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Prénom *">
                      <input value={s.prenom} onChange={(e) => updateStagiaire(i, "prenom", e.target.value)} className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm" />
                    </Field>
                    <Field label="Nom *">
                      <input value={s.nom} onChange={(e) => updateStagiaire(i, "nom", e.target.value)} className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm" />
                    </Field>
                  </div>
                  <Field label="Email *">
                    <input type="email" value={s.email} onChange={(e) => updateStagiaire(i, "email", e.target.value)} className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm" />
                  </Field>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Field label="Date de naissance">
                      <input type="date" value={s.dateNaissance} onChange={(e) => updateStagiaire(i, "dateNaissance", e.target.value)} className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm" />
                    </Field>
                    <Field label="Sexe">
                      <select value={s.sexe} onChange={(e) => updateStagiaire(i, "sexe", e.target.value)} className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm bg-white">
                        <option value="">—</option>
                        <option value="M">Homme</option>
                        <option value="F">Femme</option>
                      </select>
                    </Field>
                    <Field label="Lieu de naissance">
                      <input value={s.lieuNaissance} onChange={(e) => updateStagiaire(i, "lieuNaissance", e.target.value)} className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm" />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addStagiaire}
              className="inline-flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700"
            >
              <Plus className="h-4 w-4" /> Ajouter un stagiaire
            </button>
          </Section>

          {/* Section 3 - Formation */}
          <Section title="La formation" icon={BookOpen}>
            <Field label="Objectif principal">
              <select value={form.objectifPrincipal as string} onChange={(e) => set("objectifPrincipal", e.target.value)} className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm bg-white">
                <option value="">Selectionner...</option>
                {OBJECTIFS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Objectifs specifiques (en complement)">
              <textarea value={form.objectifsClient as string} onChange={(e) => set("objectifsClient", e.target.value)} rows={2} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </Field>
            <div className="flex items-start gap-3 p-3 border border-gray-200 rounded-md bg-gray-50">
              <input type="checkbox" id="casAcc" checked={!!form.casAccidentsRecents} onChange={(e) => set("casAccidentsRecents", e.target.checked)} className="mt-1 h-4 w-4" />
              <label htmlFor="casAcc" className="text-sm text-gray-700 cursor-pointer flex-1">
                Avez-vous des cas d&apos;accidents de travail recents a integrer comme cas pratiques ?
              </label>
            </div>
            {form.casAccidentsRecents ? (
              <Field label="Details des cas d'accidents">
                <textarea value={form.detailsCasAccidents as string} onChange={(e) => set("detailsCasAccidents", e.target.value)} rows={3} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </Field>
            ) : null}
            <Field label="Contraintes horaires (debut, fin, pauses imposees)">
              <input value={form.contraintesHoraires as string} onChange={(e) => set("contraintesHoraires", e.target.value)} placeholder="Ex : debut 9h, pause dejeuner 12h30-13h30" className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm" />
            </Field>
          </Section>

          {/* Section 4 - Accessibilite */}
          <Section title="Accessibilite" icon={Accessibility}>
            <div className="flex items-start gap-3 p-3 border border-gray-200 rounded-md bg-gray-50">
              <input type="checkbox" id="handicap" checked={!!form.aStagiairesHandicap} onChange={(e) => set("aStagiairesHandicap", e.target.checked)} className="mt-1 h-4 w-4" />
              <label htmlFor="handicap" className="text-sm text-gray-700 cursor-pointer flex-1">
                Y a-t-il des stagiaires en situation de handicap ou RQTH ?
              </label>
            </div>
            {form.aStagiairesHandicap ? (
              <Field label="Nature du handicap et amenagements souhaites">
                <textarea value={form.detailsHandicap as string} onChange={(e) => set("detailsHandicap", e.target.value)} rows={3} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </Field>
            ) : null}
          </Section>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-md p-3 text-sm">{error}</div>
          )}

          <button type="submit" disabled={saving} className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 rounded-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {saving ? "Envoi..." : "Transmettre la fiche"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">
        <Icon className="h-5 w-5 text-red-600" /> {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}

// RecapField — paire label/valeur read-only utilisée sur le récap post-soumission.
// `multiline` rend les retours à la ligne dans la valeur (whitespace-pre-line).
function RecapField({ label, value, multiline }: { label: string; value: string | null | undefined; multiline?: boolean }) {
  const displayed = value && String(value).trim() ? String(value) : "—";
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-1 sm:gap-3 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className={`text-gray-900 ${multiline ? "whitespace-pre-line" : ""}`}>{displayed}</span>
    </div>
  );
}
