"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Shield, Mail, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { notify } from "@/lib/toast";

const CONTACT_DPO = "dpo@rescueformation83.fr";

const TYPES = [
  { value: "acces", label: "Droit d'acces" },
  { value: "rectification", label: "Droit de rectification" },
  { value: "effacement", label: "Droit a l'effacement" },
  { value: "portabilite", label: "Droit a la portabilite" },
  { value: "opposition", label: "Droit d'opposition" },
];

export default function RgpdDemandePage() {
  const [form, setForm] = useState({
    type: "acces",
    demandeurEmail: "",
    demandeurNom: "",
    description: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.demandeurEmail.trim() || !form.type) {
      notify.error("Email et type sont requis");
      return;
    }
    setSubmitting(true);
    // NOTE Phase 3b : la POST publique anonyme n'est pas encore activee
    // (l'endpoint /api/rgpd/demandes est protege par auth admin via le middleware).
    // En attendant Phase 4, on redirige vers le DPO par email.
    notify.info(
      "Fonctionnalite en preparation",
      "Cette fonction sera ouverte au public en Phase 4."
    );
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logorescue.png" alt="RFC" width={36} height={36} className="rounded" />
            <span className="font-bold text-sm">Rescue Formation Conseil</span>
          </Link>
          <Link href="/" className="text-xs text-red-600 hover:underline">
            Retour
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-6 w-6 text-red-600" />
          <h1 className="text-3xl font-bold">Demande RGPD</h1>
        </div>
        <p className="text-sm text-gray-500 mb-8">
          Exercez vos droits sur vos donnees personnelles : acces, rectification,
          effacement, portabilite ou opposition.
        </p>

        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 flex items-start gap-3 mb-6">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <p className="font-semibold mb-1">Cette fonction sera ouverte au public en Phase 4.</p>
            <p>
              En attendant, ecrivez directement a{" "}
              <a
                href={`mailto:${CONTACT_DPO}`}
                className="text-red-600 hover:underline font-medium"
              >
                {CONTACT_DPO}
              </a>{" "}
              en precisant votre demande, votre nom complet et un justificatif
              d&apos;identite.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-gray-200 bg-white p-6 space-y-5 shadow-sm"
        >
          <div className="space-y-1.5">
            <Label>Type de demande <span className="text-red-600">*</span></Label>
            <Select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              options={TYPES}
              className="border-gray-300"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nom complet</Label>
              <Input
                value={form.demandeurNom}
                onChange={(e) => setForm({ ...form, demandeurNom: e.target.value })}
                placeholder="Jean Dupont"
                className="border-gray-300"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email <span className="text-red-600">*</span></Label>
              <Input
                type="email"
                required
                value={form.demandeurEmail}
                onChange={(e) =>
                  setForm({ ...form, demandeurEmail: e.target.value })
                }
                placeholder="vous@exemple.fr"
                className="border-gray-300"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              rows={5}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Decrivez precisement votre demande (donnees concernees, periode, motif...)"
              className="border-gray-300"
            />
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Vos donnees sont traitees conformement a notre{" "}
              <Link
                href="/legal/politique-confidentialite"
                className="text-red-600 hover:underline"
              >
                politique de confidentialite
              </Link>
              .
            </p>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Mail className="h-4 w-4" /> Envoyer la demande
            </Button>
          </div>
        </form>

        <p className="text-xs text-gray-500 mt-6 text-center">
          Reponse garantie sous 1 mois conformement a l&apos;article 12 du RGPD.
        </p>
      </main>

      <footer className="border-t border-gray-200 bg-white mt-10">
        <div className="max-w-3xl mx-auto px-6 py-6 text-center text-xs text-gray-500">
          Rescue Formation Conseil — Conformite Qualiopi
        </div>
      </footer>
    </div>
  );
}
