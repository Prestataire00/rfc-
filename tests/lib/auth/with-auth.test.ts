import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/current-user", () => ({
  getCurrentUser: vi.fn(),
}));

import { NextRequest } from "next/server";

import { getCurrentUser, type CurrentUser } from "@/lib/current-user";
import { withAuth } from "@/lib/auth/with-auth";

const mockedGetCurrentUser = vi.mocked(getCurrentUser);

const adminUser: CurrentUser = {
  id: "u1",
  email: "alice@example.com",
  role: "admin",
  actif: true,
  nom: "Alice",
  prenom: "A",
  formateurId: null,
  entrepriseId: null,
  source: "supabase",
};

function makeReq(url = "https://example.com/api/x"): NextRequest {
  return new NextRequest(url);
}

describe("withAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retourne 401 si pas authentifié", async () => {
    mockedGetCurrentUser.mockResolvedValueOnce(null);

    const handler = withAuth(async () => Response.json({ ok: true }));
    const res = await handler(makeReq(), {});

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "UNAUTHORIZED" });
  });

  it("retourne 403 si le rôle ne match pas", async () => {
    mockedGetCurrentUser.mockResolvedValueOnce({
      ...adminUser,
      role: "client",
    });

    const handler = withAuth(async () => Response.json({ ok: true }), {
      roles: ["admin", "formateur"],
    });
    const res = await handler(makeReq(), {});

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "FORBIDDEN" });
  });

  it("passe le user au handler en cas de succès", async () => {
    mockedGetCurrentUser.mockResolvedValueOnce(adminUser);

    const handler = withAuth(async (_req, { user }) =>
      Response.json({ role: user.role, source: user.source }),
    );
    const res = await handler(makeReq(), {});

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ role: "admin", source: "supabase" });
  });

  it("propage le contexte (params dynamiques [id]) au handler", async () => {
    mockedGetCurrentUser.mockResolvedValueOnce(adminUser);

    const handler = withAuth<{ params: { id: string } }>(
      async (_req, { user, params }) =>
        Response.json({ userId: user.id, paramId: params.id }),
    );
    const res = await handler(makeReq(), { params: { id: "abc-123" } });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ userId: "u1", paramId: "abc-123" });
  });

  it("accepte un user authentifié sans option roles (any role)", async () => {
    mockedGetCurrentUser.mockResolvedValueOnce({
      ...adminUser,
      role: "formateur",
    });

    const handler = withAuth(async (_req, { user }) =>
      Response.json({ role: user.role }),
    );
    const res = await handler(makeReq(), {});

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ role: "formateur" });
  });
});
