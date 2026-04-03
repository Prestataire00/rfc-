"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Building2, User, GraduationCap } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";

type Option = { id: string; nom: string; titre?: string; prenom?: string; entrepriseId?: string | null };

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

export default function NouveauBesoinPage() {
  const router = useRouter();
  const [entreprises, setEntreprises] = useState<Option[]>([]);
  const [contacts, setContacts] = useState<Option[]>([]);
  const [formations, setFormations] = useState<Option[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    titre: "",
    description: "",
    origine: "client",
    priorite: "normale",
    nbStagiaires: "",
    datesSouhaitees: "",
    budget: "",
    notes: "",
    entrepriseId: "",
    contactId: "",
    formationId: "",
  });

  useEffect(() => {
    fetch("/api/entreprises").then((r) => r.ok ? r.json() : []).then((d) => setEntreprises(Array.isArray(d) ? d : d.entreprises || []));
    fetch("/api/contacts").then((r) => r.ok ? r.json() : []).then((d) => setContacts(Array.isArray(d) ? d : d.contacts || []));
    fetch("/api/formations").then((r) => r.ok ? r.json() : []).then((d) => setFormations(Array.isArray(d) ? d : d.formations || []));
  }, []);

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  // Contacts filtrés selon l'entreprise sélectionnée (pour origine client)
  const contactsFiltres = form.entrepriseId
    ? contacts.filter((c) => c.entrepriseId === form.entrepriseId)
    : contacts;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/besoins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const besoin = await res.json();
        router.push(`/besoins/${besoin.id}`);
      } else {
        const data = await res.json();
        setError(data.error?.message || data.error || "Erreur lors de la création");
      }
    } catch {
      setError("Erreur de connexion au serveur");
    }
    setSaving(false);
  }

  return (
    <div>
      <PageHeader title="Nouveau besoin de formation" description="Qualifiez une demande de formation" />

      {error && (
        <div className="max-w-2xl mb-4 rounded-md bg-red-900/20 border border-red-700 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">

        {/* Origine — sélection visuelle */}
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
                  onClick={() => {
                    set("origine", o.value);
                    set("entrepriseId", "");
                    set("contactId", "");
                  }}
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

        {/* Champs dynamiques selon l'origine */}
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-6 space-y-4">

          {/* Client → Entreprise + Contact */}
          {form.origine === "client" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Entreprise *</label>
                <select
                  value={form.entrepriseId}
                  onChange={(e) => { set("entrepriseId", e.target.value); set("contactId", ""); }}
                  className="w-full h-10 rounded-md border border-gray-600 bg-gray-700 text-gray-100 px-3 text-sm"
                >
                  <option value="">— Sélectionner une entreprise —</option>
                  {entreprises.map((e) => (
                    <option key={e.id} value={e.id}>{e.nom}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Contact référent</label>
                <select
                  value={form.contactId}
                  onChange={(e) => set("contactId", e.target.value)}
                  className="w-full h-10 rounded-md border border-gray-600 bg-gray-700 text-gray-100 px-3 text-sm"
                >
                  <option value="">— Sélectionner un contact —</option>
                  {contactsFiltres.map((c) => (
                    <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>
                  ))}
                </select>
                {form.entrepriseId && contactsFiltres.length === 0 && (
                  <p className="text-xs text-amber-400 mt-1">Aucun contact rattaché à cette entreprise.</p>
                )}
              </div>
            </>
          )}

          {/* Stagiaire → Contact individuel */}
          {form.origine === "stagiaire" && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Stagiaire / Individu *</label>
              <select
                value={form.contactId}
                onChange={(e) => set("contactId", e.target.value)}
                className="w-full h-10 rounded-md border border-gray-600 bg-gray-700 text-gray-100 px-3 text-sm"
              >
                <option value="">— Sélectionner un stagiaire —</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.prenom} {c.nom}{c.entrepriseId ? "" : " (individuel)"}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Centre → message informatif */}
          {form.origine === "centre" && (
            <div className="rounded-md bg-gray-700 px-4 py-3 text-sm text-gray-300">
              Cette demande est une initiative interne du centre. Elle ne sera pas liée à un client ou stagiaire spécifique.
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
              placeholder="Ex: Formation Sécurité Incendie pour 10 salariés"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className="w-full rounded-md border border-gray-600 bg-gray-700 text-gray-100 px-3 py-2 text-sm"
              rows={3}
              placeholder="Contexte, objectifs souhaités, contraintes..."
            />
          </div>

          {/* Formation souhaitée */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Formation souhaitée</label>
            <select
              value={form.formationId}
              onChange={(e) => set("formationId", e.target.value)}
              className="w-full h-10 rounded-md border border-gray-600 bg-gray-700 text-gray-100 px-3 text-sm"
            >
              <option value="">— Pas encore définie —</option>
              {formations.map((f) => (
                <option key={f.id} value={f.id}>{f.titre}</option>
              ))}
            </select>
          </div>

          {/* Priorité + Nb stagiaires + Budget + Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Priorité</label>
              <select
                value={form.priorite}
                onChange={(e) => set("priorite", e.target.value)}
                className="w-full h-10 rounded-md border border-gray-600 bg-gray-700 text-gray-100 px-3 text-sm"
              >
                <option value="basse">🔵 Basse</option>
                <option value="normale">🟡 Normale</option>
                <option value="haute">🟠 Haute</option>
                <option value="urgente">🔴 Urgente</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Nb stagiaires estimé</label>
              <input
                type="number"
                min={1}
                value={form.nbStagiaires}
                onChange={(e) => set("nbStagiaires", e.target.value)}
                className="w-full h-10 rounded-md border border-gray-600 bg-gray-700 text-gray-100 px-3 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Budget envisagé (€)</label>
              <input
                type="number"
                step="0.01"
                value={form.budget}
                onChange={(e) => set("budget", e.target.value)}
                className="w-full h-10 rounded-md border border-gray-600 bg-gray-700 text-gray-100 px-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Dates souhaitées</label>
              <input
                type="text"
                value={form.datesSouhaitees}
                onChange={(e) => set("datesSouhaitees", e.target.value)}
                className="w-full h-10 rounded-md border border-gray-600 bg-gray-700 text-gray-100 px-3 text-sm"
                placeholder="Ex: Avril 2026"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Notes internes</label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              className="w-full rounded-md border border-gray-600 bg-gray-700 text-gray-100 px-3 py-2 text-sm"
              rows={2}
              placeholder="Remarques, informations complémentaires..."
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-red-600 px-6 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {saving ? "Enregistrement..." : "Créer le besoin"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-md border border-gray-600 px-6 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700"
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}
