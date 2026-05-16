import { describe, it, expect, vi } from "vitest";

// Mock Prisma — ne pas toucher la vraie DB
vi.mock("@/lib/prisma", () => ({
  prisma: {
    demande: { findUnique: vi.fn() },
    session: { findFirst: vi.fn() },
    fichePreFormationEntreprise: { findFirst: vi.fn() },
    fichePreFormationStagiaire: { findMany: vi.fn() },
    inscription: { findMany: vi.fn() },
    historiqueAction: { findMany: vi.fn() },
  },
}));

const importGET = async () =>
  (await import("@/app/api/prospects/[id]/route")).GET;

const importPrisma = async () =>
  (await import("@/lib/prisma")) as unknown as {
    prisma: {
      demande: { findUnique: ReturnType<typeof vi.fn> };
      session: { findFirst: ReturnType<typeof vi.fn> };
      fichePreFormationEntreprise: { findFirst: ReturnType<typeof vi.fn> };
      fichePreFormationStagiaire: { findMany: ReturnType<typeof vi.fn> };
      inscription: { findMany: ReturnType<typeof vi.fn> };
      historiqueAction: { findMany: ReturnType<typeof vi.fn> };
    };
  };

function makeRequest(id: string) {
  return new Request(`http://localhost/api/prospects/${id}`, {
    method: "GET",
  }) as unknown as Parameters<Awaited<ReturnType<typeof importGET>>>[0];
}

describe("GET /api/prospects/[id]", () => {
  it("retourne 404 si la demande n'existe pas", async () => {
    const { prisma } = await importPrisma();
    prisma.demande.findUnique.mockResolvedValueOnce(null);

    const GET = await importGET();
    const res = await GET(makeRequest("inexistant"), {
      params: { id: "inexistant" },
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toMatch(/introuvable/i);
  });

  it("retourne 200 + structure complète si la demande existe", async () => {
    const { prisma } = await importPrisma();

    const fakeDemande = {
      id: "demande-1",
      titre: "Formation SST",
      devisId: null,
      contactId: "contact-1",
      entrepriseId: "ent-1",
      contact: { id: "contact-1", nom: "Dupont", prenom: "Jean", email: "jean@test.com" },
      entreprise: { id: "ent-1", nom: "Acme" },
      formation: null,
      devis: null,
    };

    prisma.demande.findUnique.mockResolvedValueOnce(fakeDemande);
    prisma.historiqueAction.findMany.mockResolvedValueOnce([
      { id: "h-1", action: "prospect_cree", label: "Prospect créé", createdAt: new Date() },
    ]);

    const GET = await importGET();
    const res = await GET(makeRequest("demande-1"), {
      params: { id: "demande-1" },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      demande: { id: "demande-1", titre: "Formation SST" },
      contact: { id: "contact-1" },
      entreprise: { id: "ent-1" },
      formation: null,
      devis: null,
      session: null,
      ficheEntreprise: null,
      fichesStagiaire: [],
      inscriptions: [],
    });
    expect(Array.isArray(body.historique)).toBe(true);
    expect(body.historique.length).toBe(1);
  });
});
