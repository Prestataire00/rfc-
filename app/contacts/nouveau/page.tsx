"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UserCheck, UserPlus, Mail, Phone, Building2, User, Briefcase, FileText, Check } from "lucide-react";
import { notify } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { useApi, useApiMutation } from "@/hooks/useApi";
import { ApiError } from "@/lib/fetcher";

interface Entreprise {
  id: string;
  nom: string;
}

type ContactCreated = { id: string; prenom: string; nom: string };
type ContactType = "client" | "prospect";

const TYPE_CARDS: Array<{
  value: ContactType;
  label: string;
  description: string;
  icon: typeof UserCheck;
  accent: string;
}> = [
  {
    value: "client",
    label: "Client",
    description: "Personne avec qui une relation commerciale est déjà engagée (devis signé, formation suivie, ou facturation en cours).",
    icon: UserCheck,
    accent: "emerald",
  },
  {
    value: "prospect",
    label: "Prospect",
    description: "Personne en cours de qualification. Pas encore de contrat ni de formation. Sera converti en client une fois un devis signé.",
    icon: UserPlus,
    accent: "amber",
  },
];

// Tailwind ne peut pas générer dynamiquement bg-{color}-500 etc → on map manuellement.
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

export default function NouveauContactPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    type: "prospect" as ContactType,
    prenom: "",
    nom: "",
    email: "",
    telephone: "",
    entrepriseId: "",
    poste: "",
    notes: "",
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
      const payload: Record<string, unknown> = {
        type: form.type,
        prenom: form.prenom.trim(),
        nom: form.nom.trim(),
        email: form.email.trim(),
      };
      if (form.telephone.trim()) payload.telephone = form.telephone.trim();
      if (form.entrepriseId) payload.entrepriseId = form.entrepriseId;
      if (form.poste.trim()) payload.poste = form.poste.trim();
      if (form.notes.trim()) payload.notes = form.notes.trim();

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

  const accent = form.type === "client" ? ACCENT_CLASSES.emerald : ACCENT_CLASSES.amber;

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
        Commencez par choisir le type, puis renseignez les informations essentielles.
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
              const c = ACCENT_CLASSES[card.accent as keyof typeof ACCENT_CLASSES];
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
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${active ? c.iconBg : "bg-gray-700"}`}>
                      <Icon className={`h-5 w-5 ${active ? c.text : "text-gray-400"}`} />
                    </div>
                    <span className={`font-semibold ${active ? "text-gray-100" : "text-gray-300"}`}>
                      {card.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">{card.description}</p>
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

        {/* SECTION 3 — Rattachement pro */}
        <section>
          <h2 className="text-sm font-semibold text-gray-300 mb-2 uppercase tracking-wide flex items-center gap-2">
            <Briefcase className="h-4 w-4" /> Rattachement professionnel
          </h2>
          <div className="rounded-xl border border-gray-700 bg-gray-800 p-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="entrepriseId" className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-gray-500" />
                Entreprise
              </Label>
              <div className="flex gap-2">
                <Select
                  id="entrepriseId"
                  name="entrepriseId"
                  value={form.entrepriseId}
                  onChange={handleChange}
                  options={entrepriseOptions}
                  placeholder="Aucune entreprise"
                />
                <Link
                  href="/entreprises/nouveau"
                  className="shrink-0 inline-flex items-center gap-1 rounded-md border border-gray-600 px-3 py-2 text-xs font-medium text-gray-300 hover:bg-gray-700 transition-colors"
                  target="_blank"
                >
                  + Nouvelle
                </Link>
              </div>
              <p className="text-xs text-gray-500">
                Pas obligatoire — un {form.type} peut être indépendant ou personne physique.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="poste">Poste / fonction</Label>
              <Input
                id="poste"
                name="poste"
                value={form.poste}
                onChange={handleChange}
                placeholder={form.type === "client" ? "Responsable formation" : "Directeur, Manager…"}
              />
            </div>
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
