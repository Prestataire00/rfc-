"use client";

import { useState } from "react";
import { QrCode, X, Download, Copy, CheckCircle2 } from "lucide-react";

type Props = {
  token: string;
  date: string;
  creneau: string;
  formationTitre?: string;
};

export function QrCodePresence({ token, date, creneau, formationTitre }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const url = `${baseUrl}/emargement/${token}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}&bgcolor=ffffff&color=000000&margin=10`;
  const qrUrlHd = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(url)}&bgcolor=ffffff&color=000000&margin=10`;

  const creneauLabel = creneau === "matin" ? "Matin" : "Apres-midi";

  const copyLink = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-md border border-gray-600 bg-gray-800 px-2.5 py-1.5 text-xs text-gray-300 hover:bg-gray-700"
      >
        <QrCode className="h-3.5 w-3.5" /> QR {creneauLabel}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setOpen(false)}>
      <div className="bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-gray-100">QR Code Emargement</h3>
            <p className="text-xs text-gray-400">{date} — {creneauLabel}</p>
            {formationTitre && <p className="text-xs text-gray-500 mt-0.5">{formationTitre}</p>}
          </div>
          <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="bg-white rounded-lg p-4 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrUrl} alt="QR Code emargement" width={260} height={260} className="rounded" />
        </div>

        <p className="text-[10px] text-gray-500 text-center mt-2">
          Les stagiaires scannent ce QR pour signer leur feuille de presence.
        </p>

        <div className="mt-4 flex gap-2">
          <button
            onClick={copyLink}
            className="flex-1 inline-flex items-center justify-center gap-1 rounded-md border border-gray-600 bg-gray-900 px-3 py-2 text-xs text-gray-300 hover:bg-gray-700"
          >
            {copied ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copie" : "Copier le lien"}
          </button>
          <a
            href={qrUrlHd}
            download={`qr-emargement-${date}-${creneau}.png`}
            className="flex-1 inline-flex items-center justify-center gap-1 rounded-md bg-red-600 hover:bg-red-700 px-3 py-2 text-xs text-white"
          >
            <Download className="h-3 w-3" /> Telecharger
          </a>
        </div>
      </div>
    </div>
  );
}
