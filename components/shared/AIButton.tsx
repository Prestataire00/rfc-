"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";

type Props = {
  endpoint: string;
  payload: Record<string, unknown>;
  onResult: (text: string) => void;
  label?: string;
  size?: "sm" | "md";
  className?: string;
  disabled?: boolean;
};

export function AIButton({
  endpoint,
  payload,
  onResult,
  label = "Generer avec IA",
  size = "sm",
  className = "",
  disabled = false,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Erreur IA");
        return;
      }
      if (data?.text) onResult(data.text);
    } catch {
      setError("Erreur reseau");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || loading}
        className={`inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 ${size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-2 text-sm"} font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm ${className}`}
      >
        {loading ? (
          <Loader2 className={`${size === "sm" ? "h-3 w-3" : "h-4 w-4"} animate-spin`} />
        ) : (
          <Sparkles className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />
        )}
        {loading ? "Generation..." : label}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
