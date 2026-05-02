"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, User, GraduationCap, X, Lock } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { AIButton } from "@/components/shared/AIButton";
import { notify } from "@/lib/toast";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useApi, useApiMutation, ApiError } from "@/hooks/useApi";

type Option = {
  id: string;
  nom: string;
  titre?: string;
  prenom?: string;
  entrepriseId?: string | null;
  type?: string;
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

type LockedContact = {
  id: string;
  prenom?: string;
  nom?: string;
  type?: string;
  entrepriseId?: string | null;
  entreprise?: { nom?: string } | null;
};

type BesoinCreated = { id: string; titre: string };

export default function NouveauBesoinPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramContactId = searchParams.get("contactId") ?? "";
  const paramEntrepriseId = searchParams.get("entrepriseId") ?? "";

  const [error, setError] = useState("");

  // Contact verrouille (venu de l'URL) — ne peut pas etre perdu par accident
  const [lockedContactId, setLockedContactId] = useState<string>(paramContactId);
  const [lockedContact, setLockedContact] = useState<LockedContact | null>(null);

  const [form, setForm] = useState({
    titre: "",
    description: "",
    origine: "client",
    priorite: "normale",
    nbStagiaires: "",
    datesSouhaitees: "",
    budget: "",
    notes: "",
    entrepriseId: paramEntrepriseId,
    contactId: paramContactId,
    formationId: "",
  });

  const { hasDraft, clearDraft } = useAutoSave("besoin_draft", form, (f) => setForm(f));

  const { data: entreprisesRaw } = useApi<Option[] | { entreprises: Option[] }>("/api/entreprises");
  const { data: contactsRaw } = useApi<Option[] | { contacts: Option[] }>("/api/contacts");
  const { data: formationsRaw } = useApi<Option[] | { formations: Option[] }>("/api/formations");
  const { data: contactDetail } = useApi<LockedContact>(
    paramContactId ? `/api/contacts/${paramContactId}` : null
  );
  const { trigger: createBesoin, isMutating: saving } = useApiMutation<typeof form, BesoinCreated>(
    "/api/besoins",
    "POST"
  );

  const entreprises: Option[] = Array.isArray(entreprisesRaw) ? entreprisesRaw : entreprisesRaw?.entreprises ?? [];
  const contacts: Option[] = Array.isArray(contactsRaw) ? contactsRaw : contactsRaw?.contacts ?? [];
  const formations: Option[] = Array.isArray(formationsRaw) ? formationsRaw : formationsRaw?.formations ?? [];

  // Charger le contact verrouille et pre-remplir l'origine + entreprise
  useEffect(() => {
    if (!contactDetail) return;
    setLockedContact(contactDetail);
    const newOrigine = contactDetail.type === "stagiaire" ? "stagiaire" : "client";
    setForm((f) => ({
      ...f,
      origine: newOrigine,
      entrepriseId: f.entrepriseId || contactDetail.entrepriseId || "",
      contactId: paramContactId,
    }));
  }, [contactDetail, paramContactId]);

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  // Filtrage contacts : le contact verrouille reste TOUJOURS visible
  const contactsVisibles = useMemo(() => {
    if (!form.entrepriseId && !lockedContactId) return contacts;
    return contacts.filter((c) => {
      if (c.id === lockedContactId) return true;
      if (form.entrepriseId) return c.entrepriseId === form.entrepriseId;
      return true;
    });
  }, [contacts, form.entrepriseId, lockedContactId]);

  // Changer d'entreprise ne perd PAS le contactId verrouille
  function handleEntrepriseChange(newEntrepriseId: string) {
    setForm((f) => ({
      ...f,
      entrepriseId: newEntrepriseId,
      contactId: lockedContactId || f.contactId,
    }));
  }

  // Deverrouiller manuellement
  function unlockContact() {
    if (!confirm("Le besoin ne sera plus associe a ce contact. Continuer ?")) return;
    setLockedContactId("");
    setLockedContact(null);
    setForm((f) => ({ ...f, contactId: "" }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const payload = {
      ...form,
      contactId: lockedContactId || form.contactId,
    };

    try {
      const besoin = await createBesoin(payload);
      clearDraft();
      notify.success("Besoin cree", besoin.titre);
      router.push(`/besoins/${besoin.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as { error?: unknown } | null;
        const errBody = body?.error;
        let msg = err.message || "Erreur lors de la creation";
        if (typeof errBody === "string") {
          msg = errBody;
        } else if (errBody && typeof errBody === "object" && "message" in errBody) {
          msg = String((errBody as { message: unknown }).message) || msg;
        }
        setError(msg);
        notify.error("Erreur", msg);
      } else {
        setError("Erreur de connexion au serveur");
        notify.error("Erreur", "Connexion au serveur impossible");
      }
    }
  }

  return (
    <div>
      <PageHeader title="Nouveau besoin de formation" description="Qualifiez une demande de formation" />

      {error && (
        <div className="max-w-2xl mb-4 rounded-md bg-red-900/20 border border-red-700 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Bandeau : brouillon restaure */}
      {hasDraft && (
        <div className="max-w-2xl mb-4 rounded-md bg-blue-950/30 border border-blue-700/50 px-4 py-2 flex items-center justify-between">
          <p className="text-sm text-blue-300">Un brouillon a ete restaure depuis votre derniere visite</p>
          <button onClick={() => { clearDraft(); setForm({ titre: "", description: "", origine: "client", priorite: "normale", nbStagiaires: "", datesSouhaitees: "", budget: "", notes: "", entrepriseId: paramEntrepriseId, contactId: paramContactId, formationId: "" }); }} className="text-xs text-blue-400 hover:underline">Repartir de zero</button>
        </div>
      )}

      {/* Bandeau : contact verrouille */}
      {lockedContact && (
        <div className="max-w-2xl mb-4 rounded-md bg-red-950/30 border border-red-700/50 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Lock className="h-4 w-4 text-red-400" />
            <div>
              <p className="text-sm text-gray-200">
                Besoin associe a : <span className="font-semibold text-red-400">{lockedContact.prenom} {lockedContact.nom}</span>
                {lockedContact.type && <span className="ml-2 text-xs text-gray-400">({lockedContact.type})</span>}
              </p>
              {lockedContact.entreprise?.nom && (
                <p className="text-xs text-gray-400 mt-0.5">Entreprise : {lockedContact.entreprise.nom}</p>
              )}
            </div>
          </div>
          <button type="button" onClick={unlockContact} className="text-xs text-gray-400 hover:text-red-400 flex items-center gap-1">
            <X className="h-3 w-3" /> Changer
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        {/* Origine */}
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-6 space-y-3">
          <label className="block text-sm font-semibold text-gray-200">Origine de la demande *</label>
          <div className="grid grid-cols-3 gap-3">
            {ORIGINES.map((o) => {
              const Icon = o.icon;
              const selected = form.origine === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => set("origine", o.value)}
                  className={`rounded-lg border-2 p-4 text-left transition-all ${
                    selected ? o.color : "border-gray-700 bg-gray-700/30 hover:border-gray-500"
                  }`}
                >
                  <Icon className={`h-5 w-5 mb-2 ${selected ? "text-gray-100" : "text-gray-400"}`} />
                  <p className={`text-sm font-semibold ${selected ? "text-gray-100" : "text-gray-300"}`}>{o.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{o.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Champs dynamiques */}
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-6 space-y-4">
          {/* Client */}
          {form.origine === "client" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Entreprise {!lockedContactId && "*"}
                </label>
                <select
                  value={form.entrepriseId}
                  onChange={(e) => handleEntrepriseChange(e.target.value)}
                  className="w-full h-10 rounded-md border border-gray-600 bg-gray-700 text-gray-100 px-3 text-sm"
                >
                  <option value="">-- Selectionner une entreprise --</option>
                  {entreprises.map((e) => (
                    <option key={e.id} value={e.id}>{e.nom}</option>
                  ))}
                </select>
                {lockedContactId && !form.entrepriseId && (
                  <p className="text-xs text-gray-400 mt-1">
                    Ce prospect n&apos;a pas d&apos;entreprise rattachee. Tu peux en selectionner une ou laisser vide.
                  </p>
                )}
              </div>
              {/* Contact referent : masque si verrouille */}
              {!lockedContactId && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Contact referent</label>
                  <select
                    value={form.contactId}
                    onChange={(e) => set("contactId", e.target.value)}
                    className="w-full h-10 rounded-md border border-gray-600 bg-gray-700 text-gray-100 px-3 text-sm"
                  >
                    <option value="">-- Selectionner un contact --</option>
                    {contactsVisibles.map((c) => (
                      <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>
                    ))}
                  </select>
                  {form.entrepriseId && contactsVisibles.length === 0 && (
                    <p className="text-xs text-amber-400 mt-1">Aucun contact rattache a cette entreprise.</p>
                  )}
                </div>
              )}
            </>
          )}

          {/* Stagiaire */}
          {form.origine === "stagiaire" && !lockedContactId && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Stagiaire / Individu *</label>
              <select
                value={form.contactId}
                onChange={(e) => set("contactId", e.target.value)}
                className="w-full h-10 rounded-md border border-gray-600 bg-gray-700 text-gray-100 px-3 text-sm"
              >
                <option value="">-- Selectionner un stagiaire --</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.prenom} {c.nom}{c.entrepriseId ? "" : " (individuel)"}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Centre */}
          {form.origine === "centre" && (
            <div className="rounded-md bg-gray-700 px-4 py-3 text-sm text-gray-300">
              Cette demande est une initiative interne du centre. Elle ne sera pas liee a un client ou stagiaire specifique.
            </div>
          )}

          {/* Titre */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Titre de la demande *</label>
            <input
              type="text"
              required
              value={form.titre}
              onChange={(e) => set("titre", e.target.value)}
              className="w-full h-10 rounded-md border border-gray-600 bg-gray-700 text-gray-100 px-3 text-sm"
              placeholder="Ex: Formation Securite Incendie pour 10 salaries"
            />
          </div>

          {/* Description */}
          <div className="rounded-lg border border-red-700/30 bg-red-900/5 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-semibold text-gray-100">Descriptif de la demande *</label>
                <p className="text-xs text-gray-400 mt-0.5">Contexte, objectifs, contraintes, delais, public cible...</p>
              </div>
              <AIButton
                endpoint="/api/ai/besoin"
                payload={{ action: "brief", titre: form.titre, description: form.description, origine: form.origine, nbStagiaires: form.nbStagiaires, contactId: lockedContactId || form.contactId, entrepriseId: form.entrepriseId }}
                onResult={(t) => set("description", t)}
                label="Generer un brief IA"
              />
            </div>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className="w-full rounded-md border border-gray-600 bg-gray-900 text-gray-100 px-3 py-2.5 text-sm resize-y min-h-[140px]"
              rows={6}
              placeholder="Contexte, objectifs, contraintes, delais..."
            />
            <p className="text-xs text-gray-500 text-right">{form.description.length} caracteres</p>
          </div>

          {/* Formation souhaitee */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Formation souhaitee</label>
            <select
              value={form.formationId}
              onChange={(e) => set("formationId", e.target.value)}
              className="w-full h-10 rounded-md border border-gray-600 bg-gray-700 text-gray-100 px-3 text-sm"
            >
              <option value="">-- Pas encore definie --</option>
              {formations.map((f) => (
                <option key={f.id} value={f.id}>{f.titre}</option>
              ))}
            </select>
          </div>

          {/* Priorite + Nb stagiaires + Budget + Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Priorite</label>
              <select
                value={form.priorite}
                onChange={(e) => set("priorite", e.target.value)}
                className="w-full h-10 rounded-md border border-gray-600 bg-gray-700 text-gray-100 px-3 text-sm"
              >
                <option value="basse">Basse</option>
                <option value="normale">Normale</option>
                <option value="haute">Haute</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Nb stagiaires</label>
              <input type="number" value={form.nbStagiaires} onChange={(e) => set("nbStagiaires", e.target.value)} className="w-full h-10 rounded-md border border-gray-600 bg-gray-700 text-gray-100 px-3 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Budget indicatif (EUR)</label>
              <input type="number" value={form.budget} onChange={(e) => set("budget", e.target.value)} className="w-full h-10 rounded-md border border-gray-600 bg-gray-700 text-gray-100 px-3 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Dates souhaitees</label>
              <input type="text" value={form.datesSouhaitees} onChange={(e) => set("datesSouhaitees", e.target.value)} className="w-full h-10 rounded-md border border-gray-600 bg-gray-700 text-gray-100 px-3 text-sm" placeholder="Ex: semaine du 15 mai" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Notes internes</label>
            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} className="w-full rounded-md border border-gray-600 bg-gray-700 text-gray-100 px-3 py-2 text-sm" rows={3} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={() => router.back()} className="px-4 py-2 rounded-md border border-gray-600 bg-gray-800 text-sm text-gray-300 hover:bg-gray-700">Annuler</button>
          <button type="submit" disabled={saving} className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-sm text-white font-medium disabled:opacity-50">
            {saving ? "Creation..." : "Creer le besoin"}
          </button>
        </div>
      </form>
    </div>
  );
}
