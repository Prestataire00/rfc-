"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
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
