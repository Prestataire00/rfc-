"use client";

import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";

/**
 * 3 méthodes de signature, retournées via `onChange` au parent (ZoneFiller) :
 *  - canvas → base64 PNG data URL (dessin souris/tactile)
 *  - text   → texte brut. La conversion en image avec police cursive est faite côté
 *             serveur dans pdf-stamper.ts (Sprint 5) pour pas réinventer la roue
 *             dans le navigateur. On affiche un preview cursif en UI.
 *  - image  → base64 PNG/JPEG data URL (upload depuis disque)
 *
 * onChange(null) signifie "aucune signature valide actuellement" (canvas vide,
 * texte vide, ou aucune image uploadée).
 */

export interface SignatureResult {
  method: "canvas" | "text" | "image";
  dataUrl: string;
}

interface Props {
  defaultName?: string;
  onChange: (result: SignatureResult | null) => void;
}

export function SignatureMethodTabs({ defaultName = "", onChange }: Props) {
  const [tab, setTab] = useState<"canvas" | "text" | "image">("canvas");
  const padRef = useRef<SignatureCanvas | null>(null);
  const [textValue, setTextValue] = useState(defaultName);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);

  const emitCanvas = () => {
    const pad = padRef.current;
    if (!pad || pad.isEmpty()) {
      onChange(null);
      return;
    }
    onChange({ method: "canvas", dataUrl: pad.toDataURL("image/png") });
  };

  const emitText = (value: string) => {
    setTextValue(value);
    if (!value.trim()) {
      onChange(null);
      return;
    }
    onChange({ method: "text", dataUrl: value });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!["image/png", "image/jpeg"].includes(f.type)) {
      alert("Format non supporté (PNG ou JPEG uniquement)");
      return;
    }
    if (f.size > 2 * 1024 * 1024) {
      alert("Image trop volumineuse (max 2 Mo)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      setImageDataUrl(url);
      onChange({ method: "image", dataUrl: url });
    };
    reader.readAsDataURL(f);
  };

  return (
    <div className="border rounded-lg">
      <div className="flex border-b">
        {(["canvas", "text", "image"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm ${
              tab === t ? "border-b-2 border-blue-600 font-medium" : "text-gray-500"
            }`}
          >
            {t === "canvas" ? "Dessiner" : t === "text" ? "Taper" : "Importer image"}
          </button>
        ))}
      </div>
      <div className="p-4">
        {tab === "canvas" && (
          <>
            <SignatureCanvas
              ref={padRef}
              penColor="black"
              canvasProps={{
                width: 400,
                height: 150,
                className: "border rounded bg-white",
              }}
              onEnd={emitCanvas}
            />
            <button
              type="button"
              onClick={() => {
                padRef.current?.clear();
                onChange(null);
              }}
              className="mt-2 text-sm text-gray-500 underline"
            >
              Effacer
            </button>
          </>
        )}
        {tab === "text" && (
          <>
            <input
              type="text"
              value={textValue}
              onChange={(e) => emitText(e.target.value)}
              placeholder="Tapez votre nom"
              className="w-full p-2 border rounded"
            />
            {textValue && (
              <div
                className="mt-3 p-4 border rounded bg-white text-4xl"
                style={{ fontFamily: "var(--font-cursive), cursive" }}
              >
                {textValue}
              </div>
            )}
          </>
        )}
        {tab === "image" && (
          <>
            <input
              type="file"
              accept="image/png,image/jpeg"
              onChange={handleImageUpload}
            />
            {imageDataUrl && (
              <img
                src={imageDataUrl}
                alt="Aperçu signature"
                className="mt-3 max-h-32 border rounded bg-white"
              />
            )}
            <p className="mt-2 text-xs text-gray-500">
              PNG ou JPEG, max 2 Mo. Fond transparent recommandé pour un meilleur rendu.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
