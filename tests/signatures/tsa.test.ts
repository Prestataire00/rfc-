import { describe, it, expect, vi, beforeEach } from "vitest";
import { requestTimestamp, requestTimestampWithRetry } from "@/lib/signatures/tsa";

describe("tsa (FreeTSA RFC 3161)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("appelle FreeTSA en POST avec Content-Type timestamp-query", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new Uint8Array([0x30, 0x82, 0x01, 0x42]).buffer,
    });
    vi.stubGlobal("fetch", fetchMock);
    const validHash = "a".repeat(64);
    const result = await requestTimestamp(validHash);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [, options] = fetchMock.mock.calls[0];
    expect(options.method).toBe("POST");
    expect(options.headers["Content-Type"]).toBe("application/timestamp-query");
    expect(result.timestampToken).toBeTruthy();
    expect(result.timestampedAt).toBeInstanceOf(Date);
  });

  it("throw si FreeTSA retourne un status non-OK", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 503 }),
    );
    await expect(requestTimestamp("a".repeat(64))).rejects.toThrow(/503/);
  });

  it("throw si hash invalide (pas hex ou mauvaise longueur)", async () => {
    await expect(requestTimestamp("not-hex")).rejects.toThrow();
    await expect(requestTimestamp("aa")).rejects.toThrow(); // trop court
  });

  it("requestTimestampWithRetry retourne null après échec maxAttempts", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network")),
    );
    const result = await requestTimestampWithRetry("a".repeat(64), 2);
    expect(result).toBeNull();
  });

  it("requestTimestampWithRetry réussit si fetch réussit au 2e essai", async () => {
    let attempt = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => {
        attempt++;
        if (attempt === 1) throw new Error("transient");
        return {
          ok: true,
          arrayBuffer: async () => new Uint8Array([0x30, 0x10]).buffer,
        };
      }),
    );
    const result = await requestTimestampWithRetry("a".repeat(64), 3);
    expect(result).not.toBeNull();
    expect(attempt).toBe(2);
  });
});
