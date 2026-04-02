"use client";

import { useState, useEffect } from "react";
import { FileText, Download, FolderOpen, BookOpen, Receipt, FileCheck } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatDate } from "@/lib/utils";

type SessionDoc = {
  id: string;
  dateDebut: string;
  dateFin: string;
  formation: { titre: string };
  inscriptions: { contact: { id: string; nom: string; prenom: string } }[];
};

type DevisDoc = {
  id: string;
  numero: string;
  statut: string;
  montantTTC: number;
  dateEmission: string;
};

type FactureDoc = {
  id: string;
  numero: string;
  statut: string;
  montantTTC: number;
  dateEmission: string;
};

type Data = {
  sessions: SessionDoc[];
  devis: DevisDoc[];
  factures: FactureDoc[];
};

function fmtMoney(n: number) {
  return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

function DownloadBtn({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-md bg-gray-700 hover:bg-gray-600 px-3 py-1.5 text-xs text-gray-100 transition-colors"
    >
      <Download className="h-3.5 w-3.5" />
      {label}
    </a>
  );
}

export default function ClientDocumentsPage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/client/documents")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { setData(d); setLoading(false); });
  }, []);

  if (loading) {
    return <div className="flex justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" /></div>;
  }

  const hasData = data && (data.sessions.length > 0 || data.devis.length > 0 || data.factures.length > 0);

  if (!hasData) {
    return (
      <div>
        <PageHeader title="Documents" description="Téléchargez vos documents de formation" />
        <div className="text-center py-16 text-gray-400">
          <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>Aucun document disponible</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Documents" description="Téléchargez vos documents de formation" />

      {/* Sessions — Convention, Feuille de présence, Attestations */}
      {data.sessions.length > 0 && (
        <section>
          <h2 className="flex items-center gap-2 text-base font-semibold text-gray-100 mb-4">
            <BookOpen className="h-5 w-5 text-red-400" />
            Documents de formation
          </h2>
          <div className="space-y-4">
            {data.sessions.map((s) => (
              <div key={s.id} className="rounded-lg border border-gray-700 bg-gray-800 p-4">
                <div className="mb-3">
                  <p className="font-medium text-gray-100">{s.formation.titre}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDate(s.dateDebut)} → {formatDate(s.dateFin)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  <DownloadBtn
                    href={`/api/pdf/convention/${s.id}`}
                    label="Convention"
                  />
                  <DownloadBtn
                    href={`/api/pdf/feuille-presence/${s.id}`}
                    label="Feuille de présence"
                  />
                </div>
                {s.inscriptions.length > 0 && (
                  <div className="border-t border-gray-700 pt-3">
                    <p className="text-xs text-gray-400 mb-2">Attestations par stagiaire :</p>
                    <div className="flex flex-wrap gap-2">
                      {s.inscriptions.map((insc) => (
                        <DownloadBtn
                          key={insc.contact.id}
                          href={`/api/pdf/attestation/${s.id}/${insc.contact.id}`}
                          label={`Attestation — ${insc.contact.prenom} ${insc.contact.nom}`}
                        />
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {s.inscriptions.map((insc) => (
                        <DownloadBtn
                          key={insc.contact.id + "-conv"}
                          href={`/api/pdf/convocation/${s.id}/${insc.contact.id}`}
                          label={`Convocation — ${insc.contact.prenom} ${insc.contact.nom}`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Devis */}
      {data.devis.length > 0 && (
        <section>
          <h2 className="flex items-center gap-2 text-base font-semibold text-gray-100 mb-4">
            <FileText className="h-5 w-5 text-blue-400" />
            Devis
          </h2>
          <div className="space-y-2">
            {data.devis.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800 px-4 py-3">
                <div>
                  <p className="font-medium text-gray-100 text-sm">{d.numero}</p>
                  <p className="text-xs text-gray-400">{formatDate(d.dateEmission)} · {fmtMoney(d.montantTTC)} · <span className="capitalize">{d.statut}</span></p>
                </div>
                <DownloadBtn href={`/api/pdf/devis/${d.id}`} label="PDF" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Factures */}
      {data.factures.length > 0 && (
        <section>
          <h2 className="flex items-center gap-2 text-base font-semibold text-gray-100 mb-4">
            <Receipt className="h-5 w-5 text-green-400" />
            Factures
          </h2>
          <div className="space-y-2">
            {data.factures.map((f) => (
              <div key={f.id} className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800 px-4 py-3">
                <div>
                  <p className="font-medium text-gray-100 text-sm">{f.numero}</p>
                  <p className="text-xs text-gray-400">{formatDate(f.dateEmission)} · {fmtMoney(f.montantTTC)} · <span className="capitalize">{f.statut}</span></p>
                </div>
                <DownloadBtn href={`/api/pdf/facture/${f.id}`} label="PDF" />
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="flex items-center gap-2 text-xs text-gray-500 mt-4">
        <FileCheck className="h-3.5 w-3.5" />
        Tous les documents sont générés en PDF avec signature et date.
      </div>
    </div>
  );
}
