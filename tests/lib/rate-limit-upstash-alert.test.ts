import { describe, it, expect, vi } from "vitest";
import { alertIfUpstashMissingInProd } from "@/lib/rate-limit";

function makeFakeLogger() {
  return { error: vi.fn() };
}

describe("alertIfUpstashMissingInProd", () => {
  it("alerts when in production without Upstash configured", () => {
    const log = makeFakeLogger();
    const env = { NODE_ENV: "production" } as unknown as NodeJS.ProcessEnv;
    const fired = alertIfUpstashMissingInProd(env, log);
    expect(fired).toBe(true);
    expect(log.error).toHaveBeenCalledOnce();
    expect(log.error).toHaveBeenCalledWith(
      "rate-limit.upstash-missing-in-prod",
      undefined,
      expect.objectContaining({
        hint: expect.stringContaining("UPSTASH_REDIS_REST_URL"),
      }),
    );
  });

  it("does not alert in production if Upstash is configured", () => {
    const log = makeFakeLogger();
    const env = {
      NODE_ENV: "production",
      UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "fake-token",
    } as unknown as NodeJS.ProcessEnv;
    const fired = alertIfUpstashMissingInProd(env, log);
    expect(fired).toBe(false);
    expect(log.error).not.toHaveBeenCalled();
  });

  it("does not alert in development even if Upstash is missing", () => {
    const log = makeFakeLogger();
    const env = { NODE_ENV: "development" } as unknown as NodeJS.ProcessEnv;
    const fired = alertIfUpstashMissingInProd(env, log);
    expect(fired).toBe(false);
    expect(log.error).not.toHaveBeenCalled();
  });

  it("does not alert in test env", () => {
    const log = makeFakeLogger();
    const env = { NODE_ENV: "test" } as unknown as NodeJS.ProcessEnv;
    const fired = alertIfUpstashMissingInProd(env, log);
    expect(fired).toBe(false);
    expect(log.error).not.toHaveBeenCalled();
  });

  it("treats one half of credentials as missing (URL without token)", () => {
    const log = makeFakeLogger();
    const env = {
      NODE_ENV: "production",
      UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
      // pas de token
    } as unknown as NodeJS.ProcessEnv;
    const fired = alertIfUpstashMissingInProd(env, log);
    expect(fired).toBe(true);
    expect(log.error).toHaveBeenCalledOnce();
  });
});
