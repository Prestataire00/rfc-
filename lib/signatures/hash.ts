import { createHash } from "node:crypto";

export function sha256Hex(input: string | Buffer | Uint8Array): string {
  return createHash("sha256").update(input).digest("hex");
}

export function sha256Buffer(input: Buffer | Uint8Array): Buffer {
  return createHash("sha256").update(input).digest();
}
