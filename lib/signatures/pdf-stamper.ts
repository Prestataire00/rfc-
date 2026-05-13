/**
 * Stamper de signatures sur PDF — Sprint 5.
 *
 * Prend le PDF original + la liste des zones remplies, retourne un nouveau PDF
 * avec les signatures embeddées :
 *  - method "canvas" / "image" : embedPng ou embedJpg à partir du dataURL base64
 *  - method "text"             : embed la police Dancing Script (cursive) + drawText
 *  - type "date" (rare) : drawText Helvetica avec date du jour si value vide
 *
 * Convention coords : SignatureZone stocke en points PDF (72 dpi) avec origine
 * haut-gauche (comme PDF.js viewport). pdf-lib travaille en bas-gauche → flip Y
 * en fonction de page.getHeight() ici.
 */
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { readFileSync } from "node:fs";
import path from "node:path";

export interface SignatureFill {
  page: number; // 1-indexed
  x: number;
  y: number;
  width: number;
  height: number;
  type: "signature" | "initials" | "date" | "text";
  method: "canvas" | "text" | "image";
  value: string;
}

let cachedCursive: Buffer | null = null;
function loadCursiveFont(): Buffer {
  if (cachedCursive) return cachedCursive;
  cachedCursive = readFileSync(
    path.join(process.cwd(), "public/fonts/DancingScript-Regular.ttf"),
  );
  return cachedCursive;
}

function dataUrlToBuffer(dataUrl: string): { buf: Buffer; isJpeg: boolean } {
  const isJpeg = /^data:image\/jpe?g/i.test(dataUrl);
  const base64 = dataUrl.replace(/^data:image\/(png|jpe?g);base64,/i, "");
  return { buf: Buffer.from(base64, "base64"), isJpeg };
}

export async function stampSignatures(
  originalPdf: Buffer,
  fills: SignatureFill[],
): Promise<Buffer> {
  const pdf = await PDFDocument.load(originalPdf);
  pdf.registerFontkit(fontkit);
  const pages = pdf.getPages();

  // Lazy embeds — on n'embed que ce dont on a besoin.
  let cursiveFont: Awaited<ReturnType<typeof pdf.embedFont>> | null = null;
  let helveticaFont: Awaited<ReturnType<typeof pdf.embedFont>> | null = null;

  for (const fill of fills) {
    const page = pages[fill.page - 1];
    if (!page) throw new Error(`Page ${fill.page} introuvable dans le PDF`);
    const pageHeight = page.getHeight();
    // Flip Y vers le repère bas-gauche du PDF.
    const yPdf = pageHeight - fill.y - fill.height;

    if (fill.method === "image" || fill.method === "canvas") {
      const { buf, isJpeg } = dataUrlToBuffer(fill.value);
      const img = isJpeg ? await pdf.embedJpg(buf) : await pdf.embedPng(buf);
      page.drawImage(img, {
        x: fill.x,
        y: yPdf,
        width: fill.width,
        height: fill.height,
      });
      continue;
    }

    if (fill.method === "text") {
      if (!cursiveFont) cursiveFont = await pdf.embedFont(loadCursiveFont());
      // Taille = 60% de la hauteur zone, plafonnée à 24pt pour rester lisible.
      const size = Math.min(fill.height * 0.6, 24);
      page.drawText(fill.value, {
        x: fill.x + 4,
        y: yPdf + fill.height * 0.3,
        font: cursiveFont,
        size,
        color: rgb(0, 0, 0),
      });
      continue;
    }

    // type=date avec method != text/image/canvas (cas marginal V1) → date du jour.
    if (!helveticaFont) helveticaFont = await pdf.embedFont(StandardFonts.Helvetica);
    const text = fill.value?.trim() || new Date().toLocaleDateString("fr-FR");
    page.drawText(text, {
      x: fill.x + 4,
      y: yPdf + 4,
      font: helveticaFont,
      size: 10,
      color: rgb(0, 0, 0),
    });
  }

  const bytes = await pdf.save();
  return Buffer.from(bytes);
}
