import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  _resetStoreForTests,
  invalidate,
  memoizeWithTtl,
} from "@/lib/cache/memoize-ttl";

beforeEach(() => {
  _resetStoreForTests();
});

describe("memoizeWithTtl", () => {
  it("appelle loader la première fois", async () => {
    const loader = vi.fn(async () => "fresh");
    const v = await memoizeWithTtl(loader, { key: "k1", ttlMs: 1000 });
    expect(v).toBe("fresh");
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("retourne la valeur cachée tant que TTL pas expiré", async () => {
    const loader = vi.fn(async () => "v1");
    let now = 1000;
    const opts = { key: "k1", ttlMs: 500, now: () => now };

    expect(await memoizeWithTtl(loader, opts)).toBe("v1");
    now = 1300; // 300ms plus tard, dans le TTL
    expect(await memoizeWithTtl(loader, opts)).toBe("v1");
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("rappelle loader après expiration du TTL", async () => {
    let counter = 0;
    const loader = vi.fn(async () => `v${++counter}`);
    let now = 1000;
    const opts = { key: "k1", ttlMs: 500, now: () => now };

    await memoizeWithTtl(loader, opts);
    now = 2000; // bien au-delà du TTL
    const v2 = await memoizeWithTtl(loader, opts);

    expect(v2).toBe("v2");
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("clés différentes → caches indépendants", async () => {
    const loaderA = vi.fn(async () => "A");
    const loaderB = vi.fn(async () => "B");

    expect(
      await memoizeWithTtl(loaderA, { key: "a", ttlMs: 1000 }),
    ).toBe("A");
    expect(
      await memoizeWithTtl(loaderB, { key: "b", ttlMs: 1000 }),
    ).toBe("B");
    expect(loaderA).toHaveBeenCalledTimes(1);
    expect(loaderB).toHaveBeenCalledTimes(1);
  });

  it("si loader throw, le cache n'est PAS empoisonné (pas de valeur stockée)", async () => {
    let attempt = 0;
    const loader = vi.fn(async () => {
      attempt++;
      if (attempt === 1) throw new Error("boom");
      return "ok";
    });

    await expect(
      memoizeWithTtl(loader, { key: "k1", ttlMs: 1000 }),
    ).rejects.toThrow("boom");

    const v = await memoizeWithTtl(loader, { key: "k1", ttlMs: 1000 });
    expect(v).toBe("ok");
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("invalidate() force un re-fetch sur le prochain appel", async () => {
    let counter = 0;
    const loader = vi.fn(async () => `v${++counter}`);
    const opts = { key: "k1", ttlMs: 10_000 };

    await memoizeWithTtl(loader, opts);
    invalidate("k1");
    const v2 = await memoizeWithTtl(loader, opts);

    expect(v2).toBe("v2");
    expect(loader).toHaveBeenCalledTimes(2);
  });
});
