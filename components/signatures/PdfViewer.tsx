"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Rend un PDF page par page comme <canvas> via pdfjs-dist.
 *
 * Le composant prend un fileUrl (blob URL local ou signed URL Supabase) et
 * peint chaque page sur un canvas. Les enfants reçoivent en render prop le
 * pageNumber + le canvas DOM + le scale courant — utile pour superposer un
 * overlay React (placement des zones, surbrillance zones à signer, etc).
 *
 * Worker pdfjs servi depuis /public/pdf.worker.min.mjs.
 */

export interface PageInfo {
  pageNumber: number;
  canvas: HTMLCanvasElement;
  scale: number;
  pageWidth: number;
  pageHeight: number;
}

interface Props {
  fileUrl: string;
  scale?: number;
  onPagesLoaded?: (count: number, pages: PageInfo[]) => void;
  children?: (ctx: PageInfo) => React.ReactNode;
}

export function PdfViewer({ fileUrl, scale = 1.5, onPagesLoaded, children }: Props) {
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const cellRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const doc = await pdfjs.getDocument(fileUrl).promise;
        const out: PageInfo[] = [];
        for (let i = 1; i <= doc.numPages; i++) {
          if (cancelled) return;
          const page = await doc.getPage(i);
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvas, viewport }).promise;
          out.push({
            pageNumber: i,
            canvas,
            scale,
            pageWidth: viewport.width,
            pageHeight: viewport.height,
          });
        }
        if (!cancelled) {
          setPages(out);
          onPagesLoaded?.(out.length, out);
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fileUrl, scale, onPagesLoaded]);

  // Mount les canvases dans le DOM (impératif, car ils sont créés en JS).
  useEffect(() => {
    pages.forEach((p, idx) => {
      const cell = cellRefs.current[idx];
      if (!cell) return;
      cell.innerHTML = "";
      cell.appendChild(p.canvas);
    });
  }, [pages]);

  if (error) {
    return (
      <div className="p-4 border border-red-300 bg-red-50 text-red-800 rounded">
        Erreur de chargement PDF : {error}
      </div>
    );
  }

  return (
    <div className="pdf-viewer space-y-4">
      {pages.map((p, idx) => (
        <div
          key={p.pageNumber}
          className="relative inline-block shadow border border-gray-300"
          style={{ width: p.pageWidth, height: p.pageHeight }}
        >
          <div
            ref={(el) => {
              cellRefs.current[idx] = el;
            }}
            data-page={p.pageNumber}
          />
          {children && (
            <div className="absolute inset-0" data-overlay-page={p.pageNumber}>
              {children(p)}
            </div>
          )}
        </div>
      ))}
      {pages.length === 0 && !error && (
        <div className="p-8 text-gray-400 text-sm">Chargement du PDF…</div>
      )}
    </div>
  );
}
