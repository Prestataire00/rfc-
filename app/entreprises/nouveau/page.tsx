"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Search, Loader2, Building2, X } from "lucide-react";
import { notify } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApiMutation, ApiError } from "@/hooks/useApi";
import { api } from "@/lib/fetcher";

type PappersResult = {
  nom: string;
  siret: string;
  siren: string;
  adresse?: string;
  codePostal?: string;
  ville?: string;
  secteur?: string;
  formeJuridique?: string;
};

type EntrepriseCreated = { id: string; nom: string };

export default function NouvelleEntreprisePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { trigger: createEntreprise, isMutating: saving } = useApiMutation<Record<string, unknown>, EntrepriseCreated>(
    "/api/entreprises",
    "POST"
  );

  // Pappers search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<PappersResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selected, setSelected] = useState<PappersResult | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [form, setForm] = useState({
    nom: "",
    secteur: "",
    adresse: "",
    ville: "",
    codePostal: "",
    siret: "",
    email: "",
    telephone: "",
    site: "",
    notes: "",
  });

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced Pappers search
  useEffect(() => {
    if (selected) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchQuery.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await api.get<PappersResult[]>(`/api/pappers/search?q=${encodeURIComponent(searchQuery)}`);
        if (Array.isArray(data)) {
          setSuggestions(data);
          setShowDropdown(data.length > 0);
        }
      } catch {
        // silent
      } finally {
        setSearching(false);
      }
    }, 400);
  }, [searchQuery, selected]);

  function handleSelectSuggestion(r: PappersResult) {
    setSelected(r);
    setSearchQuery(r.nom);
    setShowDropdown(false);
    setSuggestions([]);
    setForm((prev) => ({
      ...prev,
      nom: r.nom,
      siret: r.siret || prev.siret,
      adresse: r.adresse || prev.adresse,
      codePostal: r.codePostal || prev.codePostal,
      ville: r.ville || prev.ville,
      secteur: r.secteur || prev.secteur || prev.secteur,
    }));
  }

  function handleClearSearch() {
    setSelected(null);
    setSearchQuery("");
    setSuggestions([]);
    setShowDropdown(false);
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const payload: Record<string, unknown> = { ...form };
      Object.keys(payload).forEach((key) => {
        if (key !== "nom" && !payload[key]) delete payload[key];
      });

      const entreprise = await createEntreprise(payload);
      notify.success("Entreprise creee", entreprise.nom);
      router.push(`/entreprises/${entreprise.id}`);
    } catch (err: unknown) {
      let msg = "Erreur lors de la création";
      if (err instanceof ApiError) {
        const body = err.body as { error?: unknown } | null;
        const errBody = body?.error;
        if (errBody && typeof errBody === "object" && "fieldErrors" in errBody) {
          const fe = (errBody as { fieldErrors: Record<string, string[]> }).fieldErrors;
          msg = Object.values(fe).flat().join(", ") || "Erreur de validation";
        } else if (typeof errBody === "string") {
          msg = errBody;
        } else if (errBody && typeof errBody === "object" && "message" in errBody) {
          msg = String((errBody as { message: unknown }).message) || err.message;
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

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href="/entreprises"
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-300 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux entreprises
        </Link>
        <h1 className="text-2xl font-bold text-gray-100">Nouvelle entreprise</h1>
        <p className="text-sm text-gray-400 mt-1">Ajoutez une nouvelle entreprise à votre CRM</p>
      </div>

      {/* Pappers Search */}
      <Card className="mb-6 border-blue-800/40 bg-blue-950/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-blue-300">
            <Search className="h-4 w-4" />
            Recherche automatique (Pappers)
          </CardTitle>
          <p className="text-xs text-gray-400">Recherchez une entreprise par nom ou SIRET pour remplir le formulaire automatiquement.</p>
        </CardHeader>
        <CardContent>
          <div className="relative" ref={searchRef}>
            <div className="relative">
              {searching ? (
                <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
              ) : (
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              )}
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSelected(null);
                  setSearchQuery(e.target.value);
                }}
                placeholder="Nom de l'entreprise ou SIRET..."
                className="w-full pl-9 pr-9 py-2 rounded-md border border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-500 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {showDropdown && suggestions.length > 0 && (
              <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-700 bg-gray-900 shadow-lg overflow-hidden">
                {suggestions.map((r, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelectSuggestion(r)}
                    className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-800 transition-colors border-b border-gray-800 last:border-0"
                  >
                    <Building2 className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-100 truncate">{r.nom}</div>
                      <div className="text-xs text-gray-400 mt-0.5 flex flex-wrap gap-2">
                        {r.siret && <span>SIRET : {r.siret}</span>}
                        {r.ville && <span>{r.codePostal} {r.ville}</span>}
                        {r.formeJuridique && <span className="text-gray-500">{r.formeJuridique}</span>}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selected && (
            <div className="mt-3 flex items-center gap-2 text-sm text-green-400">
              <span className="inline-block w-2 h-2 rounded-full bg-green-400" />
              Données importées depuis Pappers — vérifiez et complétez si nécessaire.
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="mb-4 rounded-md bg-red-900/20 border border-red-700 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">Informations générales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nom">Raison sociale <span className="text-red-500">*</span></Label>
              <Input
                id="nom"
                name="nom"
                value={form.nom}
                onChange={handleChange}
                placeholder="Acme Corp"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="secteur">Secteur d&apos;activité</Label>
              <Input
                id="secteur"
                name="secteur"
                value={form.secteur}
                onChange={handleChange}
                placeholder="Informatique, BTP, Santé..."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="siret">SIRET</Label>
              <Input
                id="siret"
                name="siret"
                value={form.siret}
                onChange={handleChange}
                placeholder="12345678901234"
                maxLength={14}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">Adresse</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="adresse">Adresse</Label>
              <Input
                id="adresse"
                name="adresse"
                value={form.adresse}
                onChange={handleChange}
                placeholder="1 rue de la Paix"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="codePostal">Code postal</Label>
                <Input
                  id="codePostal"
                  name="codePostal"
                  value={form.codePostal}
                  onChange={handleChange}
                  placeholder="75001"
                  maxLength={10}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ville">Ville</Label>
                <Input
                  id="ville"
                  name="ville"
                  value={form.ville}
                  onChange={handleChange}
                  placeholder="Paris"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">Coordonnées</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="contact@acme.fr"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="telephone">Téléphone</Label>
              <Input
                id="telephone"
                name="telephone"
                type="tel"
                value={form.telephone}
                onChange={handleChange}
                placeholder="01 23 45 67 89"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="site">Site web</Label>
              <Input
                id="site"
                name="site"
                type="url"
                value={form.site}
                onChange={handleChange}
                placeholder="https://www.acme.fr"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes internes</Label>
              <Textarea
                id="notes"
                name="notes"
                value={form.notes}
                onChange={handleChange}
                placeholder="Informations complémentaires..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link
            href="/entreprises"
            className="inline-flex items-center rounded-md border border-gray-600 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors"
          >
            Annuler
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? "Création..." : "Créer l'entreprise"}
          </Button>
        </div>
      </form>
    </div>
  );
}
