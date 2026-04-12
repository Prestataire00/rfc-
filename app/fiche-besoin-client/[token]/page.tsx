"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { CheckCircle2, AlertCircle, Loader2, Building2, Users, BookOpen, Accessibility } from "lucide-react";

type Fiche = {
  id: string;
  statut: string;
  optionnel: boolean;
  destinataireNom: string | null;
  session: {
    id: string;
    dateDebut: string;
    dateFin: string;
    formation: { titre: string; categorie: string | null; duree: number };
  };
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
};

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

export default function FicheBesoinClientPage() {
  const { token } = useParams<{ token: string }>();
  const [fiche, setFiche] = useState<Fiche | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({});

  useEffect(() => {
    fetch(`/api/besoin-client/public/${token}`)
      .then((r) => r.ok ? r.json() : Promise.reject(r))
      .then((d: Fiche) => {
        setFiche(d);
        setForm({
          secteurActivite: d.secteurActivite ?? d.entreprise?.secteur ?? "",
          effectifTotal: d.effectifTotal ?? d.entreprise?.effectif ?? "",
          effectifConcerne: d.effectifConcerne ?? "",
          metiersStagiaires: d.metiersStagiaires ?? "",
          contexteTravail: d.contexteTravail ?? "",
          contraintesSpecifiques: d.contraintesSpecifiques ?? "",
          objectifPrincipal: d.objectifPrincipal ?? "",
          objectifsClient: d.objectifsClient ?? "",
          casAccidentsRecents: d.casAccidentsRecents ?? false,
          detailsCasAccidents: d.detailsCasAccidents ?? "",
          contraintesHoraires: d.contraintesHoraires ?? "",
          aStagiairesHandicap: d.aStagiairesHandicap ?? false,
          detailsHandicap: d.detailsHandicap ?? "",
        });
      })
      .catch(() => setError("Lien invalide ou expire"))
      .finally(() => setLoading(false));
  }, [token]);

  const set = (k: string, v: unknown) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const payload = {
      ...form,
      effectifTotal: form.effectifTotal ? Number(form.effectifTotal) : null,
      effectifConcerne: form.effectifConcerne ? Number(form.effectifConcerne) : null,
    };
    try {
      const res = await fetch(`/api/besoin-client/public/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(typeof d.error === "string" ? d.error : "Erreur lors de l'envoi");
        setSaving(false);
        return;
      }
      setSuccess(true);
    } catch {
      setError("Erreur reseau");
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-100"><Loader2 className="h-8 w-8 animate-spin text-red-600" /></div>;

  if (error && !fiche) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="max-w-md bg-white rounded-xl shadow p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Lien invalide</h1>
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (success || fiche?.statut === "repondu") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="max-w-md bg-white rounded-xl shadow p-8 text-center">
          <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Fiche transmise</h1>
          <p className="text-sm text-gray-600">Merci, votre reponse a bien ete enregistree. Henri adaptera le programme en consequence.</p>
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
              <h1 className="text-xl font-bold text-gray-900">Fiche d&apos;analyse du besoin</h1>
              <p className="text-xs text-gray-500">Rescue Formation Conseil</p>
            </div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-gray-700">
              Formation : <strong>{fiche.session.formation.titre}</strong> ({fiche.session.formation.duree}h) — debut le {new Date(fiche.session.dateDebut).toLocaleDateString("fr-FR")}
            </p>
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
