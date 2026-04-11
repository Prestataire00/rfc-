"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NouveauLieuPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    nom: "",
    adresse: "",
    codePostal: "",
    ville: "",
    pays: "France",
    capacite: "",
    equipements: "",
    tarifJournee: "",
    tarifDemiJournee: "",
    contactNom: "",
    contactTelephone: "",
    contactEmail: "",
    accessibilitePMR: false,
    consignesAcces: "",
    infoParking: "",
    infoTransport: "",
    notes: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      setForm((prev) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const payload: Record<string, unknown> = {
        nom: form.nom,
        accessibilitePMR: form.accessibilitePMR,
        pays: form.pays,
      };
      if (form.adresse) payload.adresse = form.adresse;
      if (form.codePostal) payload.codePostal = form.codePostal;
      if (form.ville) payload.ville = form.ville;
      if (form.capacite) payload.capacite = Number(form.capacite);
      if (form.equipements) payload.equipements = form.equipements;
      if (form.tarifJournee) payload.tarifJournee = Number(form.tarifJournee);
      if (form.tarifDemiJournee) payload.tarifDemiJournee = Number(form.tarifDemiJournee);
      if (form.contactNom) payload.contactNom = form.contactNom;
      if (form.contactTelephone) payload.contactTelephone = form.contactTelephone;
      if (form.contactEmail) payload.contactEmail = form.contactEmail;
      if (form.consignesAcces) payload.consignesAcces = form.consignesAcces;
      if (form.infoParking) payload.infoParking = form.infoParking;
      if (form.infoTransport) payload.infoTransport = form.infoTransport;
      if (form.notes) payload.notes = form.notes;

      const res = await fetch("/api/lieux-formation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error?.message || "Erreur lors de la création");
      }

      const lieu = await res.json();
      router.push(`/lieux-formation/${lieu.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <Link
          href="/lieux-formation"
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-300 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux lieux
        </Link>
        <h1 className="text-2xl font-bold text-gray-100">Nouveau lieu de formation</h1>
        <p className="text-sm text-gray-400 mt-1">Ajoutez un nouveau site de formation</p>
      </div>

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
              <Label htmlFor="nom">Nom du lieu <span className="text-red-500">*</span></Label>
              <Input id="nom" name="nom" value={form.nom} onChange={handleChange} placeholder="Centre de formation RFC" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adresse">Adresse</Label>
              <Input id="adresse" name="adresse" value={form.adresse} onChange={handleChange} placeholder="123 rue de la Formation" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="codePostal">Code postal</Label>
                <Input id="codePostal" name="codePostal" value={form.codePostal} onChange={handleChange} placeholder="83000" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ville">Ville</Label>
                <Input id="ville" name="ville" value={form.ville} onChange={handleChange} placeholder="Toulon" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pays">Pays</Label>
                <Input id="pays" name="pays" value={form.pays} onChange={handleChange} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="capacite">Capacité (personnes)</Label>
              <Input id="capacite" name="capacite" type="number" min="1" value={form.capacite} onChange={handleChange} placeholder="20" />
            </div>
            <div className="flex items-center gap-3">
              <input id="accessibilitePMR" name="accessibilitePMR" type="checkbox" checked={form.accessibilitePMR} onChange={handleChange} className="h-4 w-4 rounded border-gray-600 text-red-600" />
              <Label htmlFor="accessibilitePMR" className="cursor-pointer">Accessible aux personnes à mobilité réduite (PMR)</Label>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">Tarification et équipements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="tarifJournee">Tarif journée (€)</Label>
                <Input id="tarifJournee" name="tarifJournee" type="number" min="0" step="0.01" value={form.tarifJournee} onChange={handleChange} placeholder="500" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tarifDemiJournee">Tarif demi-journée (€)</Label>
                <Input id="tarifDemiJournee" name="tarifDemiJournee" type="number" min="0" step="0.01" value={form.tarifDemiJournee} onChange={handleChange} placeholder="300" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="equipements">Équipements disponibles</Label>
              <Textarea id="equipements" name="equipements" value={form.equipements} onChange={handleChange} placeholder="Vidéoprojecteur, paperboard, WiFi, matériel pédagogique..." rows={3} />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="contactNom">Nom du contact</Label>
                <Input id="contactNom" name="contactNom" value={form.contactNom} onChange={handleChange} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contactTelephone">Téléphone</Label>
                <Input id="contactTelephone" name="contactTelephone" value={form.contactTelephone} onChange={handleChange} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contactEmail">Email</Label>
                <Input id="contactEmail" name="contactEmail" type="email" value={form.contactEmail} onChange={handleChange} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">Accès</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="consignesAcces">Consignes d'accès</Label>
              <Textarea id="consignesAcces" name="consignesAcces" value={form.consignesAcces} onChange={handleChange} placeholder="Entrée par le portail principal, sonner à l'interphone..." rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="infoParking">Parking</Label>
                <Textarea id="infoParking" name="infoParking" value={form.infoParking} onChange={handleChange} placeholder="Parking gratuit devant le bâtiment" rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="infoTransport">Transports en commun</Label>
                <Textarea id="infoTransport" name="infoTransport" value={form.infoTransport} onChange={handleChange} placeholder="Bus ligne 3, arrêt Formation" rows={2} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" value={form.notes} onChange={handleChange} rows={2} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href="/lieux-formation" className="inline-flex items-center rounded-md border border-gray-600 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors">
            Annuler
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? "Création..." : "Créer le lieu"}
          </Button>
        </div>
      </form>
    </div>
  );
}
