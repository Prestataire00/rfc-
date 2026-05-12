// Hook Next.js 14 d'instrumentation au boot du serveur.
// Détecte le runtime (nodejs / edge) et charge le bon Sentry init.
// Doc : https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Hook `onRequestError` de Next 14 : appelé pour chaque erreur server-side
// non-catchée (Server Action, route handler, RSC). On le câble au handler
// officiel Sentry (`captureRequestError`) qui sait extraire la route, la
// méthode, et tagger correctement l'event.
export { captureRequestError as onRequestError } from "@sentry/nextjs";
