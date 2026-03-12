"use client";

import { useState, useEffect } from "react";
import { FileText, Download } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
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
  feuille_presence: "Feuille de presence",
  convocation: "Convocation",
  attestation: "Attestation",
  autre: "Autre",
};

export default function FormateurDocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetched via the generic documents API filtered by the logged-in formateur
    fetch("/api/formateur/documents")
      .then((r) => r.json())
      .then((d) => { setDocuments(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader title="Mes Documents" description="Consultez et telechargez vos documents contractuels" />

      {loading ? (
        <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>
      ) : documents.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>Aucun document disponible</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Document</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Formation</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-400" />
                    {doc.nom}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{DOC_TYPE_LABELS[doc.type] || doc.type}</td>
                  <td className="px-4 py-3 text-gray-600">{doc.session?.formation?.titre || "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(doc.createdAt)}</td>
                  <td className="px-4 py-3">
                    <button className="text-blue-600 hover:text-blue-800">
                      <Download className="h-4 w-4" />
                    </button>
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
