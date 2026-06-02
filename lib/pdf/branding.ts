// Helpers de branding pour les PDFs : recupere le logo (base64) et la couleur
// primaire a partir des Parametres entreprise. Le logo est cache 1h pour eviter
// des round-trips reseau a chaque generation.

import type { EntrepriseParams } from "@/lib/parametres";
import { LOGO_BASE64 } from "./logo-base64";

type ImageCache = { url: string; data: string; fetchedAt: number } | null;
let logoCache: ImageCache = null;
let tamponCache: ImageCache = null;
const CACHE_TTL_MS = 60 * 60 * 1000;

// Invalidation manuelle : appelée par PUT /api/parametres/entreprise quand
// l'admin upload un nouveau logo ou tampon. Évite d'attendre 1h pour voir
// le changement sur les nouveaux PDFs générés.
export function invalidateBrandingCache(): void {
  logoCache = null;
  tamponCache = null;
}

// Convertit une URL d'image en data URI base64 pour pdfmake.
// Retourne le logo RFC par defaut en cas d'erreur.
export async function resolveLogoBase64(logoUrl: string | null | undefined): Promise<string> {
  if (!logoUrl) return LOGO_BASE64;

  const now = Date.now();
  if (logoCache && logoCache.url === logoUrl && now - logoCache.fetchedAt < CACHE_TTL_MS) {
    return logoCache.data;
  }

  try {
    // Les URLs Supabase sont publiques ; on fetch directement.
    const res = await fetch(logoUrl, { cache: "no-store" });
    if (!res.ok) return LOGO_BASE64;
    const buf = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") || "image/png";
    const data = `data:${contentType};base64,${buf.toString("base64")}`;
    logoCache = { url: logoUrl, data, fetchedAt: now };
    return data;
  } catch {
    return LOGO_BASE64;
  }
}

// Convertit l'URL du tampon+signature en data URI base64. Retourne null si
// pas configuré ou erreur de fetch (les templates affichent alors le bloc
// signature vide habituel à compléter à la main).
export async function resolveTamponBase64(tamponUrl: string | null | undefined): Promise<string | null> {
  if (!tamponUrl) return null;

  const now = Date.now();
  if (tamponCache && tamponCache.url === tamponUrl && now - tamponCache.fetchedAt < CACHE_TTL_MS) {
    return tamponCache.data;
  }

  try {
    const res = await fetch(tamponUrl, { cache: "no-store" });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") || "image/png";
    const data = `data:${contentType};base64,${buf.toString("base64")}`;
    tamponCache = { url: tamponUrl, data, fetchedAt: now };
    return data;
  } catch {
    return null;
  }
}

// Resout les infos de branding utilisables par les templates PDF.
// Couleur primaire toujours definie (fallback sur rouge RFC).
// Le tampon+signature est null si non configuré → les templates affichent
// alors un bloc vide à signer manuellement.
export async function resolveBranding(params: EntrepriseParams): Promise<{
  logoBase64: string;
  tamponBase64: string | null;
  couleurPrimaire: string;
  nomEntreprise: string;
  slogan: string;
  siteWeb: string;
}> {
  const [logoBase64, tamponBase64] = await Promise.all([
    resolveLogoBase64(params.logoUrl),
    resolveTamponBase64(params.tamponSignatureUrl),
  ]);
  return {
    logoBase64,
    tamponBase64,
    couleurPrimaire: params.couleurPrimaire || "#dc2626",
    nomEntreprise: params.nomEntreprise || "RFC",
    slogan: params.slogan || "",
    siteWeb: params.siteWeb || "",
  };
}

export type PdfBranding = Awaited<ReturnType<typeof resolveBranding>>;
