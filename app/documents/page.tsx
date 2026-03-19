"use client";

import { useState, useEffect } from "react";
import { FolderOpen, FileText, Plus, Download, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDate } from "@/lib/utils";

type Document = {
  id: string;
  nom: string;
  type: string;
  chemin: string;
  createdAt: string;
  session: { id: string; formation: { titre: string } } | null;
  formateur: { nom: string; prenom: string } | null;
  entreprise: { nom: string } | null;
};

const TYPE_LABELS: Record<string, string> = {
  convention: "Convention",
  feuille_presence: "Feuille de présence",
  convocation: "Convocation",
  attestation: "Attestation",
  contrat: "Contrat",
  autre: "Autre",
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (filterType) params.set("type", filterType);
    fetch(`/api/documents?${params}`)
      .then((r) => r.ok ? r.json() : [])
      .then((d) => { setDocuments(d); setLoading(false); });
  }, [filterType]);

  return (
    <div>
      <PageHeader title="Documents" description="Gestion centralisée des documents" />

      <div className="flex items-center gap-4 mb-6">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="h-10 rounded-md border border-gray-200 bg-white px-3 text-sm"
        >
          <option value="">Tous les types</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>
      ) : documents.length === 0 ? (
        <EmptyState icon={FolderOpen} title="Aucun document" description="Les documents générés apparaîtront ici" />
      ) : (
        <div className="rounded-lg border bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Document</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Formation</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Lié à</th>
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
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                      {TYPE_LABELS[doc.type] || doc.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{doc.session?.formation?.titre || "—"}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {doc.formateur ? `${doc.formateur.prenom} ${doc.formateur.nom}` : ""}
                    {doc.entreprise ? doc.entreprise.nom : ""}
                    {!doc.formateur && !doc.entreprise ? "—" : ""}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(doc.createdAt)}</td>
                  <td className="px-4 py-3">
                    <button className="text-blue-600 hover:text-blue-800"><Download className="h-4 w-4" /></button>
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
