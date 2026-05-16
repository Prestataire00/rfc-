import { describe, it, expect, vi } from "vitest";

// Mock prisma pour ne pas hit la vraie DB en CI
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    contact: { findUnique: vi.fn() },
  },
}));

const importPOST = async () => (await import("@/app/api/prospects/route")).POST;
const importPrisma = async () =>
  (await import("@/lib/prisma")) as unknown as {
    prisma: {
      $transaction: ReturnType<typeof vi.fn>;
      contact: { findUnique: ReturnType<typeof vi.fn> };
    };
  };

const validPayload = {
  contact: { prenom: "Jean", nom: "Dupont", email: "jean@test.com" },
  entrepriseMode: "nouvelle" as const,
  entrepriseNouvelle: { nom: "Acme" },
  demande: { origine: "client" as const, formationSouhaitee: "SST" },
};

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/prospects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as Parameters<Awaited<ReturnType<typeof importPOST>>>[0];
}

describe("POST /api/prospects", () => {
  it("retourne 201 + ids des entités créées", async () => {
    const { prisma } = await importPrisma();
    prisma.contact.findUnique.mockResolvedValueOnce(null); // email non existant
    prisma.$transaction.mockResolvedValueOnce({
      demandeId: "cuid_demande",
      contactId: "cuid_contact",
      entrepriseId: "cuid_entreprise",
    });
    const POST = await importPOST();
    const res = await POST(makeRequest(validPayload));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({
      demandeId: "cuid_demande",
      contactId: "cuid_contact",
      entrepriseId: "cuid_entreprise",
      redirectUrl: "/prospects/cuid_demande",
    });
  });

  it("retourne 422 si payload invalide", async () => {
    const POST = await importPOST();
    const res = await POST(makeRequest({ invalid: true }));
    expect(res.status).toBe(422);
  });

  it("retourne 409 si email contact déjà existant (rattachement à proposer)", async () => {
    const { prisma } = await importPrisma();
    prisma.contact.findUnique.mockResolvedValueOnce({ id: "cuid_existant", nom: "Old", prenom: "User" });
    const POST = await importPOST();
    const res = await POST(makeRequest(validPayload));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toContain("email existe déjà");
    expect(body.existingContactId).toBe("cuid_existant");
  });
});
