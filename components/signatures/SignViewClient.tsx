"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PdfViewer } from "./PdfViewer";
import { ZoneFiller } from "./ZoneFiller";
import { pointsToPixels } from "@/lib/signatures/zones";

interface Zone {
  id: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: string;
  label: string | null;
  required?: boolean;
}

interface Props {
  token: string;
  titre: string;
  signataireNom: string;
  fileUrl: string;
  zones: Zone[];
}

type ZoneState = Zone & {
  filled: boolean;
  value: string | null;
  method: "canvas" | "text" | "image" | null;
};

/**
 * Vue signataire publique (Sprint 4 : interactive).
 *
 * - Clic sur une zone surlignée → ZoneFiller s'ouvre (3 onglets canvas/texte/image)
 * - Toutes les zones requises remplies + checkbox CGV → bouton "Confirmer" actif
 * - Confirm → POST /api/sign/[token]/submit (persiste valeurs + transition viewed→signed)
 *   puis redirect /sign/[token]/success
 * - Bouton "Refuser de signer" → POST /api/sign/[token]/decline avec motif
 *   puis redirect /sign/[token]/expired
 */
export function SignViewClient({
  token,
  titre,
  signataireNom,
  fileUrl,
  zones: initialZones,
}: Props) {
  const router = useRouter();
  const [zones, setZones] = useState<ZoneState[]>(
    initialZones.map((z) => ({
      ...z,
      required: z.required ?? true,
      filled: false,
      value: null,
      method: null,
    })),
  );
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null);
  const [cgvOk, setCgvOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allRequiredFilled = zones
    .filter((z) => z.required)
    .every((z) => z.filled && z.value);

  const handleConfirm = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/sign/${token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zones: zones
            .filter((z) => z.filled && z.value && z.method)
            .map((z) => ({ id: z.id, value: z.value, method: z.method })),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? res.statusText);
      }
      router.push(`/sign/${token}/success`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  const handleDecline = async () => {
    const reason = prompt("Motif du refus (optionnel) :") ?? "";
    if (reason === null) return; // user cancelled prompt
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/sign/${token}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? res.statusText);
      }
      router.push(`/sign/${token}/expired`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  const activeZone = zones.find((z) => z.id === activeZoneId);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-xl font-bold mb-2">{titre}</h1>
      <p className="text-sm text-gray-600 mb-4">
        Bonjour {signataireNom}, cliquez sur chaque zone surlignée pour apposer
        votre signature.
      </p>

      {error && (
        <div className="mb-4 p-3 border border-red-300 bg-red-50 text-red-800 rounded text-sm">
          {error}
        </div>
      )}

      <PdfViewer fileUrl={fileUrl} scale={1.5}>
        {({ pageNumber }) => (
          <div className="absolute inset-0">
            {zones
              .filter((z) => z.page === pageNumber)
              .map((z) => {
                const px = pointsToPixels(z, 1.5);
                return (
                  <button
                    key={z.id}
                    type="button"
                    onClick={() => setActiveZoneId(z.id)}
                    className={`absolute border-2 flex items-center justify-center text-xs font-medium transition-colors ${
                      z.filled
                        ? "border-green-500 bg-green-100/70 text-green-900"
                        : "border-yellow-500 bg-yellow-100/60 text-yellow-900 hover:bg-yellow-200"
                    }`}
                    style={{
                      left: px.x,
                      top: px.y,
                      width: px.width,
                      height: px.height,
                    }}
                  >
                    {z.filled ? "✓ Signé" : (z.label ?? "Signer ici")}
                  </button>
                );
              })}
          </div>
        )}
      </PdfViewer>

      <ZoneFiller
        open={!!activeZone}
        zoneLabel={activeZone?.label ?? "Signature"}
        defaultName={signataireNom}
        onClose={() => setActiveZoneId(null)}
        onConfirm={(result) => {
          setZones(
            zones.map((z) =>
              z.id === activeZoneId
                ? { ...z, filled: true, value: result.dataUrl, method: result.method }
                : z,
            ),
          );
          setActiveZoneId(null);
        }}
      />

      <div className="mt-6 border-t pt-4 space-y-3">
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={cgvOk}
            onChange={(e) => setCgvOk(e.target.checked)}
            className="mt-1"
          />
          <span>
            J&apos;accepte de signer électroniquement ce document. Je reconnais que
            cette signature (signature électronique simple renforcée au sens du
            règlement eIDAS) m&apos;engage juridiquement et que l&apos;intégrité du
            document est protégée par hash SHA-256 et horodatage TSA.
          </span>
        </label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!allRequiredFilled || !cgvOk || busy}
            className="px-6 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {busy ? "Envoi…" : "Confirmer ma signature"}
          </button>
          <button
            type="button"
            onClick={handleDecline}
            disabled={busy}
            className="px-4 py-2 text-red-600 underline"
          >
            Refuser de signer
          </button>
        </div>
      </div>
    </div>
  );
}
