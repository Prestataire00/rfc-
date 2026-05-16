"use client";

import { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClipboardList, Sparkles } from "lucide-react";
import type { ProspectCreationData } from "@/lib/validations/prospect";

interface Props {
  form: UseFormReturn<ProspectCreationData>;
}

export function DemandeSection({ form }: Props) {
  const { register, formState: { errors } } = form;
  return (
    <section className="rounded-lg border border-gray-700 bg-gray-800 p-5">
      <div className="flex items-center gap-2 mb-4">
        <ClipboardList className="h-5 w-5 text-red-500" />
        <h2 className="text-lg font-semibold text-gray-100">3. Demande de formation</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label>Origine <span className="text-red-500">*</span></Label>
          <div className="mt-1 flex flex-wrap gap-3">
            {[
              { value: "client", label: "Client" },
              { value: "stagiaire", label: "Stagiaire" },
              { value: "centre", label: "Centre" },
              { value: "prospection", label: "Prospection" },
            ].map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" value={opt.value} {...register("demande.origine")} />
                <span className="text-sm text-gray-200">{opt.label}</span>
              </label>
            ))}
          </div>
          {errors.demande?.origine && <p className="text-xs text-red-500 mt-1">{errors.demande.origine.message}</p>}
        </div>
        <div>
          <Label htmlFor="source">Source contact</Label>
          <select id="source" {...register("demande.sourceContact")} className="mt-1 w-full h-10 rounded-md border border-gray-600 bg-gray-800 px-3 text-sm text-gray-200">
            <option value="">—</option>
            <option value="email">Email</option>
            <option value="telephone">Téléphone</option>
            <option value="site_web">Site web</option>
            <option value="salon">Salon</option>
            <option value="bouche_oreille">Bouche-à-oreille</option>
            <option value="autre">Autre</option>
          </select>
        </div>
        <div>
          <Label htmlFor="financement">Mode de financement envisagé</Label>
          <select id="financement" {...register("demande.modeFinancement")} className="mt-1 w-full h-10 rounded-md border border-gray-600 bg-gray-800 px-3 text-sm text-gray-200">
            <option value="">À définir</option>
            <option value="opco">OPCO</option>
            <option value="cpf">CPF</option>
            <option value="entreprise">Entreprise</option>
            <option value="personnel">Personnel</option>
            <option value="mixte">Mixte</option>
            <option value="a_definir">À définir</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="formation" className="flex items-center justify-between">
            <span>Formation souhaitée <span className="text-red-500">*</span></span>
            <button type="button" className="text-xs text-purple-400 hover:underline flex items-center gap-1" title="Analyse IA du besoin (à venir)" disabled>
              <Sparkles className="h-3 w-3" /> IA helper
            </button>
          </Label>
          <Input id="formation" {...register("demande.formationSouhaitee")} placeholder="Ex: SST initial 14h, Habilitation électrique B1V" className="mt-1" />
          {errors.demande?.formationSouhaitee && <p className="text-xs text-red-500 mt-1">{errors.demande.formationSouhaitee.message}</p>}
        </div>
        <div>
          <Label htmlFor="nb">Nombre de stagiaires</Label>
          <Input id="nb" type="number" min="1" {...register("demande.nbStagiaires")} placeholder="1" className="mt-1" />
        </div>
        <div>
          <Label htmlFor="budget">Budget envisagé (€ HT)</Label>
          <Input id="budget" type="number" min="0" {...register("demande.budgetEnvisage")} placeholder="3000" className="mt-1" />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="dates">Date(s) souhaitée(s)</Label>
          <Input id="dates" {...register("demande.datesSouhaitees")} placeholder="Ex: courant juin 2026, ou semaine du 15/06" className="mt-1" />
        </div>
      </div>
    </section>
  );
}
