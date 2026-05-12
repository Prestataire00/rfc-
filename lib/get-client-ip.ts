// Extrait l'IP client de la requête.
// Priorité : header Netlify natif (non-spoofable), puis X-Forwarded-For (peut être
// spoofable si l'app est exposée directement sans CDN, mais Netlify pose toujours
// son propre header en plus). Fallback "anon" — préfère NE PAS bloquer qu'over-bloquer.

import type { NextRequest } from "next/server";

type HeadersLike = { get(name: string): string | null };

export function getClientIp(req: NextRequest | Request | { headers: HeadersLike }): string {
  const headers = req.headers;
  if (!headers || typeof headers.get !== "function") return "anon";

  // Netlify injecte cet header avec l'IP directe du client (non-spoofable).
  const netlify = headers.get("x-nf-client-connection-ip");
  if (netlify) return netlify.trim();

  // X-Forwarded-For peut contenir une chaîne d'IPs ; le premier est le client réel
  // sauf si l'attaquant a ajouté un header à la main avant d'atteindre le CDN.
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const real = headers.get("x-real-ip");
  if (real) return real.trim();

  return "anon";
}
