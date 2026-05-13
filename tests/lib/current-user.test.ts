import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/supabase-auth/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase-auth/server";
import {
  getCurrentUser,
  requireCurrentUser,
  requireRole,
} from "@/lib/current-user";

const mockedGetServerSession = vi.mocked(getServerSession);
const mockedFindUnique = vi.mocked(prisma.user.findUnique);
const mockedCreateSupabase = vi.mocked(createSupabaseServerClient);

function makeSupabaseClient(email: string | null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: email ? { email } : null },
        error: null,
      }),
    },
  } as unknown as ReturnType<typeof createSupabaseServerClient>;
}

const baseDbUser = {
  id: "u1",
  email: "alice@example.com",
  role: "admin",
  actif: true,
  nom: "Alice",
  prenom: "A",
  formateurId: null,
  entrepriseId: null,
  password: "ignored",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("getCurrentUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retourne le user depuis Supabase quand la session Supabase est valide", async () => {
    mockedCreateSupabase.mockReturnValue(makeSupabaseClient("alice@example.com"));
    mockedFindUnique.mockResolvedValueOnce(baseDbUser);

    const user = await getCurrentUser();

    expect(user?.source).toBe("supabase");
    expect(user?.email).toBe("alice@example.com");
    expect(user?.role).toBe("admin");
    expect(mockedGetServerSession).not.toHaveBeenCalled();
  });

  it("retourne null si Supabase a une session mais le user Prisma est inactif (pas de fallback NextAuth)", async () => {
    mockedCreateSupabase.mockReturnValue(makeSupabaseClient("alice@example.com"));
    mockedFindUnique.mockResolvedValueOnce({ ...baseDbUser, actif: false });

    const user = await getCurrentUser();

    expect(user).toBeNull();
    expect(mockedGetServerSession).not.toHaveBeenCalled();
  });

  it("retourne null si Supabase a une session mais le user Prisma n'existe plus", async () => {
    mockedCreateSupabase.mockReturnValue(makeSupabaseClient("ghost@example.com"));
    mockedFindUnique.mockResolvedValueOnce(null);

    const user = await getCurrentUser();

    expect(user).toBeNull();
    expect(mockedGetServerSession).not.toHaveBeenCalled();
  });

  it("fallback NextAuth quand aucune session Supabase n'est présente", async () => {
    mockedCreateSupabase.mockReturnValue(makeSupabaseClient(null));
    mockedGetServerSession.mockResolvedValueOnce({
      user: { email: "alice@example.com" },
    } as Awaited<ReturnType<typeof getServerSession>>);
    mockedFindUnique.mockResolvedValueOnce(baseDbUser);

    const user = await getCurrentUser();

    expect(user?.source).toBe("nextauth");
    expect(user?.email).toBe("alice@example.com");
  });

  it("fallback NextAuth si l'init Supabase throw (env manquante)", async () => {
    mockedCreateSupabase.mockImplementation(() => {
      throw new Error("NEXT_PUBLIC_SUPABASE_URL manquant");
    });
    mockedGetServerSession.mockResolvedValueOnce({
      user: { email: "alice@example.com" },
    } as Awaited<ReturnType<typeof getServerSession>>);
    mockedFindUnique.mockResolvedValueOnce(baseDbUser);

    const user = await getCurrentUser();

    expect(user?.source).toBe("nextauth");
  });

  it("retourne null si NextAuth aussi est vide", async () => {
    mockedCreateSupabase.mockReturnValue(makeSupabaseClient(null));
    mockedGetServerSession.mockResolvedValueOnce(null);

    const user = await getCurrentUser();

    expect(user).toBeNull();
  });

  it("retourne null si NextAuth a une session mais Prisma marque le user inactif", async () => {
    mockedCreateSupabase.mockReturnValue(makeSupabaseClient(null));
    mockedGetServerSession.mockResolvedValueOnce({
      user: { email: "alice@example.com" },
    } as Awaited<ReturnType<typeof getServerSession>>);
    mockedFindUnique.mockResolvedValueOnce({ ...baseDbUser, actif: false });

    const user = await getCurrentUser();

    expect(user).toBeNull();
  });
});

describe("requireCurrentUser / requireRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requireCurrentUser throw UNAUTHORIZED si pas de session", async () => {
    mockedCreateSupabase.mockReturnValue(makeSupabaseClient(null));
    mockedGetServerSession.mockResolvedValueOnce(null);

    await expect(requireCurrentUser()).rejects.toThrow("UNAUTHORIZED");
  });

  it("requireRole throw FORBIDDEN si le rôle ne match pas", async () => {
    mockedCreateSupabase.mockReturnValue(makeSupabaseClient("alice@example.com"));
    mockedFindUnique.mockResolvedValueOnce({ ...baseDbUser, role: "client" });

    await expect(requireRole(["admin", "formateur"])).rejects.toThrow(
      "FORBIDDEN",
    );
  });

  it("requireRole retourne le user si le rôle match", async () => {
    mockedCreateSupabase.mockReturnValue(makeSupabaseClient("alice@example.com"));
    mockedFindUnique.mockResolvedValueOnce({ ...baseDbUser, role: "formateur" });

    const user = await requireRole(["admin", "formateur"]);

    expect(user.role).toBe("formateur");
  });
});
