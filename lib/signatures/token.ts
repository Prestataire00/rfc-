import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { sha256Hex } from "./hash";

// Tokens magiques signataire — voir spec §"Phase 2 — Token & envoi email".
// Format : {rawToken}.{hmac} où rawToken = 32 bytes random base64url,
// hmac = HMAC-SHA256(rawToken, SECRET_HMAC_TOKENS).
// En BD on stocke uniquement sha256(fullToken) → fuite BD ⇒ tokens inexploitables.
// Vérification HMAC se fait AVANT lookup BD pour éviter DoS Postgres sur tokens forgés.

function requireSecret(): string {
  const secret = process.env.SECRET_HMAC_TOKENS;
  if (!secret) {
    throw new Error(
      "SECRET_HMAC_TOKENS manquant. Générer avec `openssl rand -base64 32` et ajouter à .env / Netlify env. Voir docs/superpowers/specs/2026-05-12-signature-electronique-self-hosted-design.md",
    );
  }
  return secret;
}

function hmac(rawToken: string, key: string): string {
  return createHmac("sha256", key).update(rawToken).digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

export function generateToken(): { fullToken: string; tokenHash: string } {
  const rawToken = randomBytes(32).toString("base64url");
  const signature = hmac(rawToken, requireSecret());
  const fullToken = `${rawToken}.${signature}`;
  const tokenHash = sha256Hex(fullToken);
  return { fullToken, tokenHash };
}

export type TokenVerification =
  | { valid: true; tokenHash: string }
  | { valid: false; reason: "format" | "signature" };

// Vérifie HMAC sans toucher à la BD. Renvoie le tokenHash pour lookup ultérieur.
// Supporte rotation : SECRET_HMAC_TOKENS_OLD accepté en fallback si défini.
export function verifyToken(fullToken: string): TokenVerification {
  const parts = fullToken.split(".");
  if (parts.length !== 2) return { valid: false, reason: "format" };
  const [rawToken, providedSignature] = parts;
  if (!rawToken || !providedSignature) return { valid: false, reason: "format" };

  const expected = hmac(rawToken, requireSecret());
  if (safeEqualHex(providedSignature, expected)) {
    return { valid: true, tokenHash: sha256Hex(fullToken) };
  }

  const oldSecret = process.env.SECRET_HMAC_TOKENS_OLD;
  if (oldSecret) {
    const oldExpected = hmac(rawToken, oldSecret);
    if (safeEqualHex(providedSignature, oldExpected)) {
      return { valid: true, tokenHash: sha256Hex(fullToken) };
    }
  }

  return { valid: false, reason: "signature" };
}

// 8 premiers chars du fullToken — pour rate-limit (SignatureTokenAttempt.tokenPrefix)
export function tokenPrefix(fullToken: string): string {
  return fullToken.slice(0, 8);
}
