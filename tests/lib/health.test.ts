import { describe, it, expect, vi, beforeEach } from "vitest";

// On mock @/lib/prisma pour que le test n'ait pas besoin d'une vraie DB en CI.
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}));

// Import APRÈS le mock pour que le module health.route capte le client mocké.
const importHealth = async () => (await import("@/app/api/health/route")).GET;
const importPrisma = async () =>
  (await import("@/lib/prisma")) as unknown as { prisma: { $queryRaw: ReturnType<typeof vi.fn> } };

describe("/api/health GET", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("retourne 200 + status ok quand la DB répond", async () => {
    const { prisma } = await importPrisma();
    prisma.$queryRaw.mockResolvedValueOnce([{ "?column?": 1 }]);

    const GET = await importHealth();
    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.db).toBe("ok");
    expect(typeof body.dbLatencyMs).toBe("number");
    expect(typeof body.uptime).toBe("number");
    expect(typeof body.timestamp).toBe("string");
    expect(body.dbError).toBeUndefined();
  });

  it("retourne 503 + status degraded quand la DB échoue", async () => {
    const { prisma } = await importPrisma();
    prisma.$queryRaw.mockRejectedValueOnce(new Error("Connection refused"));

    const GET = await importHealth();
    const res = await GET();

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.status).toBe("degraded");
    expect(body.db).toBe("down");
    expect(body.dbError).toContain("Connection refused");
  });

  it("ne cache jamais la réponse (Cache-Control: no-store)", async () => {
    const { prisma } = await importPrisma();
    prisma.$queryRaw.mockResolvedValueOnce([{ "?column?": 1 }]);

    const GET = await importHealth();
    const res = await GET();

    expect(res.headers.get("Cache-Control")).toContain("no-store");
  });
});
