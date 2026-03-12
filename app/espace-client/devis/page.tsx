"use client";

import { useState, useEffect, useRef } from "react";
import { FileText, PenTool, X, Check } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatutBadge } from "@/components/shared/StatutBadge";
import { DEVIS_STATUTS } from "@/lib/constants";
import { formatDate, formatCurrency } from "@/lib/utils";

type Devis = {
  id: string;
  numero: string;
  objet: string;
  statut: string;
  montantHT: number;
  montantTTC: number;
  dateEmission: string;
  dateValidite: string;
  dateSigne: string | null;
  signatureUrl: string | null;
};

export default function ClientDevisPage() {
  const [devisList, setDevisList] = useState<Devis[]>([]);
  const [loading, setLoading] = useState(true);
  const [signingId, setSigningId] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);

  useEffect(() => {
    fetch("/api/client/devis")
      .then((r) => r.json())
      .then((d) => { setDevisList(d); setLoading(false); });
  }, []);

  // Canvas drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    isDrawingRef.current = true;
    const ctx = canvas.getContext("2d")!;
    ctx.beginPath();
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1e293b";
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const isCanvasEmpty = () => {
    const canvas = canvasRef.current;
    if (!canvas) return true;
    const ctx = canvas.getContext("2d")!;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    return !data.some((channel, i) => i % 4 === 3 && channel !== 0);
  };

  const handleSign = async () => {
    if (!signingId || isCanvasEmpty()) return;
    setSigning(true);

    const canvas = canvasRef.current!;
    const signatureDataUrl = canvas.toDataURL("image/png");

    await fetch(`/api/devis/${signingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        statut: "signe",
        dateSigne: new Date().toISOString(),
        signatureUrl: signatureDataUrl,
      }),
    });

    const res = await fetch("/api/client/devis");
    if (res.ok) setDevisList(await res.json());
    setSigningId(null);
    setSigning(false);
  };

  return (
    <div>
      <PageHeader title="Nos Devis" description="Consultez et signez vos devis" />

      {loading ? (
        <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>
      ) : devisList.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>Aucun devis</p>
        </div>
      ) : (
        <div className="space-y-4">
          {devisList.map((d) => {
            const st = DEVIS_STATUTS[d.statut as keyof typeof DEVIS_STATUTS];
            return (
              <div key={d.id} className="rounded-lg border bg-white p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-mono text-sm text-gray-500">{d.numero}</span>
                      {st && <StatutBadge label={st.label} color={st.color} />}
                    </div>
                    <h3 className="font-semibold text-gray-900">{d.objet}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Emis le {formatDate(d.dateEmission)} - Valide jusqu&apos;au {formatDate(d.dateValidite)}
                    </p>
                    {d.dateSigne && <p className="text-xs text-green-600 mt-1">Signe le {formatDate(d.dateSigne)}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(d.montantTTC)}</p>
                    <p className="text-xs text-gray-500">HT: {formatCurrency(d.montantHT)}</p>
                    {d.statut === "envoye" && (
                      <button
                        onClick={() => setSigningId(d.id)}
                        className="mt-2 flex items-center gap-1.5 rounded-md bg-green-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-green-700 ml-auto"
                      >
                        <PenTool className="h-3.5 w-3.5" />
                        Signer le devis
                      </button>
                    )}
                    {d.statut === "signe" && d.signatureUrl && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-400 mb-1">Signature :</p>
                        <img src={d.signatureUrl} alt="Signature" className="h-12 ml-auto border rounded" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Signature Modal */}
      {signingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 text-lg flex items-center gap-2">
                <PenTool className="h-5 w-5 text-green-600" />
                Signature electronique
              </h3>
              <button onClick={() => setSigningId(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-gray-500">
              En signant ce devis, vous acceptez les termes et conditions decrits dans le document.
              Dessinez votre signature ci-dessous :
            </p>

            <div className="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-gray-50">
              <canvas
                ref={canvasRef}
                width={460}
                height={180}
                className="w-full cursor-crosshair touch-none"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={clearCanvas}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Effacer
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setSigningId(null)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSign}
                  disabled={signing}
                  className="flex items-center gap-2 px-6 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  {signing ? "Signature..." : "Valider et signer"}
                </button>
              </div>
            </div>

            <p className="text-xs text-gray-400 text-center">
              Cette signature a valeur d&apos;engagement contractuel. Date : {new Date().toLocaleDateString("fr-FR")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
