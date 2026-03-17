"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { SESSION_STATUTS } from "@/lib/constants";

type Formation = { id: string; titre: string };
type Formateur = { id: string; nom: string; prenom: string };

export default function NouvelleSessionPage() {
  const router = useRouter();
  const [formations, setFormations] = useState<Formation[]>([]);
  const [formateurs, setFormateurs] = useState<Formateur[]>([]);
  const [loading, setLoading] = useState(false);
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

  useEffect(() => {
    Promise.all([
      fetch("/api/formations").then((r) => r.json()),
      fetch("/api/formateurs").then((r) => r.json()),
    ]).then(([f, fo]) => {
      setFormations(Array.isArray(f) ? f : f.formations || []);
      setFormateurs(Array.isArray(fo) ? fo : fo.formateurs || []);
    });
  }, []);

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
      ...(formData.formateurId ? { formateurId: formData.formateurId } : {}),
      dateDebut: formData.dateDebut,
      dateFin: formData.dateFin,
      lieu: formData.lieu || null,
      capaciteMax: formData.capaciteMax,
      statut: formData.statut,
      notes: formData.notes || null,
    };

    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      router.push(`/sessions/${data.id}`);
    } else {
      const data = await res.json();
      setError(data.error?.message || "Une erreur est survenue.");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href="/sessions"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Retour aux sessions
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Nouvelle session</h1>
        <p className="text-gray-500">Planifiez une nouvelle session de formation</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations de la session</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
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
                className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                href="/sessions"
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Annuler
              </Link>
              <Button type="submit" disabled={loading}>
                {loading ? "Création..." : "Créer la session"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
