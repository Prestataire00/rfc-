"use client";

import { useState, useEffect, useRef } from "react";
import { FolderOpen, FileText, Plus, Download, Trash2, Pencil, X, Check, Upload } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/utils";

type Document = {
  id: string;
  nom: string;
  type: string;
  chemin: string;
  taille: number | null;
  createdAt: string;
  session: { id: string; formation: { titre: string } } | null;
  formateur: { nom: string; prenom: string } | null;
  entreprise: { nom: string } | null;
};

type Session = { id: string; formation: { titre: string } };
type Formateur = { id: string; nom: string; prenom: string };
type Entreprise = { id: string; nom: string };

const TYPE_LABELS: Record<string, string> = {
  convention: "Convention",
  feuille_presence: "Feuille de pr\u00e9sence",
  convocation: "Convocation",
  attestation: "Attestation",
  contrat: "Contrat",
  autre: "Autre",
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("");

  // Upload modal
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState("autre");
  const [uploadSessionId, setUploadSessionId] = useState("");
  const [uploadFormateurId, setUploadFormateurId] = useState("");
  const [uploadEntrepriseId, setUploadEntrepriseId] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNom, setEditNom] = useState("");
  const [editType, setEditType] = useState("");

  // Linked data
  const [sessions, setSessions] = useState<Session[]>([]);
  const [formateurs, setFormateurs] = useState<Formateur[]>([]);
  const [entreprises, setEntreprises] = useState<Entreprise[]>([]);

  const fetchDocuments = () => {
    const params = new URLSearchParams();
    if (filterType) params.set("type", filterType);
    fetch(`/api/documents?${params}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => {
        setDocuments(d);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchDocuments();
  }, [filterType]);

  useEffect(() => {
    Promise.all([
      fetch("/api/sessions").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/formateurs").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/entreprises").then((r) => (r.ok ? r.json() : [])),
    ]).then(([s, f, e]) => {
      setSessions(Array.isArray(s) ? s : s.sessions || []);
      setFormateurs(Array.isArray(f) ? f : []);
      setEntreprises(Array.isArray(e) ? e : []);
    });
  }, []);

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", uploadType);
    if (uploadSessionId) formData.append("sessionId", uploadSessionId);
    if (uploadFormateurId) formData.append("formateurId", uploadFormateurId);
    if (uploadEntrepriseId) formData.append("entrepriseId", uploadEntrepriseId);

    const res = await fetch("/api/upload", { method: "POST", body: formData });
    setUploading(false);

    if (res.ok) {
      setShowUpload(false);
      setUploadType("autre");
      setUploadSessionId("");
      setUploadFormateurId("");
      setUploadEntrepriseId("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchDocuments();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce document ?")) return;
    const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
    if (res.ok) {
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    }
  };

  const startEdit = (doc: Document) => {
    setEditingId(doc.id);
    setEditNom(doc.nom);
    setEditType(doc.type);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditNom("");
    setEditType("");
  };

  const saveEdit = async (id: string) => {
    const res = await fetch(`/api/documents/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom: editNom, type: editType }),
    });
    if (res.ok) {
      setEditingId(null);
      fetchDocuments();
    }
  };

  return (
    <div>
      <PageHeader title="Documents" description="Gestion centralis\u00e9e des documents" />

      <div className="flex items-center justify-between gap-4 mb-6">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="h-10 rounded-md border border-gray-700 bg-gray-800 px-3 text-sm"
        >
          <option value="">Tous les types</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>

        <Button onClick={() => setShowUpload(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Ajouter un document
        </Button>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6 mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-100">Ajouter un document</h2>
              <button onClick={() => setShowUpload(false)} className="text-gray-400 hover:text-gray-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="file">Fichier *</Label>
                <Input id="file" type="file" ref={fileInputRef} className="mt-1" />
              </div>

              <div>
                <Label htmlFor="docType">Type de document</Label>
                <select
                  id="docType"
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value)}
                  className="mt-1 w-full h-10 rounded-md border border-gray-600 bg-gray-800 px-3 text-sm"
                >
                  {Object.entries(TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="sessionLink">Session (optionnel)</Label>
                <select
                  id="sessionLink"
                  value={uploadSessionId}
                  onChange={(e) => setUploadSessionId(e.target.value)}
                  className="mt-1 w-full h-10 rounded-md border border-gray-600 bg-gray-800 px-3 text-sm"
                >
                  <option value="">-- Aucune --</option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.formation?.titre || s.id}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="formateurLink">Formateur (optionnel)</Label>
                <select
                  id="formateurLink"
                  value={uploadFormateurId}
                  onChange={(e) => setUploadFormateurId(e.target.value)}
                  className="mt-1 w-full h-10 rounded-md border border-gray-600 bg-gray-800 px-3 text-sm"
                >
                  <option value="">-- Aucun --</option>
                  {formateurs.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.prenom} {f.nom}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="entrepriseLink">Entreprise (optionnel)</Label>
                <select
                  id="entrepriseLink"
                  value={uploadEntrepriseId}
                  onChange={(e) => setUploadEntrepriseId(e.target.value)}
                  className="mt-1 w-full h-10 rounded-md border border-gray-600 bg-gray-800 px-3 text-sm"
                >
                  <option value="">-- Aucune --</option>
                  {entreprises.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nom}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setShowUpload(false)}>
                  Annuler
                </Button>
                <Button onClick={handleUpload} disabled={uploading} className="gap-2">
                  <Upload className="h-4 w-4" />
                  {uploading ? "Envoi..." : "Envoyer"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Documents Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
        </div>
      ) : documents.length === 0 ? (
        <EmptyState icon={FolderOpen} title="Aucun document" description="Cliquez sur 'Ajouter un document' pour commencer" />
      ) : (
        <div className="rounded-lg border bg-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-400">Document</th>
                <th className="text-left px-4 py-3 font-medium text-gray-400">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-400">Formation</th>
                <th className="text-left px-4 py-3 font-medium text-gray-400">{"Li\u00e9 \u00e0"}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-400">Date</th>
                <th className="px-4 py-3 text-right font-medium text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id} className="border-b last:border-0 hover:bg-gray-700">
                  <td className="px-4 py-3">
                    {editingId === doc.id ? (
                      <Input
                        value={editNom}
                        onChange={(e) => setEditNom(e.target.value)}
                        className="h-8 text-sm"
                      />
                    ) : (
                      <a
                        href={doc.chemin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 font-medium text-red-600 hover:text-red-800 hover:underline"
                      >
                        <FileText className="h-4 w-4 text-red-400 shrink-0" />
                        {doc.nom}
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === doc.id ? (
                      <select
                        value={editType}
                        onChange={(e) => setEditType(e.target.value)}
                        className="h-8 rounded-md border border-gray-600 bg-gray-800 px-2 text-xs"
                      >
                        {Object.entries(TYPE_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="inline-flex rounded-full bg-gray-700 px-2 py-0.5 text-xs font-medium text-gray-300">
                        {TYPE_LABELS[doc.type] || doc.type}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400">{doc.session?.formation?.titre || "\u2014"}</td>
                  <td className="px-4 py-3 text-gray-400">
                    {doc.formateur ? `${doc.formateur.prenom} ${doc.formateur.nom}` : ""}
                    {doc.entreprise ? doc.entreprise.nom : ""}
                    {!doc.formateur && !doc.entreprise ? "\u2014" : ""}
                  </td>
                  <td className="px-4 py-3 text-gray-400">{formatDate(doc.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {editingId === doc.id ? (
                        <>
                          <button
                            onClick={() => saveEdit(doc.id)}
                            className="p-1.5 rounded-md text-green-600 hover:bg-green-900/20"
                            title="Enregistrer"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-1.5 rounded-md text-gray-400 hover:bg-gray-700"
                            title="Annuler"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          {doc.chemin && (
                            <a
                              href={doc.chemin}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-md text-red-600 hover:bg-red-900/20"
                              title={"T\u00e9l\u00e9charger"}
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          )}
                          <button
                            onClick={() => startEdit(doc)}
                            className="p-1.5 rounded-md text-gray-400 hover:bg-gray-700"
                            title="Modifier"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(doc.id)}
                            className="p-1.5 rounded-md text-red-500 hover:bg-red-900/20"
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
