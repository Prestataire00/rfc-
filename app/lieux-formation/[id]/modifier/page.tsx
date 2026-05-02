"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApi, useApiMutation } from "@/hooks/useApi";
import { ApiError } from "@/lib/fetcher";

type LieuData = {
  nom?: string;
  adresse?: string | null;
  codePostal?: string | null;
  ville?: string | null;
  pays?: string;
  capacite?: number | null;
  equipements?: string | null;
  tarifJournee?: number | null;
  tarifDemiJournee?: number | null;
  contactNom?: string | null;
  contactTelephone?: string | null;
  contactEmail?: string | null;
  accessibilitePMR?: boolean;
  consignesAcces?: string | null;
  infoParking?: string | null;
  infoTransport?: string | null;
  notes?: string | null;
};

export default function ModifierLieuPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

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

  const { data, error: fetchError, isLoading: loading } = useApi<LieuData>(`/api/lieux-formation/${id}`);
  const { trigger: updateLieu, isMutating: saving } = useApiMutation<Record<string, unknown>>(`/api/lieux-formation/${id}`, "PUT");

  useEffect(() => {
    if (!data) return;
    setForm({
      nom: data.nom ?? "",
      adresse: data.adresse ?? "",
      codePostal: data.codePostal ?? "",
      ville: data.ville ?? "",
      pays: data.pays ?? "France",
      capacite: data.capacite != null ? String(data.capacite) : "",
      equipements: data.equipements ?? "",
      tarifJournee: data.tarifJournee != null ? String(data.tarifJournee) : "",
      tarifDemiJournee: data.tarifDemiJournee != null ? String(data.tarifDemiJournee) : "",
      contactNom: data.contactNom ?? "",
      contactTelephone: data.contactTelephone ?? "",
      contactEmail: data.contactEmail ?? "",
      accessibilitePMR: data.accessibilitePMR ?? false,
      consignesAcces: data.consignesAcces ?? "",
      infoParking: data.infoParking ?? "",
      infoTransport: data.infoTransport ?? "",
      notes: data.notes ?? "",
    });
  }, [data]);

  useEffect(() => {
    if (fetchError) setError(fetchError.message || "Lieu introuvable");
  }, [fetchError]);

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

    const payload: Record<string, unknown> = {
      nom: form.nom,
      accessibilitePMR: form.accessibilitePMR,
      pays: form.pays,
      adresse: form.adresse || undefined,
      codePostal: form.codePostal || undefined,
      ville: form.ville || undefined,
      capacite: form.capacite ? Number(form.capacite) : null,
      equipements: form.equipements || undefined,
      tarifJournee: form.tarifJournee ? Number(form.tarifJournee) : null,
      tarifDemiJournee: form.tarifDemiJournee ? Number(form.tarifDemiJournee) : null,
      contactNom: form.contactNom || undefined,
      contactTelephone: form.contactTelephone || undefined,
      contactEmail: form.contactEmail || undefined,
      consignesAcces: form.consignesAcces || undefined,
      infoParking: form.infoParking || undefined,
      infoTransport: form.infoTransport || undefined,
      notes: form.notes || undefined,
    };

    try {
      await updateLieu(payload);
      router.push(`/lieux-formation/${id}`);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message || "Erreur lors de la mise à jour");
      } else {
        setError(err instanceof Error ? err.message : "Une erreur est survenue");
      }
    }
  };

  if (loading) return <div className="p-6 flex items-center justify-center py-24"><div className="h-6 w-6 animate-spin rounded-full border-2 border-red-600 border-t-transparent" /></div>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <Link href={`/lieux-formation/${id}`} className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-300 mb-4">
          <ArrowLeft className="h-4 w-4" /> Retour au lieu
        </Link>
        <h1 className="text-2xl font-bold text-gray-100">Modifier le lieu</h1>
        <p className="text-sm text-gray-400 mt-1">Mettez à jour les informations du lieu de formation</p>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-900/20 border border-red-700 px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      <form onSubmit={handleSubmit}>
        <Card className="mb-4">
          <CardHeader><CardTitle className="text-base">Informations générales</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nom">Nom du lieu <span className="text-red-500">*</span></Label>
              <Input id="nom" name="nom" value={form.nom} onChange={handleChange} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adresse">Adresse</Label>
              <Input id="adresse" name="adresse" value={form.adresse} onChange={handleChange} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="codePostal">Code postal</Label>
                <Input id="codePostal" name="codePostal" value={form.codePostal} onChange={handleChange} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ville">Ville</Label>
                <Input id="ville" name="ville" value={form.ville} onChange={handleChange} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pays">Pays</Label>
                <Input id="pays" name="pays" value={form.pays} onChange={handleChange} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="capacite">Capacité (personnes)</Label>
              <Input id="capacite" name="capacite" type="number" min="1" value={form.capacite} onChange={handleChange} />
            </div>
            <div className="flex items-center gap-3">
              <input id="accessibilitePMR" name="accessibilitePMR" type="checkbox" checked={form.accessibilitePMR} onChange={handleChange} className="h-4 w-4 rounded border-gray-600 text-red-600" />
              <Label htmlFor="accessibilitePMR" className="cursor-pointer">Accessible PMR</Label>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardHeader><CardTitle className="text-base">Tarification et équipements</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="tarifJournee">Tarif journée (€)</Label>
                <Input id="tarifJournee" name="tarifJournee" type="number" min="0" step="0.01" value={form.tarifJournee} onChange={handleChange} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tarifDemiJournee">Tarif demi-journée (€)</Label>
                <Input id="tarifDemiJournee" name="tarifDemiJournee" type="number" min="0" step="0.01" value={form.tarifDemiJournee} onChange={handleChange} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="equipements">Équipements</Label>
              <Textarea id="equipements" name="equipements" value={form.equipements} onChange={handleChange} rows={3} />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardHeader><CardTitle className="text-base">Contact</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="contactNom">Nom</Label>
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
          <CardHeader><CardTitle className="text-base">Accès</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="consignesAcces">Consignes d'accès</Label>
              <Textarea id="consignesAcces" name="consignesAcces" value={form.consignesAcces} onChange={handleChange} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="infoParking">Parking</Label>
                <Textarea id="infoParking" name="infoParking" value={form.infoParking} onChange={handleChange} rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="infoTransport">Transports</Label>
                <Textarea id="infoTransport" name="infoTransport" value={form.infoTransport} onChange={handleChange} rows={2} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" value={form.notes} onChange={handleChange} rows={2} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href={`/lieux-formation/${id}`} className="inline-flex items-center rounded-md border border-gray-600 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors">
            Annuler
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </form>
    </div>
  );
}
