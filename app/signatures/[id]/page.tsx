"use client";

import useSWR from "swr";
import { useParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { SignatureStatusBadge } from "@/components/signatures/SignatureStatusBadge";
import { AuditLogViewer } from "@/components/signatures/AuditLogViewer";

interface RequestDetail {
  id: string;
  titre: string;
  description: string | null;
  type: string;
  statut: string;
  createdAt: string;
  sentAt: string | null;
  signedAt: string | null;
  completedAt: string | null;
  expiresAt: string | null;
  originalFileSha256: string;
  signedFileSha256: string | null;
  originalPageCount: number;
  tsaTimestampedAt: string | null;
  zones: Array<{ id: string; page: number; type: string; required: boolean; filled: boolean }>;
  signataire: {
    nom: string;
    email: string;
    statut: string;
    signatureIp: string | null;
    signedAt: string | null;
  } | null;
}

const fetcher = (u: string) =>
  fetch(u).then((r) => {
    if (!r.ok) throw new Error(`${r.status}`);
    return r.json() as Promise<RequestDetail>;
  });

export default function DetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: r, mutate, error } = useSWR(`/api/signature-requests/${id}`, fetcher);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const send = async () => {
    if (!confirm("Envoyer la demande pour signature ?")) return;
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch(`/api/signature-requests/${id}/send`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? res.statusText);
      }
      await mutate();
    } catch (e) {
      setSendError((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  if (error) return <p className="container mx-auto p-6 text-red-700">Erreur</p>;
  if (!r) return <p className="container mx-auto p-6">Chargement…</p>;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-4">
        <Link href="/signatures" className="text-blue-600 text-sm">
          ← Liste des signatures
        </Link>
      </div>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">{r.titre}</h1>
          <SignatureStatusBadge statut={r.statut} />
        </div>
        {r.statut === "ready" && (
          <button
            onClick={send}
            disabled={sending}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {sending ? "Envoi…" : "Envoyer pour signature"}
          </button>
        )}
      </div>

      {sendError && (
        <div className="mb-4 p-3 border border-red-300 bg-red-50 text-red-800 rounded text-sm">
          {sendError}
        </div>
      )}

      <div className="grid grid-cols-2 gap-6 mt-6">
        <div>
          <h2 className="font-bold mb-2">Signataire</h2>
          {r.signataire ? (
            <>
              <p>
                {r.signataire.nom}{" "}
                <span className="text-gray-500">&lt;{r.signataire.email}&gt;</span>
              </p>
              <p className="text-sm text-gray-500">Statut : {r.signataire.statut}</p>
              {r.signataire.signedAt && (
                <p className="text-sm text-gray-500">
                  Signé le {new Date(r.signataire.signedAt).toLocaleString("fr-FR")}
                </p>
              )}
              {r.signataire.signatureIp && (
                <p className="text-xs text-gray-400">IP : {r.signataire.signatureIp}</p>
              )}
            </>
          ) : (
            <p className="text-gray-400">Non défini</p>
          )}
        </div>
        <div>
          <h2 className="font-bold mb-2">Document</h2>
          <p className="text-xs font-mono break-all">
            Hash original : {r.originalFileSha256}
          </p>
          {r.signedFileSha256 && (
            <p className="text-xs font-mono break-all">
              Hash signé : {r.signedFileSha256}
            </p>
          )}
          <p className="text-sm">Pages : {r.originalPageCount}</p>
          <p className="text-sm">
            Zones : {r.zones.length} ({r.zones.filter((z) => z.filled).length} remplies)
          </p>
          {r.tsaTimestampedAt && (
            <p className="text-sm text-green-700">
              Horodatage TSA : {new Date(r.tsaTimestampedAt).toLocaleString("fr-FR")}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mt-6 text-sm">
        <div>
          <h3 className="font-medium mb-1">Timeline</h3>
          <ul className="space-y-1 text-gray-600">
            <li>Créé : {new Date(r.createdAt).toLocaleString("fr-FR")}</li>
            {r.sentAt && <li>Envoyé : {new Date(r.sentAt).toLocaleString("fr-FR")}</li>}
            {r.signedAt && <li>Signé : {new Date(r.signedAt).toLocaleString("fr-FR")}</li>}
            {r.completedAt && (
              <li>Finalisé : {new Date(r.completedAt).toLocaleString("fr-FR")}</li>
            )}
            {r.expiresAt && (
              <li>Expire : {new Date(r.expiresAt).toLocaleString("fr-FR")}</li>
            )}
          </ul>
        </div>
        <div>
          {r.statut === "completed" && (
            <Link
              href={`/api/signature-requests/${r.id}/certificate`}
              className="text-blue-600 underline"
            >
              Télécharger le certificat de preuve
            </Link>
          )}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="font-bold mb-2">Audit log</h2>
        <AuditLogViewer requestId={r.id} />
      </div>
    </div>
  );
}
