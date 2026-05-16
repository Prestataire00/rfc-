import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Chiffrement applicatif des champs sensibles (NSS Contact, RGPD).
// AES-256-GCM avec auth tag (intégrité + confidentialité).
// Format : enc::v1::<iv_base64>:<authtag_base64>:<ct_base64>
// Le préfixe versionne le schéma et permet la rotation de clé future (v2).

const ALGO = "aes-256-gcm";
const IV_LEN = 12; // 96 bits, recommandé pour GCM
const KEY_LEN = 32; // 256 bits
const PREFIX = "enc::v1::";

function getKey(): Buffer {
  const raw = process.env.NSS_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("NSS_ENCRYPTION_KEY is not set");
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== KEY_LEN) {
    throw new Error(`NSS_ENCRYPTION_KEY must decode to ${KEY_LEN} bytes (got ${key.length})`);
  }
  return key;
}

export function isEncryptedNSS(value: string | null | undefined): boolean {
  return typeof value === "string" && value.length > 0 && value.startsWith(PREFIX);
}

export function encryptNSS(value: string | null | undefined): string | null {
  if (value == null || value === "") return null;
  if (isEncryptedNSS(value)) return value; // idempotent

  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const ct = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return PREFIX + [iv.toString("base64"), tag.toString("base64"), ct.toString("base64")].join(":");
}

export function decryptNSS(value: string | null | undefined): string | null {
  if (value == null || value === "") return null;
  if (!isEncryptedNSS(value)) return value; // legacy plaintext, returned as-is

  const stripped = value.slice(PREFIX.length);
  const parts = stripped.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted NSS format: expected iv:tag:ct");
  }
  const [ivB64, tagB64, ctB64] = parts;
  if (!ivB64 || !tagB64 || !ctB64) {
    throw new Error("Invalid encrypted NSS format: missing component");
  }

  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const ct = Buffer.from(ctB64, "base64");

  const decipher = createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString("utf8");
}
