"use client";

import { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Mail, Phone } from "lucide-react";
import type { ProspectCreationData } from "@/lib/validations/prospect";

interface Props {
  form: UseFormReturn<ProspectCreationData>;
}

export function ContactSection({ form }: Props) {
  const { register, formState: { errors } } = form;
  return (
    <section className="rounded-lg border border-gray-700 bg-gray-800 p-5">
      <div className="flex items-center gap-2 mb-4">
        <User className="h-5 w-5 text-red-500" />
        <h2 className="text-lg font-semibold text-gray-100">1. Contact (décideur)</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="prenom">Prénom <span className="text-red-500">*</span></Label>
          <Input id="prenom" {...register("contact.prenom")} className="mt-1" />
          {errors.contact?.prenom && <p className="text-xs text-red-500 mt-1">{errors.contact.prenom.message}</p>}
        </div>
        <div>
          <Label htmlFor="nom">Nom <span className="text-red-500">*</span></Label>
          <Input id="nom" {...register("contact.nom")} className="mt-1" />
          {errors.contact?.nom && <p className="text-xs text-red-500 mt-1">{errors.contact.nom.message}</p>}
        </div>
        <div>
          <Label htmlFor="email" className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> Email <span className="text-red-500">*</span></Label>
          <Input id="email" type="email" {...register("contact.email")} className="mt-1" />
          {errors.contact?.email && <p className="text-xs text-red-500 mt-1">{errors.contact.email.message}</p>}
        </div>
        <div>
          <Label htmlFor="telephone" className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> Téléphone</Label>
          <Input id="telephone" type="tel" {...register("contact.telephone")} className="mt-1" />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="poste">Poste / fonction</Label>
          <Input id="poste" {...register("contact.poste")} placeholder="Ex: Responsable formation" className="mt-1" />
        </div>
      </div>
    </section>
  );
}
