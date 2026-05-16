import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomBytes } from "node:crypto";
import { encryptNSS, decryptNSS, isEncryptedNSS } from "@/lib/encryption";

const originalKey = process.env.NSS_ENCRYPTION_KEY;

beforeAll(() => {
  // Test key: 32 random bytes, base64-encoded
  process.env.NSS_ENCRYPTION_KEY = randomBytes(32).toString("base64");
});

afterAll(() => {
  if (originalKey === undefined) delete process.env.NSS_ENCRYPTION_KEY;
  else process.env.NSS_ENCRYPTION_KEY = originalKey;
});

describe("encryptNSS / decryptNSS", () => {
  it("round-trip preserves the plaintext", () => {
    const plain = "1234567890123";
    const enc = encryptNSS(plain);
    expect(enc).not.toBe(plain);
    expect(decryptNSS(enc)).toBe(plain);
  });

  it("round-trip preserves a 15-digit french NIR", () => {
    const plain = "180012512345678"; // format réaliste
    const enc = encryptNSS(plain);
    expect(decryptNSS(enc)).toBe(plain);
  });

  it("produces different ciphertext each time (random IV)", () => {
    const plain = "1234567890123";
    const a = encryptNSS(plain);
    const b = encryptNSS(plain);
    expect(a).not.toBe(b);
    expect(decryptNSS(a)).toBe(plain);
    expect(decryptNSS(b)).toBe(plain);
  });

  it("ciphertext starts with the enc::v1:: prefix", () => {
    const enc = encryptNSS("12345");
    expect(enc?.startsWith("enc::v1::")).toBe(true);
  });

  it("returns null for null input", () => {
    expect(encryptNSS(null)).toBe(null);
    expect(decryptNSS(null)).toBe(null);
  });

  it("returns null for undefined input", () => {
    expect(encryptNSS(undefined)).toBe(null);
    expect(decryptNSS(undefined)).toBe(null);
  });

  it("returns null for empty string", () => {
    expect(encryptNSS("")).toBe(null);
    expect(decryptNSS("")).toBe(null);
  });

  it("is idempotent on already-encrypted values", () => {
    const enc = encryptNSS("1234567890123");
    expect(encryptNSS(enc)).toBe(enc);
  });

  it("decrypts legacy plaintext (no prefix) as-is", () => {
    // Pendant la migration, certains rows ont encore du clair en base.
    // decryptNSS doit les retourner inchangés pour ne rien casser.
    const legacy = "1234567890123";
    expect(decryptNSS(legacy)).toBe(legacy);
  });

  it("isEncryptedNSS reports correctly", () => {
    expect(isEncryptedNSS("1234")).toBe(false);
    expect(isEncryptedNSS(null)).toBe(false);
    expect(isEncryptedNSS(undefined)).toBe(false);
    expect(isEncryptedNSS("")).toBe(false);
    expect(isEncryptedNSS(encryptNSS("1234"))).toBe(true);
  });

  it("fails to decrypt tampered ciphertext (GCM auth tag)", () => {
    const enc = encryptNSS("1234567890123")!;
    // Tamper sur l'auth tag : decode, flip un bit, re-encode.
    // Plus fiable que de toucher au base64 (qui peut ne pas changer après décodage).
    const stripped = enc.slice("enc::v1::".length);
    const [iv, tagB64, ct] = stripped.split(":");
    const tagBytes = Buffer.from(tagB64, "base64");
    tagBytes[0] = tagBytes[0] ^ 0x01; // flip un bit du premier byte du tag
    const tampered = "enc::v1::" + [iv, tagBytes.toString("base64"), ct].join(":");
    expect(() => decryptNSS(tampered)).toThrow();
  });

  it("fails to decrypt with a malformed payload", () => {
    expect(() => decryptNSS("enc::v1::not-valid")).toThrow();
    expect(() => decryptNSS("enc::v1::only:two")).toThrow();
  });

  it("throws if NSS_ENCRYPTION_KEY is missing", () => {
    const saved = process.env.NSS_ENCRYPTION_KEY;
    delete process.env.NSS_ENCRYPTION_KEY;
    try {
      expect(() => encryptNSS("1234")).toThrow(/NSS_ENCRYPTION_KEY/);
    } finally {
      process.env.NSS_ENCRYPTION_KEY = saved;
    }
  });

  it("throws if NSS_ENCRYPTION_KEY is not 32 bytes (256-bit)", () => {
    const saved = process.env.NSS_ENCRYPTION_KEY;
    process.env.NSS_ENCRYPTION_KEY = randomBytes(16).toString("base64");
    try {
      expect(() => encryptNSS("1234")).toThrow(/32 bytes/);
    } finally {
      process.env.NSS_ENCRYPTION_KEY = saved;
    }
  });
});
