"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Eraser, Undo2 } from "lucide-react";

type Props = {
  width?: number;
  height?: number;
  onSignatureChange?: (dataUrl: string | null) => void;
  disabled?: boolean;
  initialValue?: string | null;
  className?: string;
};

export function SignaturePad({
  width = 400,
  height = 160,
  onSignatureChange,
  disabled = false,
  initialValue,
  className = "",
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set up high-DPI canvas
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Drawing style
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Load initial value if provided
    if (initialValue) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height);
        setHasContent(true);
      };
      img.src = initialValue;
    }
  }, [width, height, initialValue]);

  const getPos = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const scaleX = width / rect.width;
      const scaleY = height / rect.height;

      if ("touches" in e) {
        const touch = e.touches[0] || e.changedTouches[0];
        return {
          x: (touch.clientX - rect.left) * scaleX,
          y: (touch.clientY - rect.top) * scaleY,
        };
      }
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    [width, height]
  );

  const saveSnapshot = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    setHistory((prev) => [...prev.slice(-10), ctx.getImageData(0, 0, width * dpr, height * dpr)]);
  }, [width, height]);

  const startDraw = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      if (disabled) return;
      e.preventDefault();
      saveSnapshot();
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!ctx) return;

      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      setIsDrawing(true);
    },
    [disabled, getPos, saveSnapshot]
  );

  const draw = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      if (!isDrawing || disabled) return;
      e.preventDefault();
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;

      const pos = getPos(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    },
    [isDrawing, disabled, getPos]
  );

  const endDraw = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setHasContent(true);

    const canvas = canvasRef.current;
    if (canvas && onSignatureChange) {
      onSignatureChange(canvas.toDataURL("image/png"));
    }
  }, [isDrawing, onSignatureChange]);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, width * dpr, height * dpr);
    setHasContent(false);
    setHistory([]);
    onSignatureChange?.(null);
  }, [width, height, onSignatureChange]);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prev = history[history.length - 1];
    ctx.putImageData(prev, 0, 0);
    setHistory((h) => h.slice(0, -1));

    if (history.length <= 1) {
      setHasContent(false);
      onSignatureChange?.(null);
    } else {
      onSignatureChange?.(canvas.toDataURL("image/png"));
    }
  }, [history, onSignatureChange]);

  return (
    <div className={className}>
      <div
        className={`relative rounded-lg border-2 border-dashed ${
          disabled ? "border-gray-600 bg-gray-800/50 opacity-60" : "border-gray-500 bg-white"
        }`}
        style={{ width: "100%", maxWidth: width }}
      >
        <canvas
          ref={canvasRef}
          className="w-full touch-none cursor-crosshair rounded-lg"
          style={{ height }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
        {!hasContent && !disabled && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="text-sm text-gray-400 select-none">Signez ici</span>
          </div>
        )}
      </div>
      {!disabled && (
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={undo}
            disabled={history.length === 0}
            className="inline-flex items-center gap-1 rounded-md border border-gray-600 bg-gray-800 px-2 py-1 text-xs text-gray-300 hover:bg-gray-700 disabled:opacity-40"
          >
            <Undo2 className="h-3 w-3" /> Annuler
          </button>
          <button
            type="button"
            onClick={clear}
            disabled={!hasContent}
            className="inline-flex items-center gap-1 rounded-md border border-gray-600 bg-gray-800 px-2 py-1 text-xs text-gray-300 hover:bg-gray-700 disabled:opacity-40"
          >
            <Eraser className="h-3 w-3" /> Effacer
          </button>
        </div>
      )}
    </div>
  );
}
