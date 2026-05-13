"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";

interface VerifyMatch {
  id: string;
  titre: string;
  signedAt: string | null;
  completedAt: string | null;
  hasTimestamp: boolean;
  auditValid: boolean;
  auditBrokenAt?: string;
}

interface VerifyResponse {
  fileHash: string;
  fileSize: number;
  matchFound: boolean;
  match: VerifyMatch | null;
}

/**
 * Page publique de vérification d'intégrité d'un PDF signé.
 *
 * Accessible via :
 *  - lien direct /verify (saisie manuelle du PDF)
 *  - QR code sur le certificat de preuve (/verify?id=cuid-xxx → lookup direct)
 *
 * Le hash SHA-256 du fichier uploadé est calculé côté serveur. Si match en BD
 * (signedFileSha256 + statut completed), on confirme l'intégrité et on vérifie
 * également la chaîne audit log. Sinon → fichier non reconnu (modifié ou inconnu).
 */
export default function VerifyPage() {
  const params = useSearchParams();
  const presetRequestId = params.get("id") ?? "";
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const fd = new FormData(e.currentTarget);
      const res = await fetch("/api/signature-requests/verify", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? res.statusText);
      }
      setResult(await res.json());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">Vérifier un document signé</h1>
      <p className="text-sm text-gray-600 mb-6">
        Uploadez un PDF signé par Rescue Formation Conseil pour vérifier son
        intégrité (hash SHA-256), son audit log et son horodatage TSA.
        Aucune donnée n&apos;est conservée par cette page.
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <input type="hidden" name="requestId" defaultValue={presetRequestId} />
        <input
          type="file"
          name="file"
          accept="application/pdf"
          required
          className="block"
        />
        <button
          type="submit"
          disabled={busy}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {busy ? "Vérification…" : "Vérifier"}
        </button>
      </form>

      {error && (
        <div className="mt-6 p-3 border border-red-300 bg-red-50 text-red-800 rounded text-sm">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-6 p-4 border rounded">
          <p className="font-mono text-xs break-all">
            Hash SHA-256 : <span className="font-semibold">{result.fileHash}</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Taille : {(result.fileSize / 1024).toFixed(1)} Ko
          </p>

          {result.matchFound && result.match ? (
            <div className="mt-4 text-green-800 bg-green-50 border border-green-300 rounded p-3 space-y-1 text-sm">
              <p>
                <span className="font-bold">✓ Document reconnu</span> — &laquo;&nbsp;{result.match.titre}&nbsp;&raquo;
              </p>
              <p>Signé le : {result.match.signedAt ? new Date(result.match.signedAt).toLocaleString("fr-FR") : "-"}</p>
              <p>Finalisé le : {result.match.completedAt ? new Date(result.match.completedAt).toLocaleString("fr-FR") : "-"}</p>
              <p>
                Horodatage TSA :{" "}
                {result.match.hasTimestamp ? "✓ présent (FreeTSA RFC 3161)" : "absent"}
              </p>
              <p>
                Audit log :{" "}
                {result.match.auditValid
                  ? "✓ intact"
                  : `✗ corrompu (event ${result.match.auditBrokenAt ?? "?"})`}
              </p>
            </div>
          ) : (
            <div className="mt-4 text-red-800 bg-red-50 border border-red-300 rounded p-3 text-sm">
              <p className="font-bold">✗ Document non reconnu</p>
              <p className="mt-1">
                Ce hash ne correspond à aucun document signé connu. Le fichier a
                peut-être été modifié, ou il ne provient pas de Rescue Formation
                Conseil.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
