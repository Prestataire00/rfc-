/**
 * Conversions pixels écran ↔ points PDF (72 dpi) pour le placement des zones de signature.
 *
 * Pourquoi : pdfjs-dist rend en pixels (avec un scale arbitraire), pdf-lib travaille
 * en points (unité PDF universelle). On stocke en BD en points pour être indépendant
 * de la résolution d'écran. L'origine reste haut-gauche dans cette représentation —
 * la conversion vers le repère bas-gauche PDF se fait dans pdf-stamper.ts (Sprint 5)
 * avec la hauteur de page connue à ce moment-là.
 */

export interface ZoneCoords {
  x: number;
  y: number;
  width: number;
  height: number;
}

function assertScale(scale: number): void {
  if (!scale || scale <= 0) {
    throw new Error("scale must be > 0");
  }
}

export function pixelsToPoints(z: ZoneCoords, scale: number): ZoneCoords {
  assertScale(scale);
  return {
    x: z.x / scale,
    y: z.y / scale,
    width: z.width / scale,
    height: z.height / scale,
  };
}

export function pointsToPixels(z: ZoneCoords, scale: number): ZoneCoords {
  assertScale(scale);
  return {
    x: z.x * scale,
    y: z.y * scale,
    width: z.width * scale,
    height: z.height * scale,
  };
}
