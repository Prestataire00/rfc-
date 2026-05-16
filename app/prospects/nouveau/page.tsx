"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, UserPlus } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { prospectCreationSchema, type ProspectCreationData } from "@/lib/validations/prospect";
import { api } from "@/lib/fetcher";
import { notify } from "@/lib/toast";
import { ContactSection } from "./sections/ContactSection";
import { EntrepriseSection } from "./sections/EntrepriseSection";
import { DemandeSection } from "./sections/DemandeSection";
import { BesoinsParticulierssSection } from "./sections/BesoinsParticulierssSection";
import { NotesSection } from "./sections/NotesSection";

export default function NouveauProspectPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<ProspectCreationData>({
    resolver: zodResolver(prospectCreationSchema),
    defaultValues: {
      contact: { prenom: "", nom: "", email: "", telephone: "", poste: "" },
      entrepriseMode: "nouvelle",
      entrepriseNouvelle: { nom: "", siret: "", adresse: "", codePostal: "", ville: "", secteur: "", effectif: undefined },
      demande: { origine: "client", sourceContact: "", formationSouhaitee: "", nbStagiaires: undefined, datesSouhaitees: "", budgetEnvisage: undefined, modeFinancement: undefined },
      besoinsParticuliers: { handicapContraintes: "", materielSurPlace: "" },
      notesInternes: "",
    },
  });

  async function onSubmit(data: ProspectCreationData) {
    setSubmitting(true);
    try {
      const res = await api.post<{ demandeId: string; contactId: string; entrepriseId: string; redirectUrl: string }>(
        "/api/prospects",
        data,
      );
      notify.success(`Prospect créé : ${data.contact.prenom} ${data.contact.nom}`);
      router.push(res.redirectUrl);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur lors de la création du prospect";
      notify.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-2">
        <Link href="/contacts?type=client" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200">
          <ArrowLeft className="h-4 w-4" /> CRM
        </Link>
      </div>
      <PageHeader
        title="Nouveau prospect"
        description="Capturez en une fois le contact, l'entreprise et le besoin de formation. Le prospect démarre en statut « nouveau »."
      />

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <ContactSection form={form} />
            <EntrepriseSection form={form} />
          </div>
          <div className="space-y-6">
            <DemandeSection form={form} />
            <BesoinsParticulierssSection form={form} />
            <NotesSection form={form} />
          </div>
        </div>

        <div className="sticky bottom-0 -mx-6 px-6 py-4 bg-gray-900/95 backdrop-blur border-t border-gray-700 flex justify-end gap-3">
          <Link href="/contacts?type=client" className="inline-flex items-center px-4 py-2 rounded-md border border-gray-600 text-sm text-gray-300 hover:bg-gray-800">
            Annuler
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-md bg-red-600 hover:bg-red-700 disabled:opacity-50 px-6 py-2 text-sm font-medium text-white"
          >
            <UserPlus className="h-4 w-4" />
            {submitting ? "Création…" : "Créer le prospect"}
          </button>
        </div>
      </form>
    </div>
  );
}
