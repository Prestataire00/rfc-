"use client";

import { useState, useEffect, useRef } from "react";
import { FileText, Download, Upload, Plus, X } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/utils";

type Document = {
  id: string;
  nom: string;
  type: string;
  chemin: string;
  createdAt: string;
  session: { formation: { titre: string } } | null;
};

const DOC_TYPE_LABELS: Record<string, string> = {
  convention: "Convention",
  contrat: "Contrat de sous-traitance",
  feuille_presence: "Feuille de présence",
  convocation: "Convocation",
  attestation: "Attestation",
  autre: "Autre",
};

export default function FormateurDocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState("autre");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = () => {
    fetch("/api/formateur/documents")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => { setDocuments(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", uploadType);

    const res = await fetch("/api/upload", { method: "POST", body: formData });
    setUploading(false);

    if (res.ok) {
      setShowUpload(false);
      setUploadType("autre");
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchDocuments();
    }
  };

  return (
    <div>
      <PageHeader title="Mes Documents" description="Consultez, téléchargez et déposez vos documents" />

      <div className="flex justify-end mb-4">
        <Button onClick={() => setShowUpload(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Déposer un document
        </Button>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6 mx-4 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-100">Déposer un document</h2>
              <button onClick={() => setShowUpload(false)} className="text-gray-400 hover:text-gray-200">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <Label>Fichier *</Label>
                <Input type="file" ref={fileInputRef} className="mt-1" />
              </div>
              <div>
                <Label>Type de document</Label>
                <select
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value)}
                  className="mt-1 w-full h-10 rounded-md border border-gray-600 bg-gray-900 text-gray-100 px-3 text-sm"
                >
                  {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setShowUpload(false)}>Annuler</Button>
                <Button onClick={handleUpload} disabled={uploading} className="gap-2">
                  <Upload className="h-4 w-4" />
                  {uploading ? "Envoi..." : "Envoyer"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>Aucun document disponible</p>
          <p className="text-sm mt-1">Cliquez sur "Déposer un document" pour ajouter un fichier</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-400">Document</th>
                <th className="text-left px-4 py-3 font-medium text-gray-400">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-400">Formation</th>
                <th className="text-left px-4 py-3 font-medium text-gray-400">Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id} className="border-b last:border-0 hover:bg-gray-700">
                  <td className="px-4 py-3">
                    <a
                      href={doc.chemin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-red-400 hover:text-red-300 hover:underline flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                      {doc.nom}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{DOC_TYPE_LABELS[doc.type] || doc.type}</td>
                  <td className="px-4 py-3 text-gray-400">{doc.session?.formation?.titre || "—"}</td>
                  <td className="px-4 py-3 text-gray-400">{formatDate(doc.createdAt)}</td>
                  <td className="px-4 py-3">
                    {doc.chemin && (
                      <a
                        href={doc.chemin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-md text-red-500 hover:bg-red-900/20"
                        title="Télécharger"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    )}
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
