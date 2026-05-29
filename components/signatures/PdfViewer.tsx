"use client";

import { useEffect, useRef, useState } from "react";

// Memoize pdfjs entre les mounts — évite de re-télécharger le bundle (~500 Ko)
// si l'utilisateur navigue puis revient sur une vue contenant un PDF.
let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;
async function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then((mod) => {
      mod.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      return mod;
    });
  }
  return pdfjsPromise;
}

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
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cellRefs = useRef<Array<HTMLDivElement | null>>([]);
  // Stocke onPagesLoaded en ref pour ne pas relancer toute la pipeline de
  // render PDF à chaque re-render du parent qui changerait l'identité du callback.
  const onPagesLoadedRef = useRef(onPagesLoaded);
  onPagesLoadedRef.current = onPagesLoaded;

  useEffect(() => {
    let cancelled = false;
    setPages([]);
    setTotalPages(null);
    setError(null);
    (async () => {
      try {
        const pdfjs = await loadPdfjs();
        const doc = await pdfjs.getDocument(fileUrl).promise;
        if (cancelled) return;
        setTotalPages(doc.numPages);
        const out: PageInfo[] = [];
        for (let i = 1; i <= doc.numPages; i++) {
          if (cancelled) return;
          const page = await doc.getPage(i);
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvas, viewport }).promise;
          if (cancelled) return;
          out.push({
            pageNumber: i,
            canvas,
            scale,
            pageWidth: viewport.width,
            pageHeight: viewport.height,
          });
          // Render progressif : l'utilisateur voit la page dès qu'elle est prête
          // (copie pour ne pas muter le state précédent).
          setPages([...out]);
        }
        if (!cancelled) onPagesLoadedRef.current?.(out.length, out);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fileUrl, scale]);

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
        <div className="p-8 text-gray-400 text-sm flex items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
          {totalPages ? `Chargement du PDF (0 / ${totalPages} pages)…` : "Chargement du PDF…"}
        </div>
      )}
      {pages.length > 0 && totalPages !== null && pages.length < totalPages && (
        <div className="p-2 text-center text-gray-500 text-xs flex items-center justify-center gap-2">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
          Page {pages.length + 1} / {totalPages}…
        </div>
      )}
    </div>
  );
}
