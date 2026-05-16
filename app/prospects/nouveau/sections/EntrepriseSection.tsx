"use client";

import { useState, useEffect } from "react";
import { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Search } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import type { ProspectCreationData } from "@/lib/validations/prospect";

interface Props {
  form: UseFormReturn<ProspectCreationData>;
}

type EntrepriseSearchResult = {
  id: string;
  nom: string;
  siret: string | null;
  ville: string | null;
};

export function EntrepriseSection({ form }: Props) {
  const { register, watch, setValue, formState: { errors } } = form;
  const mode = watch("entrepriseMode");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 250);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const { data: searchResults } = useApi<{ data?: EntrepriseSearchResult[] } | EntrepriseSearchResult[]>(
    mode === "existante" && debouncedSearch.length >= 2
      ? `/api/entreprises?search=${encodeURIComponent(debouncedSearch)}&limit=10`
      : null,
  );
  const results: EntrepriseSearchResult[] = Array.isArray(searchResults)
    ? searchResults
    : searchResults?.data ?? [];

  return (
    <section className="rounded-lg border border-gray-700 bg-gray-800 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Building2 className="h-5 w-5 text-red-500" />
        <h2 className="text-lg font-semibold text-gray-100">2. Entreprise</h2>
      </div>
      <div className="flex gap-4 mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="radio" value="nouvelle" {...register("entrepriseMode")} />
          <span className="text-sm text-gray-200">Nouvelle entreprise</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="radio" value="existante" {...register("entrepriseMode")} />
          <span className="text-sm text-gray-200">Entreprise existante</span>
        </label>
      </div>
      {errors.entrepriseMode && <p className="text-xs text-red-500 mb-2">{errors.entrepriseMode.message}</p>}

      {mode === "existante" && (
        <div>
          <Label htmlFor="entreprise-search" className="flex items-center gap-1.5"><Search className="h-3 w-3" /> Rechercher une entreprise</Label>
          <Input
            id="entreprise-search"
            placeholder="Nom, SIRET, ville…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mt-1"
          />
          {results.length > 0 && (
            <ul className="mt-2 max-h-48 overflow-y-auto rounded-md border border-gray-600 bg-gray-900">
              {results.map((e) => (
                <li
                  key={e.id}
                  onClick={() => {
                    setValue("entrepriseId", e.id);
                    setSearchTerm(`${e.nom}${e.ville ? ` — ${e.ville}` : ""}`);
                  }}
                  className="px-3 py-2 hover:bg-gray-700 cursor-pointer text-sm text-gray-200 border-b border-gray-700 last:border-b-0"
                >
                  <strong>{e.nom}</strong>
                  {e.siret && <span className="text-xs text-gray-500 ml-2">SIRET {e.siret}</span>}
                  {e.ville && <span className="text-xs text-gray-500 ml-2">— {e.ville}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {mode === "nouvelle" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="ent-nom">Raison sociale <span className="text-red-500">*</span></Label>
            <Input id="ent-nom" {...register("entrepriseNouvelle.nom")} className="mt-1" />
            {errors.entrepriseNouvelle?.nom && <p className="text-xs text-red-500 mt-1">{errors.entrepriseNouvelle.nom.message}</p>}
          </div>
          <div>
            <Label htmlFor="ent-siret">SIRET</Label>
            <Input id="ent-siret" {...register("entrepriseNouvelle.siret")} placeholder="14 chiffres" className="mt-1" />
            {errors.entrepriseNouvelle?.siret && <p className="text-xs text-red-500 mt-1">{errors.entrepriseNouvelle.siret.message}</p>}
          </div>
          <div>
            <Label htmlFor="ent-secteur">Secteur d&apos;activité</Label>
            <select id="ent-secteur" {...register("entrepriseNouvelle.secteur")} className="mt-1 w-full h-10 rounded-md border border-gray-600 bg-gray-800 px-3 text-sm text-gray-200">
              <option value="">—</option>
              <option value="industrie">Industrie</option>
              <option value="btp">BTP</option>
              <option value="tertiaire">Tertiaire</option>
              <option value="public">Public</option>
              <option value="autre">Autre</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="ent-adresse">Adresse</Label>
            <Input id="ent-adresse" {...register("entrepriseNouvelle.adresse")} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="ent-cp">Code postal</Label>
            <Input id="ent-cp" {...register("entrepriseNouvelle.codePostal")} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="ent-ville">Ville</Label>
            <Input id="ent-ville" {...register("entrepriseNouvelle.ville")} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="ent-effectif">Effectif</Label>
            <Input id="ent-effectif" type="number" min="0" {...register("entrepriseNouvelle.effectif")} className="mt-1" />
          </div>
        </div>
      )}
    </section>
  );
}
