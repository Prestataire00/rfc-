"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { SESSION_STATUTS } from "@/lib/constants";

type Formation = { id: string; titre: string };
type Formateur = { id: string; nom: string; prenom: string };

function toDatetimeLocal(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ModifierSessionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [formations, setFormations] = useState<Formation[]>([]);
  const [formateurs, setFormateurs] = useState<Formateur[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    formationId: "",
    formateurId: "",
    dateDebut: "",
    dateFin: "",
    lieu: "",
    capaciteMax: 10,
    statut: "planifiee",
    notes: "",
  });

  const fetchData = useCallback(async () => {
    const [sessionRes, formationsRes, formateursRes] = await Promise.all([
      fetch(`/api/sessions/${id}`),
      fetch("/api/formations"),
      fetch("/api/formateurs"),
    ]);

    if (sessionRes.ok) {
      const session = await sessionRes.json();
      setFormData({
        formationId: session.formationId || session.formation?.id || "",
        formateurId: session.formateurId || session.formateur?.id || "",
        dateDebut: toDatetimeLocal(session.dateDebut),
        dateFin: toDatetimeLocal(session.dateFin),
        lieu: session.lieu || "",
        capaciteMax: session.capaciteMax,
        statut: session.statut,
        notes: session.notes || "",
      });
    }

    if (formationsRes.ok) {
      const fData = await formationsRes.json();
      setFormations(Array.isArray(fData) ? fData : fData.formations || []);
    }
    if (formateursRes.ok) setFormateurs(await formateursRes.json());
    setPageLoading(false);
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "capaciteMax" ? parseInt(value, 10) || 1 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.formationId) {
      setError("Veuillez sélectionner une formation.");
      return;
    }
    if (!formData.dateDebut || !formData.dateFin) {
      setError("Veuillez renseigner les dates de début et de fin.");
      return;
    }
    if (new Date(formData.dateFin) <= new Date(formData.dateDebut)) {
      setError("La date de fin doit être postérieure à la date de début.");
      return;
    }

    setLoading(true);

    const payload = {
      formationId: formData.formationId,
      formateurId: formData.formateurId || null,
      dateDebut: formData.dateDebut,
      dateFin: formData.dateFin,
      lieu: formData.lieu || null,
      capaciteMax: formData.capaciteMax,
      statut: formData.statut,
      notes: formData.notes || null,
    };

    const res = await fetch(`/api/sessions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      router.push(`/sessions/${id}`);
    } else {
      const data = await res.json();
      setError(data.error?.message || "Une erreur est survenue.");
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Breadcrumb items={[
          { label: "Sessions", href: "/sessions" },
          { label: "Session", href: `/sessions/${id}` },
          { label: "Modifier" },
        ]} />
        <h1 className="text-2xl font-bold text-gray-100">Modifier la session</h1>
        <p className="text-gray-400">Mettez à jour les informations de la session</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations de la session</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-md bg-red-900/20 border border-red-700 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Formation */}
            <div className="space-y-1.5">
              <Label htmlFor="formationId">Formation *</Label>
              <select
                id="formationId"
                name="formationId"
                value={formData.formationId}
                onChange={handleChange}
                required
                className="w-full h-10 rounded-md border border-gray-600 bg-gray-800 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">-- Sélectionner une formation --</option>
                {formations.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.titre}
                  </option>
                ))}
              </select>
            </div>

            {/* Formateur */}
            <div className="space-y-1.5">
              <Label htmlFor="formateurId">Formateur</Label>
              <select
                id="formateurId"
                name="formateurId"
                value={formData.formateurId}
                onChange={handleChange}
                className="w-full h-10 rounded-md border border-gray-600 bg-gray-800 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">-- Aucun formateur --</option>
                {formateurs.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.prenom} {f.nom}
                  </option>
                ))}
              </select>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="dateDebut">Date de début *</Label>
                <Input
                  id="dateDebut"
                  name="dateDebut"
                  type="datetime-local"
                  value={formData.dateDebut}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dateFin">Date de fin *</Label>
                <Input
                  id="dateFin"
                  name="dateFin"
                  type="datetime-local"
                  value={formData.dateFin}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* Lieu */}
            <div className="space-y-1.5">
              <Label htmlFor="lieu">Lieu</Label>
              <Input
                id="lieu"
                name="lieu"
                placeholder="Ex: Salle A, 10 rue de la Paix, Paris"
                value={formData.lieu}
                onChange={handleChange}
              />
            </div>

            {/* Capacité et statut */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="capaciteMax">Capacité maximale *</Label>
                <Input
                  id="capaciteMax"
                  name="capaciteMax"
                  type="number"
                  min={1}
                  max={500}
                  value={formData.capaciteMax}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="statut">Statut</Label>
                <select
                  id="statut"
                  name="statut"
                  value={formData.statut}
                  onChange={handleChange}
                  className="w-full h-10 rounded-md border border-gray-600 bg-gray-800 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  {Object.entries(SESSION_STATUTS).map(([v, s]) => (
                    <option key={v} value={v}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Informations complémentaires sur la session..."
                value={formData.notes}
                onChange={handleChange}
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Link
                href={`/sessions/${id}`}
                className="inline-flex items-center rounded-md border border-gray-600 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors"
              >
                Annuler
              </Link>
              <Button type="submit" disabled={loading}>
                {loading ? "Enregistrement..." : "Enregistrer les modifications"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
