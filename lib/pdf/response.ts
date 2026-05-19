// Helper Audit 2026-05-19 §3.6 : factorisation du pattern dupliqué
// 12 routes /api/pdf/** répétaient :
//   new NextResponse(buffer as unknown as BodyInit, { headers: {...} })
// On centralise ici pour appliquer une seule fois le cast nécessaire
// (Buffer NodeJS → BodyInit) et standardiser les headers PDF.

import { NextResponse } from "next/server";

export type PdfDisposition = "inline" | "attachment";

/**
 * Renvoie un buffer PDF en NextResponse avec les headers HTTP standard.
 *
 * @param buffer    Buffer PDF généré (pdfmake, etc.)
 * @param filename  Nom du fichier (sans extension)
 * @param disposition "inline" (par défaut : ouvre dans navigateur)
 *                    ou "attachment" (force le téléchargement)
 */
export function pdfResponse(
  buffer: Buffer,
  filename: string,
  disposition: PdfDisposition = "inline",
): NextResponse {
  const safeName = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${safeName}"`,
      // Cache-Control : empêche les proxies/CDN de cacher les PDF générés
      // (peuvent contenir des données personnelles : NSS, contact, etc.)
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}
