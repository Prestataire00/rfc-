/**
 * Client FreeTSA RFC 3161 — horodatage opposable du PDF signé.
 *
 * Construit une TimeStampRequest (TSQ) ASN.1 DER minimale contenant le hash
 * SHA-256 du document, l'envoie à FreeTSA, et stocke le TimeStampResponse (TSR).
 * Le TSR est binaire (DER) — on le persiste tel quel en `SignatureRequest.tsaTimestamp`
 * (champ Bytes Prisma) pour vérification ultérieure avec openssl :
 *
 *   openssl ts -verify -in <pdf-signe> -queryfile <tsr> -CAfile <freetsa-cacert>
 *
 * FreeTSA n'est pas qualifié eIDAS mais émet un timestamp cryptographiquement
 * signé (RSA 2048 / SHA-256), suffisant pour la "signature simple renforcée"
 * visée par la spec (voir §"Limitations assumées").
 *
 * Endpoint : https://freetsa.org/tsr (par défaut, override via FREETSA_URL).
 */

const DEFAULT_TSA_URL = "https://freetsa.org/tsr";

function tsaUrl(): string {
  return process.env.FREETSA_URL ?? DEFAULT_TSA_URL;
}

function hexToBytes(hex: string): Uint8Array {
  if (!/^[0-9a-f]+$/i.test(hex)) {
    throw new Error("Hash doit être en hexadécimal");
  }
  if (hex.length !== 64) {
    throw new Error(`Hash SHA-256 doit faire 64 chars hex (reçu ${hex.length})`);
  }
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return out;
}

/**
 * Construit une TimeStampReq ASN.1 DER (RFC 3161 §2.4.1) :
 *   TimeStampReq ::= SEQUENCE {
 *     version            INTEGER  { v1(1) },
 *     messageImprint     MessageImprint,
 *     reqPolicy          TSAPolicyId       OPTIONAL,
 *     nonce              INTEGER           OPTIONAL,
 *     certReq            BOOLEAN           DEFAULT FALSE,
 *     extensions         [0] IMPLICIT Extensions  OPTIONAL
 *   }
 *   MessageImprint ::= SEQUENCE {
 *     hashAlgorithm  AlgorithmIdentifier,
 *     hashedMessage  OCTET STRING
 *   }
 *
 * On émet la forme minimale : version + messageImprint(SHA-256) + certReq=TRUE.
 */
function buildTimestampRequest(sha256Hex: string): Uint8Array {
  const hash = hexToBytes(sha256Hex);

  // SHA-256 OID = 2.16.840.1.101.3.4.2.1 encodé en DER (11 bytes hors tag/len).
  const sha256Oid = new Uint8Array([
    0x06, 0x09, 0x60, 0x86, 0x48, 0x01, 0x65, 0x03, 0x04, 0x02, 0x01,
  ]);

  // AlgorithmIdentifier ::= SEQUENCE { algorithm OID, parameters NULL }
  const algIdContent = concatU8(sha256Oid, new Uint8Array([0x05, 0x00]));
  const algId = concatU8(new Uint8Array([0x30, algIdContent.length]), algIdContent);

  // hashedMessage = OCTET STRING <hash 32 bytes>
  const hashedMessage = concatU8(new Uint8Array([0x04, hash.length]), hash);

  // MessageImprint SEQUENCE
  const miContent = concatU8(algId, hashedMessage);
  const messageImprint = concatU8(new Uint8Array([0x30, miContent.length]), miContent);

  // version INTEGER 1
  const version = new Uint8Array([0x02, 0x01, 0x01]);
  // certReq BOOLEAN TRUE
  const certReq = new Uint8Array([0x01, 0x01, 0xff]);

  const tsqContent = concatU8(version, messageImprint, certReq);
  // SEQUENCE tag + 2-byte length (DER long form puisque content peut faire > 127)
  const header = new Uint8Array([
    0x30,
    0x82,
    (tsqContent.length >> 8) & 0xff,
    tsqContent.length & 0xff,
  ]);
  return concatU8(header, tsqContent);
}

// Concatène des Uint8Array sans dépendre de spread (compatible target ES5 strict).
function concatU8(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((acc, a) => acc + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    out.set(a, offset);
    offset += a.length;
  }
  return out;
}

export interface TimestampResult {
  /** TSR binaire encodé en base64 (à stocker en `SignatureRequest.tsaTimestamp`). */
  timestampToken: string;
  /** Date locale du moment où on a reçu la réponse. La date "officielle" du tampon
   *  est dans le TSR lui-même (à parser plus tard si on veut l'afficher). */
  timestampedAt: Date;
}

export async function requestTimestamp(sha256Hex: string): Promise<TimestampResult> {
  const tsq = buildTimestampRequest(sha256Hex);
  const res = await fetch(tsaUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/timestamp-query" },
    body: Buffer.from(tsq),
  });
  if (!res.ok) {
    throw new Error(`FreeTSA a retourné ${res.status}`);
  }
  const tsrBytes = new Uint8Array(await res.arrayBuffer());
  return {
    timestampToken: Buffer.from(tsrBytes).toString("base64"),
    timestampedAt: new Date(),
  };
}

/**
 * Retry exponential backoff. Retourne null si tous les essais échouent.
 *
 * Pourquoi `null` plutôt que throw : la finalisation crypto ne doit pas bloquer
 * la signature côté UX. Si FreeTSA est down, on accepte la signature avec un
 * flag `requiresTimestamp` et un job nocturne complète a posteriori.
 */
export async function requestTimestampWithRetry(
  sha256Hex: string,
  maxAttempts = 3,
): Promise<TimestampResult | null> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await requestTimestamp(sha256Hex);
    } catch (e) {
      lastErr = e;
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt - 1)));
      }
    }
  }
  console.error("FreeTSA failed after retries:", lastErr);
  return null;
}
