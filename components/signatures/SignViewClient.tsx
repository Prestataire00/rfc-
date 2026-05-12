"use client";

import { PdfViewer } from "./PdfViewer";
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
}

interface Props {
  titre: string;
  signataireNom: string;
  fileUrl: string;
  zones: Zone[];
}

/**
 * Vue signataire publique (Sprint 3) — lecture seule.
 *
 * Le PDF est rendu via PdfViewer, et chaque zone à signer est surlignée en jaune
 * avec son label. La capture de signature (canvas/texte/image) viendra au Sprint 4
 * via un onClick sur chaque zone + modal ZoneFiller.
 */
export function SignViewClient({ titre, signataireNom, fileUrl, zones }: Props) {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-xl font-bold mb-2">{titre}</h1>
      <p className="text-sm text-gray-600 mb-4">
        Bonjour {signataireNom}, voici le document que vous êtes invité à signer.
        Les zones en jaune sont les emplacements de signature requis. La fonction
        de signature sera disponible prochainement.
      </p>

      <PdfViewer fileUrl={fileUrl} scale={1.5}>
        {({ pageNumber }) => (
          <div className="absolute inset-0 pointer-events-none">
            {zones
              .filter((z) => z.page === pageNumber)
              .map((z) => {
                const px = pointsToPixels(z, 1.5);
                return (
                  <div
                    key={z.id}
                    className="absolute border-2 border-yellow-500 bg-yellow-100/60 flex items-center justify-center text-xs font-medium text-yellow-900"
                    style={{
                      left: px.x,
                      top: px.y,
                      width: px.width,
                      height: px.height,
                    }}
                  >
                    {z.label ?? "Signature requise"}
                  </div>
                );
              })}
          </div>
        )}
      </PdfViewer>

      <p className="mt-6 text-xs text-gray-400">
        Document protégé par signature électronique simple renforcée
        (hash SHA-256 + horodatage TSA RFC 3161 + audit log chaîné).
      </p>
    </div>
  );
}
