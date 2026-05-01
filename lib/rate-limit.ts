// Rate limit en memoire pour les routes IA et autres endpoints couteux.
// Pour la production multi-instances Netlify, migrer vers Upstash Redis.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

if (typeof globalThis !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, b] of buckets.entries()) {
      if (b.resetAt < now) buckets.delete(key);
    }
  }, 60_000).unref?.();
}

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetAt: number;
};

/**
 * Verifie qu'une cle n'a pas depasse son quota.
 * @param key Identifiant unique (ex: `ai:${userId}`).
 * @param max Nombre max de requetes par fenetre.
 * @param windowMs Fenetre en millisecondes.
 */
export function checkRateLimit(key: string, max: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt < now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { ok: true, remaining: max - 1, resetAt };
  }

  if (existing.count >= max) {
    return { ok: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { ok: true, remaining: max - existing.count, resetAt: existing.resetAt };
}
