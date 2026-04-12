"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { FolderOpen, FileText, Plus, Download, Trash2, Pencil, X, Check, Upload, Mail, Eye, LayoutTemplate } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/utils";

type MessageTemplate = {
  id: string;
  type: string;
  nom: string;
  description: string | null;
  objet: string;
  contenu: string;
  modifie: boolean;
  actif: boolean;
};
type DocumentTemplate = {
  id: string;
  type: string;
  nom: string;
  description: string | null;
  titre: string;
  modifie: boolean;
  actif: boolean;
};

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
  feuille_presence: "Feuille de présence",
  convocation: "Convocation",
  attestation: "Attestation",
  contrat: "Contrat",
  autre: "Autre",
};

export default function DocumentsPage() {
  const [tab, setTab] = useState<"uploads" | "modeles">("uploads");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("");

  // Modeles state
  const [messageTemplates, setMessageTemplates] = useState<MessageTemplate[]>([]);
  const [documentTemplates, setDocumentTemplates] = useState<DocumentTemplate[]>([]);
  const [modelesLoading, setModelesLoading] = useState(false);
  const [preview, setPreview] = useState<
    | { kind: "email"; template: MessageTemplate }
    | { kind: "pdf"; type: string; nom: string }
    | null
  >(null);

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

  // Charger les modeles quand on passe sur l'onglet
  useEffect(() => {
    if (tab !== "modeles" || messageTemplates.length > 0 || documentTemplates.length > 0) return;
    setModelesLoading(true);
    Promise.all([
      fetch("/api/message-templates").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/document-templates").then((r) => (r.ok ? r.json() : [])),
    ]).then(([m, d]) => {
      setMessageTemplates(Array.isArray(m) ? m : []);
      setDocumentTemplates(Array.isArray(d) ? d : []);
      setModelesLoading(false);
    });
  }, [tab, messageTemplates.length, documentTemplates.length]);

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
      <PageHeader title="Documents" description="Gestion centralisée des documents et des modeles" />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-700 mb-6">
        <button
          onClick={() => setTab("uploads")}
          className={`flex items-center gap-1.5 px-4 pb-2 pt-1 text-sm font-medium border-b-2 transition-colors ${
            tab === "uploads" ? "border-red-600 text-red-500" : "border-transparent text-gray-400 hover:text-gray-300"
          }`}
        >
          <FolderOpen className="h-4 w-4" /> Documents uploades
        </button>
        <button
          onClick={() => setTab("modeles")}
          className={`flex items-center gap-1.5 px-4 pb-2 pt-1 text-sm font-medium border-b-2 transition-colors ${
            tab === "modeles" ? "border-red-600 text-red-500" : "border-transparent text-gray-400 hover:text-gray-300"
          }`}
        >
          <LayoutTemplate className="h-4 w-4" /> Modeles
        </button>
      </div>

      {tab === "modeles" ? (
        <ModelesView
          messageTemplates={messageTemplates}
          documentTemplates={documentTemplates}
          loading={modelesLoading}
          onPreview={setPreview}
        />
      ) : (
      <>
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
        <div className="rounded-lg border bg-gray-800 overflow-x-auto">
          <table className="min-w-[640px] w-full text-sm">
            <thead className="bg-gray-900 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-400">Document</th>
                <th className="text-left px-4 py-3 font-medium text-gray-400">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-400">Formation</th>
                <th className="text-left px-4 py-3 font-medium text-gray-400 hidden sm:table-cell">{"Lié à"}</th>
                <th className="text-left px-4 py-3 font-medium text-gray-400 hidden sm:table-cell">Date</th>
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
                  <td className="px-4 py-3 text-gray-400 hidden sm:table-cell">
                    {doc.formateur ? `${doc.formateur.prenom} ${doc.formateur.nom}` : ""}
                    {doc.entreprise ? doc.entreprise.nom : ""}
                    {!doc.formateur && !doc.entreprise ? "\u2014" : ""}
                  </td>
                  <td className="px-4 py-3 text-gray-400 hidden sm:table-cell">{formatDate(doc.createdAt)}</td>
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
                              title="Télécharger"
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
      </>
      )}

      {/* Preview modal (emails ou PDFs) */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setPreview(null)}>
          <div className="bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
              <h2 className="text-lg font-semibold text-gray-100">
                {preview.kind === "email" ? `Apercu email — ${preview.template.nom}` : `Apercu PDF — ${preview.nom}`}
              </h2>
              <button onClick={() => setPreview(null)} className="text-gray-400 hover:text-gray-200">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-auto flex-1">
              {preview.kind === "email" ? (
                <div className="p-4 space-y-3">
                  <div className="rounded-md bg-gray-900 border border-gray-700 p-3 text-sm">
                    <p className="text-[10px] uppercase text-gray-500 font-semibold">Objet</p>
                    <p className="text-gray-100 mt-1">{preview.template.objet.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_, k) => `[${k}]`)}</p>
                  </div>
                  <div className="rounded-md bg-white border border-gray-300 p-4">
                    <div
                      className="prose prose-sm max-w-none text-gray-900"
                      dangerouslySetInnerHTML={{
                        __html: preview.template.contenu.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_, k) => `[${k}]`),
                      }}
                    />
                  </div>
                </div>
              ) : (
                <iframe
                  src={`/api/pdf/template-preview/${preview.type}`}
                  title="Apercu PDF"
                  className="w-full bg-white"
                  style={{ height: "75vh" }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== MODELES VIEW ====================
function ModelesView({
  messageTemplates,
  documentTemplates,
  loading,
  onPreview,
}: {
  messageTemplates: MessageTemplate[];
  documentTemplates: DocumentTemplate[];
  loading: boolean;
  onPreview: (p: { kind: "email"; template: MessageTemplate } | { kind: "pdf"; type: string; nom: string }) => void;
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
      </div>
    );
  }
  return (
    <div className="space-y-8">
      {/* PDF */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
              <FileText className="h-5 w-5 text-red-500" /> Documents PDF
            </h2>
            <p className="text-xs text-gray-400">
              Convocation, convention, attestation, feuille de presence, devis, facture.
            </p>
          </div>
          <Link
            href="/parametres/templates-documents"
            className="text-xs inline-flex items-center gap-1 rounded-md bg-red-600 hover:bg-red-700 text-white px-3 py-1.5"
          >
            <Pencil className="h-3 w-3" /> Editer les modeles
          </Link>
        </div>
        {documentTemplates.length === 0 ? (
          <EmptyState icon={FileText} title="Aucun modele PDF" description="Les modeles seront crees au premier acces." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {documentTemplates.map((t) => (
              <div
                key={t.id}
                className="rounded-lg border border-gray-700 bg-gray-800 p-4 flex flex-col"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-gray-100 text-sm leading-tight">{t.nom}</h3>
                  {t.modifie && <span className="text-[9px] rounded-full bg-amber-900/40 border border-amber-700 text-amber-300 px-1.5 py-0.5 shrink-0">Modifie</span>}
                </div>
                {t.description && <p className="text-xs text-gray-400 mb-3 line-clamp-2">{t.description}</p>}
                <div className="mt-auto flex gap-2">
                  <button
                    onClick={() => onPreview({ kind: "pdf", type: t.type, nom: t.nom })}
                    className="flex-1 inline-flex items-center justify-center gap-1 rounded-md border border-gray-600 bg-gray-900 hover:bg-gray-700 text-gray-200 text-xs px-2 py-1.5"
                  >
                    <Eye className="h-3 w-3" /> Apercu
                  </button>
                  <Link
                    href="/parametres/templates-documents"
                    className="flex-1 inline-flex items-center justify-center gap-1 rounded-md bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1.5"
                  >
                    <Pencil className="h-3 w-3" /> Modifier
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Emails */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
              <Mail className="h-5 w-5 text-red-500" /> Emails automatiques
            </h2>
            <p className="text-xs text-gray-400">
              Convocations, fiches besoin, evaluations a chaud/froid, rappels de presence, etc.
            </p>
          </div>
          <Link
            href="/parametres/templates-messages"
            className="text-xs inline-flex items-center gap-1 rounded-md bg-red-600 hover:bg-red-700 text-white px-3 py-1.5"
          >
            <Pencil className="h-3 w-3" /> Editer les modeles
          </Link>
        </div>
        {messageTemplates.length === 0 ? (
          <EmptyState icon={Mail} title="Aucun modele email" description="Les modeles seront crees au premier acces." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {messageTemplates.map((t) => (
              <div
                key={t.id}
                className="rounded-lg border border-gray-700 bg-gray-800 p-4 flex flex-col"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-gray-100 text-sm leading-tight">{t.nom}</h3>
                  {t.modifie && <span className="text-[9px] rounded-full bg-amber-900/40 border border-amber-700 text-amber-300 px-1.5 py-0.5 shrink-0">Modifie</span>}
                </div>
                {t.description && <p className="text-xs text-gray-400 mb-3 line-clamp-2">{t.description}</p>}
                <div className="mt-auto flex gap-2">
                  <button
                    onClick={() => onPreview({ kind: "email", template: t })}
                    className="flex-1 inline-flex items-center justify-center gap-1 rounded-md border border-gray-600 bg-gray-900 hover:bg-gray-700 text-gray-200 text-xs px-2 py-1.5"
                  >
                    <Eye className="h-3 w-3" /> Apercu
                  </button>
                  <Link
                    href="/parametres/templates-messages"
                    className="flex-1 inline-flex items-center justify-center gap-1 rounded-md bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1.5"
                  >
                    <Pencil className="h-3 w-3" /> Modifier
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
