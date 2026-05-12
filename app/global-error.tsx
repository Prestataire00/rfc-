"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Global error = crash root layout (le boundary `app/error.tsx` n'a pas
    // pu attraper, parce que l'erreur vient du layout lui-même). Critique :
    // tag explicite + extra `digest` pour corrélation côté serveur Netlify.
    Sentry.captureException(error, {
      tags: { boundary: "app/global-error.tsx" },
      extra: { digest: error.digest },
    });
  }, [error]);

  return (
    <html lang="fr">
      <body>
        <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
          <div style={{ textAlign: "center", maxWidth: 400, padding: 32 }}>
            <h1 style={{ fontSize: 24, fontWeight: "bold", marginBottom: 8 }}>
              Une erreur est survenue
            </h1>
            <p style={{ color: "#666", marginBottom: 24 }}>
              {"Veuillez réessayer ou retourner à l'accueil."}
            </p>
            <button
              onClick={() => reset()}
              style={{ padding: "10px 20px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", marginRight: 8 }}
            >
              {"Réessayer"}
            </button>
            <a
              href="/dashboard"
              style={{ padding: "10px 20px", border: "1px solid #ccc", borderRadius: 8, textDecoration: "none", color: "#333" }}
            >
              Accueil
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
