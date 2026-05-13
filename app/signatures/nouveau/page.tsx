"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  SignatureZoneDesigner,
  type DesignerZone,
} from "@/components/signatures/SignatureZoneDesigner";

/**
 * Page admin de création d'une demande de signature :
 * 1) Upload PDF + saisie titre → POST /api/signature-requests crée la SignatureRequest
 * 2) Placement zones drag-drop sur PdfViewer
 * 3) Saisie signataire (email + nom)
 * 4) PATCH /api/signature-requests/[id] sauvegarde zones + signataire + statut "ready"
 * 5) Redirection vers /signatures/[id] (page détail Sprint 6)
 *
 * Le PDF est tenu côté client (blob URL) jusqu'à la sauvegarde finale.
 */
export default function NouveauSignaturePage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [fileBlobUrl, setFileBlobUrl] = useState<string | null>(null);
  const [titre, setTitre] = useState("");
  const [zones, setZones] = useState<DesignerZone[]>([]);
  const [signataireEmail, setSignataireEmail] = useState("");
  const [signataireNom, setSignataireNom] = useState("");
  const [requestId, setRequestId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type !== "application/pdf") {
      setError("Seuls les PDFs sont acceptés");
      return;
    }
    setError(null);
    setFile(f);
    setFileBlobUrl(URL.createObjectURL(f));
  };

  const handleUpload = async () => {
    if (!file || !titre.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("titre", titre.trim());
      const res = await fetch("/api/signature-requests", { method: "POST", body: fd });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? res.statusText);
      const data = await res.json();
      setRequestId(data.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    if (!requestId) return;
    if (zones.length === 0) {
      setError("Placez au moins une zone de signature");
      return;
    }
    if (!signataireEmail.trim() || !signataireNom.trim()) {
      setError("Email et nom du signataire requis");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/signature-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zones: zones.map((z) => ({
            page: z.page,
            x: z.x,
            y: z.y,
            width: z.width,
            height: z.height,
            type: z.type,
            label: z.label,
          })),
          signataire: { email: signataireEmail.trim(), nom: signataireNom.trim() },
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? res.statusText);
      router.push(`/signatures/${requestId}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <h1 className="text-2xl font-bold mb-6">Nouvelle demande de signature</h1>

      {error && (
        <div className="mb-4 p-3 border border-red-300 bg-red-50 text-red-800 rounded text-sm">
          {error}
        </div>
      )}

      {!requestId && (
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Titre du document"
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            className="w-full p-2 border rounded"
          />
          <input type="file" accept="application/pdf" onChange={handleFileChange} />
          {fileBlobUrl && file && (
            <p className="text-sm text-gray-500">
              {file.name} — {(file.size / 1024 / 1024).toFixed(2)} Mo
            </p>
          )}
          <button
            onClick={handleUpload}
            disabled={!file || !titre.trim() || busy}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {busy ? "Upload…" : "Uploader et placer les zones"}
          </button>
        </div>
      )}

      {requestId && fileBlobUrl && (
        <>
          <p className="text-sm text-gray-500 mb-3">
            Tracez les zones de signature sur le PDF en cliquant et glissant.
            Survolez une zone pour la supprimer.
          </p>
          <SignatureZoneDesigner fileUrl={fileBlobUrl} onChange={setZones} />

          <div className="mt-6 space-y-4 max-w-md">
            <input
              type="email"
              placeholder="Email du signataire"
              value={signataireEmail}
              onChange={(e) => setSignataireEmail(e.target.value)}
              className="w-full p-2 border rounded"
            />
            <input
              type="text"
              placeholder="Nom du signataire"
              value={signataireNom}
              onChange={(e) => setSignataireNom(e.target.value)}
              className="w-full p-2 border rounded"
            />
            <p className="text-xs text-gray-500">
              {zones.length} zone{zones.length > 1 ? "s" : ""} placée{zones.length > 1 ? "s" : ""}
            </p>
            <button
              onClick={handleSave}
              disabled={busy || zones.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
            >
              {busy ? "Sauvegarde…" : "Sauvegarder et continuer"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
