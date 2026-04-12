"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { CheckCircle2, AlertCircle, Loader2, User, BookOpen, Accessibility, Shield } from "lucide-react";

type Fiche = {
  id: string;
  statut: string;
  optionnel: boolean;
  session: {
    id: string;
    dateDebut: string;
    dateFin: string;
    formation: { titre: string; categorie: string | null };
  };
  contact: {
    id: string;
    nom: string;
    prenom: string;
    email: string;
    dateNaissance: string | null;
    numeroSecuriteSociale: string | null;
    numeroPasseportPrevention: string | null;
    niveauFormation: string | null;
  };
  dejaSuivi: boolean;
  dateDerniereFormation: string | null;
  niveauFormation: string | null;
  estRQTH: boolean;
  detailsRQTH: string | null;
  contraintesPhysiques: string | null;
  contraintesLangue: string | null;
  contraintesAlimentaires: string | null;
  consentementRGPD: boolean;
  consentementBPF: boolean;
};

const NIVEAUX = [
  { value: "sans_diplome", label: "Sans diplome" },
  { value: "cap", label: "CAP / BEP" },
  { value: "bac", label: "BAC" },
  { value: "bac+2", label: "BAC+2" },
  { value: "bac+3", label: "BAC+3" },
  { value: "bac+5", label: "BAC+5 ou plus" },
  { value: "autre", label: "Autre" },
];

function formatSecuDisplay(v: string): string {
  const clean = v.replace(/\s/g, "");
  if (clean.length !== 15) return v;
  return `${clean.slice(0, 1)} ${clean.slice(1, 3)} ${clean.slice(3, 5)} ${clean.slice(5, 7)} ${clean.slice(7, 10)} ${clean.slice(10, 13)} ${clean.slice(13, 15)}`;
}

