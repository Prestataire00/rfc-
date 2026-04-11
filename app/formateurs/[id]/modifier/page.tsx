"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Upload, FileText, Trash2, ExternalLink } from "lucide-react";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { parseSpecialites } from "@/lib/utils";

export default function ModifierFormateurPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<{ id: string; nom: string; type: string; chemin: string; createdAt: string }[]>([]);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    nom: "",
    prenom: "",
    email: "",
    telephone: "",
    specialites: "",
    tarifJournalier: "",
    notes: "",
  });

  useEffect(() => {
    fetch(`/api/formateurs/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Formateur introuvable");
        return res.json();
      })
      .then((data) => {
        const specialitesArray = parseSpecialites(data.specialites ?? "[]");
        setForm({
          nom: data.nom ?? "",
          prenom: data.prenom ?? "",
          email: data.email ?? "",
          telephone: data.telephone ?? "",
          specialites: specialitesArray.join(", "),
          tarifJournalier: data.tarifJournalier != null ? String(data.tarifJournalier) : "",
          notes: data.notes ?? "",
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

    // Load existing documents
    fetch(`/api/documents?formateurId=${id}`)
      .then((r) => r.ok ? r.json() : [])
      .then((d) => setDocuments(Array.isArray(d) ? d : d.documents || []))
      .catch(() => {});
  }, [id]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", docType);
      formData.append("formateurId", id);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (res.ok) {
        const doc = await res.json();
        setDocuments((prev) => [doc, ...prev]);
      }
    } catch { /* silent */ }
    setUploading(false);
    e.target.value = "";
  };

  const handleDeleteDoc = async (docId: string) => {
    try {
      const res = await fetch(`/api/documents/${docId}`, { method: "DELETE" });
      if (res.ok) setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch { /* silent */ }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      // Convert comma-separated specialites string to array
      const specialitesArray = form.specialites
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const payload: Record<string, unknown> = {
        nom: form.nom,
        prenom: form.prenom,
        specialites: specialitesArray,
      };
      if (form.email) payload.email = form.email;
      if (form.telephone) payload.telephone = form.telephone;
      if (form.tarifJournalier) payload.tarifJournalier = Number(form.tarifJournalier);
      if (form.notes) payload.notes = form.notes;

      const res = await fetch(`/api/formateurs/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error?.message || "Erreur lors de la mise à jour");
      }

      router.push(`/formateurs/${id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center py-24">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <Breadcrumb items={[
          { label: "Formateurs", href: "/formateurs" },
          { label: "Formateur", href: `/formateurs/${id}` },
          { label: "Modifier" },
        ]} />
        <h1 className="text-2xl font-bold text-gray-100">Modifier le formateur</h1>
        <p className="text-sm text-gray-400 mt-1">Mettez à jour les informations du formateur</p>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-900/20 border border-red-700 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">Identité</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="prenom">Prénom <span className="text-red-500">*</span></Label>
                <Input
                  id="prenom"
                  name="prenom"
                  value={form.prenom}
                  onChange={handleChange}
                  placeholder="Marie"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nom">Nom <span className="text-red-500">*</span></Label>
                <Input
                  id="nom"
                  name="nom"
                  value={form.nom}
                  onChange={handleChange}
                  placeholder="Martin"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">Coordonnées</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="marie.martin@exemple.fr"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="telephone">Téléphone</Label>
              <Input
                id="telephone"
                name="telephone"
                type="tel"
                value={form.telephone}
                onChange={handleChange}
                placeholder="06 12 34 56 78"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">Expertise & Tarification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="specialites">Spécialités</Label>
              <Input
                id="specialites"
                name="specialites"
                value={form.specialites}
                onChange={handleChange}
                placeholder="Excel, PowerPoint, Management (séparées par des virgules)"
              />
              <p className="text-xs text-gray-400">
                Saisissez les spécialités séparées par des virgules
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tarifJournalier">Tarif journalier (€ HT)</Label>
              <Input
                id="tarifJournalier"
                name="tarifJournalier"
                type="number"
                min="0"
                step="0.01"
                value={form.tarifJournalier}
                onChange={handleChange}
                placeholder="600"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes internes</Label>
              <Textarea
                id="notes"
                name="notes"
                value={form.notes}
                onChange={handleChange}
                placeholder="Informations complémentaires sur le formateur..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Documents & CV */}
        <Card className="mb-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-400" /> Documents & CV
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Upload buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { type: "cv", label: "CV" },
                { type: "diplome", label: "Diplome" },
                { type: "certification", label: "Certification" },
                { type: "habilitation", label: "Habilitation" },
                { type: "piece_identite", label: "Piece d'identite" },
                { type: "autre", label: "Autre document" },
              ].map((dt) => (
                <label
                  key={dt.type}
                  className="flex items-center gap-2 rounded-md border border-dashed border-gray-600 px-3 py-2.5 text-sm text-gray-400 hover:border-red-500 hover:text-red-400 cursor-pointer transition-colors"
                >
                  <Upload className="h-4 w-4 shrink-0" />
                  <span>{dt.label}</span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileUpload(e, dt.type)}
                    disabled={uploading}
                  />
                </label>
              ))}
            </div>
            {uploading && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                Upload en cours...
              </div>
            )}

            {/* Documents list */}
            {documents.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-gray-700">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-2.5 rounded-lg bg-gray-900 border border-gray-700">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-200 truncate">{doc.nom}</p>
                        <p className="text-xs text-gray-500">{doc.type.replace("_", " ")}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <a
                        href={doc.chemin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center h-7 w-7 rounded-md text-gray-400 hover:text-gray-100 hover:bg-gray-700 transition-colors"
                        title="Ouvrir"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDeleteDoc(doc.id)}
                        className="inline-flex items-center justify-center h-7 w-7 rounded-md text-gray-400 hover:text-red-400 hover:bg-gray-700 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {documents.length === 0 && (
              <p className="text-sm text-gray-500 italic text-center py-2">Aucun document. Utilisez les boutons ci-dessus pour ajouter des fichiers.</p>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link
            href={`/formateurs/${id}`}
            className="inline-flex items-center rounded-md border border-gray-600 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors"
          >
            Annuler
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? "Enregistrement..." : "Enregistrer les modifications"}
          </Button>
        </div>
      </form>
    </div>
  );
}
