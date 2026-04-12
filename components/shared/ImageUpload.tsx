"use client";

import { useState, useRef } from "react";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";

type Props = {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  shape?: "circle" | "rect";
  size?: "sm" | "md" | "lg";
  placeholder?: React.ReactNode; // initiales, icone, etc.
  accept?: string;
  maxSizeMo?: number;
};

export function ImageUpload({
  value,
  onChange,
  folder = "images",
  shape = "rect",
  size = "md",
  placeholder,
  accept = "image/jpeg,image/png,image/webp,image/gif",
  maxSizeMo = 5,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: shape === "circle" ? "h-16 w-16" : "h-24 w-24",
    md: shape === "circle" ? "h-20 w-20" : "h-32 w-48",
    lg: shape === "circle" ? "h-28 w-28" : "h-40 w-full",
  }[size];

  const roundedClass = shape === "circle" ? "rounded-full" : "rounded-lg";

  const handleFile = async (file: File) => {
    setError("");
    if (file.size > maxSizeMo * 1024 * 1024) {
      setError(`Fichier trop lourd (${maxSizeMo} Mo max)`);
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);
      const res = await fetch("/api/upload-image", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur upload");
      } else if (data.url) {
        onChange(data.url);
      }
    } catch {
      setError("Erreur reseau");
    }
    setUploading(false);
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = "";
  };

  const handleRemove = () => {
    onChange("");
    setError("");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-4">
        {/* Preview */}
        <div className={`relative ${sizeClasses} ${roundedClass} overflow-hidden border-2 border-gray-600 bg-gray-800 flex items-center justify-center shrink-0`}>
          {value ? (
            <>
              <img
                src={value}
                alt="Apercu"
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).src = ""; }}
              />
              {uploading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                </div>
              )}
            </>
          ) : uploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          ) : placeholder ? (
            <div className="text-gray-400">{placeholder}</div>
          ) : (
            <ImageIcon className="h-8 w-8 text-gray-500" />
          )}
        </div>

        {/* Actions */}
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 rounded-md border border-gray-600 bg-gray-800 hover:bg-gray-700 px-3 py-2 text-sm font-medium text-gray-300 transition-colors disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              {value ? "Changer l'image" : "Uploader une image"}
            </button>
            {value && !uploading && (
              <button
                type="button"
                onClick={handleRemove}
                className="inline-flex items-center gap-2 rounded-md border border-gray-600 bg-gray-800 hover:bg-red-900/30 hover:border-red-700 hover:text-red-400 px-3 py-2 text-sm font-medium text-gray-400 transition-colors"
              >
                <X className="h-4 w-4" />
                Retirer
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500">JPG, PNG, WEBP ou GIF, max {maxSizeMo} Mo</p>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={onFileSelect}
          className="hidden"
        />
      </div>
    </div>
  );
}
