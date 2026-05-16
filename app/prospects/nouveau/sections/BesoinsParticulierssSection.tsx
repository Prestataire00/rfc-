"use client";

import { UseFormReturn } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Accessibility } from "lucide-react";
import type { ProspectCreationData } from "@/lib/validations/prospect";

interface Props {
  form: UseFormReturn<ProspectCreationData>;
}

export function BesoinsParticulierssSection({ form }: Props) {
  const { register } = form;
  return (
    <section className="rounded-lg border border-gray-700 bg-gray-800 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Accessibility className="h-5 w-5 text-red-500" />
        <h2 className="text-lg font-semibold text-gray-100">4. Besoins particuliers</h2>
      </div>
      <div className="space-y-4">
        <div>
          <Label htmlFor="handicap">Handicap / contraintes spécifiques</Label>
          <textarea
            id="handicap"
            {...register("besoinsParticuliers.handicapContraintes")}
            rows={3}
            className="mt-1 w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-200"
            placeholder="Ex: RQTH, mobilité réduite, contraintes alimentaires…"
          />
        </div>
        <div>
          <Label htmlFor="materiel">Matériel sur place</Label>
          <textarea
            id="materiel"
            {...register("besoinsParticuliers.materielSurPlace")}
            rows={3}
            className="mt-1 w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-200"
            placeholder="Ex: vidéoprojecteur fourni, mannequins RCP à apporter…"
          />
        </div>
      </div>
    </section>
  );
}
