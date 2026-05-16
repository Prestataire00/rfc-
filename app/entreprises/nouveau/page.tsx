"use client";

// Création d'une entreprise standalone (sans contact/demande associés).
// Pour créer un prospect complet (contact + entreprise + demande), utiliser /prospects/nouveau.
// Inclut la recherche API gouv (recherche-entreprises.api.gouv.fr) pour auto-fill.

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, Search, ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/fetcher";
import { notify } from "@/lib/toast";

type GouvResult = {
  siren: string;
  nom_raison_sociale?: string;
  siege?: {
    siret?: string;
    adresse?: string;
    code_postal?: string;
    libelle_commune?: string;
    activite_principale?: string;
  };
};

export default function NouvelleEntreprisePage() {
  const router = useRouter();
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<GouvResult[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    nom: "",
    siret: "",
    secteur: "",
    adresse: "",
    codePostal: "",
    ville: "",
    email: "",
    telephone: "",
    site: "",
    notes: "",
  });

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(debouncedQuery)}&page=1&per_page=10`)
      .then((r) => (r.ok ? r.json() : { results: [] }))
      .then((data) => {
        if (!cancelled) setResults(data.results || []);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  function pickResult(r: GouvResult) {
    setForm({
      ...form,
      nom: r.nom_raison_sociale || "",
      siret: r.siege?.siret || "",
      adresse: r.siege?.adresse || "",
      codePostal: r.siege?.code_postal || "",
      ville: r.siege?.libelle_commune || "",
      secteur: r.siege?.activite_principale || "",
    });
    setSearchQuery("");
    setResults([]);
    notify.success(`${r.nom_raison_sociale} auto-rempli depuis API gouv`);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nom.trim()) {
      notify.error("La raison sociale est obligatoire");
      return;
    }
    setSubmitting(true);
    try {
      const created = await api.post<{ id: string; nom: string }>("/api/entreprises", form);
      notify.success(`Entreprise « ${created.nom} » créée`);
      router.push(`/entreprises/${created.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Impossible de créer l'entreprise";
      notify.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-2">
        <Link href="/entreprises" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200">
          <ArrowLeft className="h-4 w-4" /> Entreprises
        </Link>
      </div>
      <PageHeader
        title="Nouvelle entreprise"
        description="Création d'une entreprise standalone. Pour créer un prospect complet (contact + entreprise + demande), utilisez Nouvelle demande."
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Recherche API gouv */}
        <section className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Search className="h-5 w-5 text-red-600" />
            <h2 className="text-base font-semibold text-red-600 dark:text-red-500">Rechercher (API Recherche d&apos;Entreprises)</h2>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Tapez le nom ou le SIRET — les champs ci-dessous s&apos;auto-remplissent au clic. Source : api.gouv.fr (gratuit, public).
          </p>
          <Input
            type="search"
            placeholder="Nom d'entreprise ou SIRET…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
          {searching && <p className="text-xs text-gray-500 mt-2">Recherche…</p>}
          {results.length > 0 && (
            <ul className="mt-2 max-h-64 overflow-y-auto rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {results.map((r) => (
                <li
                  key={r.siren}
                  onClick={() => pickResult(r)}
                  className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm"
                >
                  <div className="font-medium text-gray-900 dark:text-gray-100">{r.nom_raison_sociale ?? "—"}</div>
                  <div className="text-xs text-gray-500">
                    SIRET {r.siege?.siret ?? "—"} · {r.siege?.libelle_commune ?? "—"}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Formulaire manuel */}
        <section className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="h-5 w-5 text-red-600" />
            <h2 className="text-base font-semibold text-red-600 dark:text-red-500">Informations entreprise</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="nom">Raison sociale <span className="text-red-500">*</span></Label>
              <Input id="nom" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} className="mt-1" required />
            </div>
            <div>
              <Label htmlFor="siret">SIRET</Label>
              <Input id="siret" value={form.siret} onChange={(e) => setForm({ ...form, siret: e.target.value })} placeholder="14 chiffres" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="secteur">Secteur d&apos;activité</Label>
              <Input id="secteur" value={form.secteur} onChange={(e) => setForm({ ...form, secteur: e.target.value })} className="mt-1" />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="adresse">Adresse</Label>
              <Input id="adresse" value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="codePostal">Code postal</Label>
              <Input id="codePostal" value={form.codePostal} onChange={(e) => setForm({ ...form, codePostal: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="ville">Ville</Label>
              <Input id="ville" value={form.ville} onChange={(e) => setForm({ ...form, ville: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="telephone">Téléphone</Label>
              <Input id="telephone" type="tel" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} className="mt-1" />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="site">Site web</Label>
              <Input id="site" type="url" value={form.site} onChange={(e) => setForm({ ...form, site: e.target.value })} placeholder="https://…" className="mt-1" />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="notes">Notes internes</Label>
              <textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </section>

        <div className="flex items-center justify-end gap-3">
          <Link href="/entreprises" className="inline-flex items-center px-4 py-2 rounded-md border border-gray-600 text-sm text-gray-300 hover:bg-gray-800">
            Annuler
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-md bg-red-600 hover:bg-red-700 disabled:opacity-50 px-6 py-2 text-sm font-medium text-white"
          >
            {submitting ? "Création…" : "Créer l'entreprise"}
          </button>
        </div>
      </form>
    </div>
  );
}
