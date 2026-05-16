"use client";

import { UseFormReturn } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { FileText } from "lucide-react";
import type { ProspectCreationData } from "@/lib/validations/prospect";

interface Props {
  form: UseFormReturn<ProspectCreationData>;
}

export function NotesSection({ form }: Props) {
  const { register } = form;
  return (
    <section className="rounded-lg border border-gray-700 bg-gray-800 p-5">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="h-5 w-5 text-red-500" />
        <h2 className="text-lg font-semibold text-gray-100">5. Notes commerciales (internes)</h2>
      </div>
      <textarea
        {...register("notesInternes")}
        rows={4}
        className="w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-200"
        placeholder="Notes pour l'équipe, contexte commercial, suivi…"
      />
    </section>
  );
}