export default function FicheBesoinStagiairePage() {
  const { token } = useParams<{ token: string }>();
  const [fiche, setFiche] = useState<Fiche | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({});

  useEffect(() => {
    fetch(`/api/besoin-stagiaire/public/${token}`)
      .then((r) => r.ok ? r.json() : Promise.reject(r))
      .then((d: Fiche) => {
        setFiche(d);
        setForm({
          dateNaissance: d.contact?.dateNaissance ? d.contact.dateNaissance.slice(0, 10) : "",
          numeroSecuriteSociale: d.contact?.numeroSecuriteSociale?.startsWith("•") ? "" : (d.contact?.numeroSecuriteSociale ?? ""),
          numeroPasseportPrevention: d.contact?.numeroPasseportPrevention ?? "",
          dejaSuivi: d.dejaSuivi ?? false,
          dateDerniereFormation: d.dateDerniereFormation ? d.dateDerniereFormation.slice(0, 10) : "",
          niveauFormation: d.niveauFormation ?? d.contact?.niveauFormation ?? "",
          estRQTH: d.estRQTH ?? false,
          detailsRQTH: d.detailsRQTH ?? "",
          contraintesPhysiques: d.contraintesPhysiques ?? "",
          contraintesLangue: d.contraintesLangue ?? "",
          contraintesAlimentaires: d.contraintesAlimentaires ?? "",
          consentementRGPD: d.consentementRGPD ?? false,
          consentementBPF: d.consentementBPF ?? false,
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

    if (!form.consentementRGPD) {
      setError("Le consentement RGPD est obligatoire");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(`/api/besoin-stagiaire/public/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Merci !</h1>
          <p className="text-sm text-gray-600">Vos informations ont bien ete transmises. Le formateur en tiendra compte pour adapter la formation a vos besoins.</p>
        </div>
      </div>
    );
  }

  if (!fiche) return null;

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Image src="/logorescue.png" alt="RFC" width={48} height={48} className="rounded-lg" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Fiche individuelle de besoin</h1>
              <p className="text-xs text-gray-500">Rescue Formation Conseil</p>
            </div>
          </div>
          <p className="text-sm text-gray-700">Bonjour <strong>{fiche.contact.prenom} {fiche.contact.nom}</strong>,</p>
          <p className="text-sm text-gray-600 mt-2">Vous etes inscrit(e) a la formation <strong>{fiche.session.formation.titre}</strong> qui debute le {new Date(fiche.session.dateDebut).toLocaleDateString("fr-FR")}.</p>
          <p className="text-sm text-gray-600 mt-2">Merci de completer ce questionnaire pour que nous puissions adapter la formation a vos besoins. Temps estime : 3 minutes.</p>
          {fiche.optionnel && (
            <div className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
              Cette fiche est optionnelle (session express). Vous pourrez la completer apres la formation si vous manquez de temps.
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1 - Identification */}
          <Section title="Identification" icon={User}>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Prenom">
                <input value={fiche.contact.prenom} disabled className="w-full h-10 rounded-md border border-gray-200 bg-gray-50 px-3 text-sm text-gray-600" />
              </Field>
              <Field label="Nom">
                <input value={fiche.contact.nom} disabled className="w-full h-10 rounded-md border border-gray-200 bg-gray-50 px-3 text-sm text-gray-600" />
              </Field>
            </div>
            <Field label="Date de naissance">
              <input type="date" value={form.dateNaissance as string} onChange={(e) => set("dateNaissance", e.target.value)} className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm" />
            </Field>
            <Field label="Numero de securite sociale (15 chiffres)">
              <input
                value={form.numeroSecuriteSociale as string}
                onChange={(e) => set("numeroSecuriteSociale", e.target.value.replace(/[^0-9\s]/g, ""))}
                placeholder="1 99 12 75 123 456 78"
                maxLength={21}
                className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm font-mono"
              />
              {form.numeroSecuriteSociale ? <p className="text-xs text-gray-500 mt-1">{formatSecuDisplay(form.numeroSecuriteSociale as string)}</p> : null}
            </Field>
            <Field label="Numero de Passeport Prevention (si applicable)">
              <input value={form.numeroPasseportPrevention as string} onChange={(e) => set("numeroPasseportPrevention", e.target.value)} placeholder="Obligation ministerielle (decret 2022-1434)" className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm" />
            </Field>
          </Section>

          {/* Section 2 - Prerequis */}
          <Section title="Prerequis" icon={BookOpen}>
            <div className="flex items-start gap-3 p-3 border border-gray-200 rounded-md bg-gray-50">
              <input type="checkbox" id="dejaSuivi" checked={!!form.dejaSuivi} onChange={(e) => set("dejaSuivi", e.target.checked)} className="mt-1 h-4 w-4" />
              <label htmlFor="dejaSuivi" className="text-sm text-gray-700 cursor-pointer flex-1">
                J&apos;ai deja suivi cette formation par le passe
              </label>
            </div>
            {form.dejaSuivi ? (
              <Field label="Date de la derniere formation">
                <input type="date" value={form.dateDerniereFormation as string} onChange={(e) => set("dateDerniereFormation", e.target.value)} className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm" />
              </Field>
            ) : null}
            <Field label="Niveau de formation generale">
              <select value={form.niveauFormation as string} onChange={(e) => set("niveauFormation", e.target.value)} className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm bg-white">
                <option value="">Selectionner...</option>
                {NIVEAUX.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
              </select>
            </Field>
          </Section>

          {/* Section 3 - Accessibilite */}
          <Section title="Accessibilite et contraintes" icon={Accessibility}>
            <div className="flex items-start gap-3 p-3 border border-gray-200 rounded-md bg-gray-50">
              <input type="checkbox" id="rqth" checked={!!form.estRQTH} onChange={(e) => set("estRQTH", e.target.checked)} className="mt-1 h-4 w-4" />
              <label htmlFor="rqth" className="text-sm text-gray-700 cursor-pointer flex-1">
                Je suis reconnu(e) travailleur handicape (RQTH)
              </label>
            </div>
            {form.estRQTH ? (
              <Field label="Amenagements souhaites">
                <textarea value={form.detailsRQTH as string} onChange={(e) => set("detailsRQTH", e.target.value)} rows={2} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </Field>
            ) : null}
            <Field label="Contraintes physiques particulieres">
              <textarea value={form.contraintesPhysiques as string} onChange={(e) => set("contraintesPhysiques", e.target.value)} placeholder="Ex : ne peut pas rester assis plus de 2 heures" rows={2} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </Field>
            <Field label="Contraintes de langue ou de lecture">
              <textarea value={form.contraintesLangue as string} onChange={(e) => set("contraintesLangue", e.target.value)} placeholder="Pour adapter les supports pedagogiques" rows={2} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </Field>
            <Field label="Contraintes alimentaires (pauses repas)">
              <input value={form.contraintesAlimentaires as string} onChange={(e) => set("contraintesAlimentaires", e.target.value)} placeholder="Ex : sans porc, vegetarien, allergies" className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm" />
            </Field>
          </Section>

          {/* Section 4 - Consentement */}
          <Section title="Consentement" icon={Shield}>
            <div className="flex items-start gap-3 p-3 border border-red-200 rounded-md bg-red-50">
              <input type="checkbox" id="rgpd" checked={!!form.consentementRGPD} onChange={(e) => set("consentementRGPD", e.target.checked)} className="mt-1 h-4 w-4" required />
              <label htmlFor="rgpd" className="text-sm text-gray-700 cursor-pointer flex-1">
                <strong>J&apos;accepte</strong> la collecte et le traitement de mes donnees personnelles pour la realisation de la formation, conformement au RGPD. *
              </label>
            </div>
            <div className="flex items-start gap-3 p-3 border border-gray-200 rounded-md bg-gray-50">
              <input type="checkbox" id="bpf" checked={!!form.consentementBPF} onChange={(e) => set("consentementBPF", e.target.checked)} className="mt-1 h-4 w-4" />
              <label htmlFor="bpf" className="text-sm text-gray-700 cursor-pointer flex-1">
                J&apos;autorise l&apos;utilisation de mes donnees pour le Bilan Pedagogique et Financier (BPF Qualiopi).
              </label>
            </div>
          </Section>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-md p-3 text-sm">{error}</div>
          )}

          <button type="submit" disabled={saving} className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 rounded-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {saving ? "Envoi..." : "Transmettre"}
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
