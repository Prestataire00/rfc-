"use client";

import { useRef, useState } from "react";
import { PdfViewer } from "./PdfViewer";
import { pixelsToPoints, pointsToPixels, type ZoneCoords } from "@/lib/signatures/zones";

/**
 * Overlay drag-drop par-dessus PdfViewer pour placer des zones de signature.
 *
 * - Coordonnées stockées en POINTS PDF (origine haut-gauche) — pas en pixels écran.
 * - On reçoit `scale` du PdfViewer et on convertit lors du drag pour cohérence BD.
 * - Pas de drag-to-move ni resize en V1 : suppression + recréation (KISS).
 *
 * Le caller passe `onChange(zones)` et reçoit la liste à jour à chaque mutation.
 */

export interface DesignerZone extends ZoneCoords {
  /** id local (préfixé `tmp-`) tant que pas persisté en BD */
  id: string;
  page: number;
  type: "signature" | "initials" | "date" | "text";
  label?: string;
}

interface Props {
  fileUrl: string;
  initialZones?: DesignerZone[];
  scale?: number;
  onChange: (zones: DesignerZone[]) => void;
}

export function SignatureZoneDesigner({
  fileUrl,
  initialZones = [],
  scale = 1.5,
  onChange,
}: Props) {
  const [zones, setZones] = useState<DesignerZone[]>(initialZones);
  const dragStart = useRef<{ xPx: number; yPx: number; page: number } | null>(null);

  const update = (next: DesignerZone[]) => {
    setZones(next);
    onChange(next);
  };

  const handleMouseDown = (e: React.MouseEvent, page: number) => {
    const overlay = e.currentTarget.getBoundingClientRect();
    dragStart.current = {
      xPx: e.clientX - overlay.left,
      yPx: e.clientY - overlay.top,
      page,
    };
  };

  const handleMouseUp = (e: React.MouseEvent, page: number) => {
    if (!dragStart.current || dragStart.current.page !== page) return;
    const overlay = e.currentTarget.getBoundingClientRect();
    const endX = e.clientX - overlay.left;
    const endY = e.clientY - overlay.top;
    const pixels: ZoneCoords = {
      x: Math.min(dragStart.current.xPx, endX),
      y: Math.min(dragStart.current.yPx, endY),
      width: Math.abs(endX - dragStart.current.xPx),
      height: Math.abs(endY - dragStart.current.yPx),
    };
    dragStart.current = null;
    // Rejette les clics simples sans drag (zone < 20×10 px).
    if (pixels.width < 20 || pixels.height < 10) return;

    const points = pixelsToPoints(pixels, scale);
    const id = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    update([
      ...zones,
      { id, page, ...points, type: "signature", label: `Signature page ${page}` },
    ]);
  };

  const removeZone = (id: string) => update(zones.filter((z) => z.id !== id));

  return (
    <PdfViewer fileUrl={fileUrl} scale={scale}>
      {({ pageNumber }) => {
        const pageZones = zones.filter((z) => z.page === pageNumber);
        return (
          <div
            className="absolute inset-0"
            style={{ cursor: "crosshair" }}
            onMouseDown={(e) => handleMouseDown(e, pageNumber)}
            onMouseUp={(e) => handleMouseUp(e, pageNumber)}
          >
            {pageZones.map((z) => {
              const px = pointsToPixels(z, scale);
              return (
                <div
                  key={z.id}
                  className="absolute border-2 border-blue-500 bg-blue-500/20 group"
                  style={{ left: px.x, top: px.y, width: px.width, height: px.height }}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <span className="absolute -top-5 left-0 text-xs bg-blue-500 text-white px-1 rounded whitespace-nowrap">
                    {z.label}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeZone(z.id);
                    }}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-xs leading-none opacity-0 group-hover:opacity-100"
                    aria-label="Supprimer la zone"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        );
      }}
    </PdfViewer>
  );
}
