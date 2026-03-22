"use client";

import { useState, useEffect } from "react";
import { FolderOpen, FileText, Download } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatDate } from "@/lib/utils";

type Document = {
  id: string;
  nom: string;
  type: string;
  createdAt: string;
  session: { formation: { titre: string } } | null;
};

const TYPE_LABELS: Record<string, string> = {
  convention: "Convention",
  feuille_presence: "Feuille de présence",
  attestation: "Attestation",
  facture: "Facture",
  convocation: "Convocation",
  autre: "Autre",
};

export default function ClientDocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("");

  useEffect(() => {
    fetch("/api/client/documents")
      .then((r) => r.ok ? r.json() : [])
      .then((d) => { setDocuments(d); setLoading(false); });
  }, []);

  const filtered = filterType ? documents.filter((d) => d.type === filterType) : documents;

  return (
    <div>
      <PageHeader title="Bibliotheque de Documents" description="Consultez et telechargez tous vos documents administratifs" />

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilterType("")}
          className={`rounded-full px-3 py-1 text-xs font-medium border ${!filterType ? "bg-red-900/30 text-red-400 border-red-300" : "bg-gray-900 text-gray-400 border-gray-700"}`}
        >
          Tous
        </button>
        {Object.entries(TYPE_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilterType(key)}
            className={`rounded-full px-3 py-1 text-xs font-medium border ${filterType === key ? "bg-red-900/30 text-red-400 border-red-300" : "bg-gray-900 text-gray-400 border-gray-700"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <FolderOpen className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>Aucun document</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((doc) => (
            <div key={doc.id} className="rounded-lg border bg-gray-800 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-gray-700 p-2">
                  <FileText className="h-6 w-6 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-100 text-sm truncate">{doc.nom}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{TYPE_LABELS[doc.type] || doc.type}</p>
                  {doc.session && <p className="text-xs text-gray-400 mt-0.5">{doc.session.formation.titre}</p>}
                  <p className="text-xs text-gray-400 mt-1">{formatDate(doc.createdAt)}</p>
                </div>
                <button className="text-red-600 hover:text-red-800 flex-shrink-0">
                  <Download className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
