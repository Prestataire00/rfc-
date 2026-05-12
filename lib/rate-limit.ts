// Rate limit hybride : Upstash Redis en prod (distribué entre invocations Netlify),
// fallback in-memory en dev / si Upstash non configuré.
//
// Deux APIs exposées :
//   - checkRateLimit(key, max, windowMs)  sync, in-memory uniquement (legacy ai-guard.ts)
//   - rateLimit(identifier, max, window)  async, Upstash si dispo, sinon in-memory
//
// Préférer `rateLimit` pour tout nouveau usage : c'est le seul qui marche
// réellement en multi-instance Netlify Functions.

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const hasUpstash = !!(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

const redis = hasUpstash ? Redis.fromEnv() : null;

if (!hasUpstash && process.env.NODE_ENV === "production") {
  // Warning au boot (pas un throw : on veut pas bloquer le déploiement si l'admin
  // n'a pas encore set Upstash. Le rate-limit dégradera juste en in-memory inefficace.)
  console.warn(
    "[rate-limit] Upstash non configuré en production : fallback in-memory inefficace " +
      "(Netlify Functions = process différent par invocation, le compteur ne persiste pas). " +
      "Configurer UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN dans les env vars Netlify.",
  );
}

// ── In-memory fallback (existant, conservé pour compat ai-guard.ts + dev) ────

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

if (typeof globalThis !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    buckets.forEach((b, key) => {
      if (b.resetAt < now) buckets.delete(key);
    });
  }, 60_000).unref?.();
}

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetAt: number;
};

/**
 * Rate limit synchrone (in-memory).
 * ⚠️ Ne persiste PAS entre invocations Netlify Functions — préférer `rateLimit` (async).
 * Conservé pour compat avec lib/ai-guard.ts.
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

// ── Upstash sliding window (preferred pour endpoints publics) ────────────────

type UpstashWindow = `${number} ${"ms" | "s" | "m" | "h" | "d"}`;
const limiterCache = new Map<string, Ratelimit>();

const getUpstashLimiter = (max: number, window: UpstashWindow): Ratelimit => {
  if (!redis) throw new Error("Upstash non configuré");
  const cacheKey = `${max}:${window}`;
  let lim = limiterCache.get(cacheKey);
  if (!lim) {
    lim = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(max, window),
      analytics: false,
      prefix: "rl",
    });
    limiterCache.set(cacheKey, lim);
  }
  return lim;
};

const parseWindowMs = (window: UpstashWindow): number => {
  const match = window.match(/^(\d+)\s+(ms|s|m|h|d)$/);
  if (!match || !match[1] || !match[2]) {
    throw new Error(`Fenêtre invalide : ${window}`);
  }
  const n = parseInt(match[1], 10);
  switch (match[2]) {
    case "ms":
      return n;
    case "s":
      return n * 1000;
    case "m":
      return n * 60 * 1000;
    case "h":
      return n * 60 * 60 * 1000;
    case "d":
      return n * 24 * 60 * 60 * 1000;
    default:
      throw new Error(`Unité invalide : ${match[2]}`);
  }
};

/**
 * Rate limit async. Upstash sliding window si configuré, sinon fallback in-memory.
 *
 * @param identifier Clé unique (IP, email, userId, hash de token...)
 * @param max Nombre max de requêtes dans la fenêtre
 * @param window Format Upstash : "10 s", "5 m", "1 h", "1 d"
 *
 * @example
 *   const result = await rateLimit(`public:eval:${ip}`, 30, "5 m");
 *   if (!result.ok) return tooManyRequests(result);
 */
export async function rateLimit(
  identifier: string,
  max: number,
  window: UpstashWindow,
): Promise<RateLimitResult> {
  if (redis) {
    const limiter = getUpstashLimiter(max, window);
    const result = await limiter.limit(identifier);
    return {
      ok: result.success,
      remaining: result.remaining,
      resetAt: result.reset,
    };
  }
  return checkRateLimit(`rl:${identifier}`, max, parseWindowMs(window));
}

export type { UpstashWindow };
