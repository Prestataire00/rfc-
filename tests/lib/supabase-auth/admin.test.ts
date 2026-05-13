import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const ORIGINAL_ENV = { ...process.env };

describe("createSupabaseAdminClient", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("throw si NEXT_PUBLIC_SUPABASE_URL manquant", async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
    const mod = await import("@/lib/supabase-auth/admin");
    expect(() => mod.createSupabaseAdminClient()).toThrow(
      /NEXT_PUBLIC_SUPABASE_URL manquant/,
    );
  });

  it("throw si SUPABASE_SERVICE_ROLE_KEY manquant", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    const mod = await import("@/lib/supabase-auth/admin");
    expect(() => mod.createSupabaseAdminClient()).toThrow(
      /SUPABASE_SERVICE_ROLE_KEY manquant/,
    );
  });

  it("cache l'instance entre les appels (singleton)", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";

    const mod = await import("@/lib/supabase-auth/admin");
    const c1 = mod.createSupabaseAdminClient();
    const c2 = mod.createSupabaseAdminClient();
    expect(c1).toBe(c2);
  });
});
