"use client";

import { useState } from "react";
import { SignatureMethodTabs, type SignatureResult } from "./SignatureMethodTabs";

interface Props {
  open: boolean;
  zoneLabel: string;
  defaultName?: string;
  onClose: () => void;
  onConfirm: (result: SignatureResult) => void;
}

/**
 * Modal qui s'ouvre au clic sur une zone à signer dans la vue publique.
 * Wrap SignatureMethodTabs + boutons Annuler/Valider.
 *
 * onConfirm est appelé avec le SignatureResult (canvas dataUrl / text / image dataUrl)
 * que le parent SignViewClient stocke dans son état local. La persistance en BD se
 * fait au moment du clic final "Confirmer ma signature" (POST submit).
 */
export function ZoneFiller({
  open,
  zoneLabel,
  defaultName,
  onClose,
  onConfirm,
}: Props) {
  const [result, setResult] = useState<SignatureResult | null>(null);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold mb-4">{zoneLabel}</h2>
        <SignatureMethodTabs defaultName={defaultName} onChange={setResult} />
        <div className="flex justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={() => {
              setResult(null);
              onClose();
            }}
            className="px-4 py-2 text-gray-600"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => {
              if (result) {
                onConfirm(result);
                setResult(null);
              }
            }}
            disabled={!result}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            Valider
          </button>
        </div>
      </div>
    </div>
  );
}
