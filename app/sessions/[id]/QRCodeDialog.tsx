"use client";

import { QrCode, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inscriptionLink: string;
  sessionId: string;
  formationTitre?: string;
  dateDebut?: string;
  dateFin?: string;
};

export function QRCodeDialog({
  open,
  onOpenChange,
  inscriptionLink,
  sessionId,
  formationTitre,
  dateDebut,
  dateFin,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-purple-400" />
            QR Code d&apos;inscription
          </DialogTitle>
        </DialogHeader>
        {inscriptionLink ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="bg-white p-4 rounded-xl" id="qr-print-zone">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(inscriptionLink)}&bgcolor=ffffff&color=000000&margin=10`}
                alt="QR Code inscription"
                width={300}
                height={300}
              />
              <p className="text-center text-xs text-gray-600 mt-2 font-medium">
                {formationTitre}
              </p>
              <p className="text-center text-xs text-gray-400">
                {formatDate(dateDebut || "")} → {formatDate(dateFin || "")}
              </p>
            </div>
            <p className="text-sm text-gray-400 text-center">
              Scannez ce QR code pour vous inscrire à la session
            </p>
            <code className="text-xs bg-gray-900 px-3 py-2 rounded border border-gray-700 text-gray-400 max-w-full break-all text-center">
              {inscriptionLink}
            </code>
            <div className="flex gap-3">
              <a
                href={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(inscriptionLink)}&bgcolor=ffffff&color=000000&margin=10`}
                download={`qr-inscription-${sessionId}.png`}
                className="inline-flex items-center gap-1.5 rounded-md bg-purple-700 hover:bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors"
              >
                <Download className="h-4 w-4" /> Télécharger
              </a>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-600 bg-gray-800 hover:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-300 transition-colors"
              >
                <FileText className="h-4 w-4" /> Imprimer
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
