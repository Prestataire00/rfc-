import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    auditLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/get-client-ip", () => ({
  getClientIp: vi.fn(() => "1.2.3.4"),
}));

import { prisma } from "@/lib/prisma";
import {
  diffFields,
  logAudit,
  logAuditFromRequest,
  SYSTEM_ACTOR,
} from "@/lib/audit";

const mockedCreate = vi.mocked(prisma.auditLog.create);

describe("logAudit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("écrit l'AuditLog avec acteur User", async () => {
    await logAudit({
      action: "devis.sign",
      actor: { id: "u1", email: "alice@x.com", role: "client" },
      ip: "5.6.7.8",
      resource: { type: "Devis", id: "d1" },
      metadata: { montant: 1200 },
    });

    expect(mockedCreate).toHaveBeenCalledWith({
      data: {
        action: "devis.sign",
        actorId: "u1",
        actorEmail: "alice@x.com",
        actorRole: "client",
        actorIp: "5.6.7.8",
        resourceType: "Devis",
        resourceId: "d1",
        metadata: { montant: 1200 },
      },
    });
  });

  it("supporte un acteur système (cron) sans User", async () => {
    await logAudit({
      action: "facture.overdue_detected",
      actor: SYSTEM_ACTOR,
      resource: { type: "Facture", id: "f1" },
    });

    expect(mockedCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "facture.overdue_detected",
        actorId: null,
        actorEmail: null,
        actorRole: "system",
        actorIp: null,
        resourceType: "Facture",
        resourceId: "f1",
      }),
    });
  });

  it("ne throw PAS si l'écriture échoue (best-effort)", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockedCreate.mockRejectedValueOnce(new Error("DB down"));

    await expect(
      logAudit({
        action: "user.create",
        actor: { id: "u1", email: "a@x.com", role: "admin" },
        resource: { type: "User", id: "u2" },
      }),
    ).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalledWith(
      "[audit] write failed",
      expect.objectContaining({ action: "user.create" }),
    );
    errorSpy.mockRestore();
  });

  it("metadata null/undefined → champ omis (pas null forcé)", async () => {
    await logAudit({
      action: "auth.logout",
      actor: { id: "u1", email: "a@x.com", role: "admin" },
      resource: { type: "User", id: "u1" },
    });

    const call = mockedCreate.mock.calls[0]?.[0];
    expect(call?.data.metadata).toBeUndefined();
  });
});

describe("logAuditFromRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("extrait l'IP du request et écrit l'audit", async () => {
    const req = { headers: { get: () => null } } as unknown as Request;
    await logAuditFromRequest(req, {
      action: "devis.create",
      actor: { id: "u1", email: "a@x.com", role: "admin" },
      resource: { type: "Devis", id: "d1" },
    });

    expect(mockedCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorIp: "1.2.3.4",
        action: "devis.create",
      }),
    });
  });
});

describe("diffFields", () => {
  it("retourne null si aucun champ ne diffère", () => {
    expect(
      diffFields(
        { a: 1, b: "x", c: true },
        { a: 1, b: "x", c: true },
        ["a", "b", "c"],
      ),
    ).toBeNull();
  });

  it("retourne {before, after} avec seulement les champs modifiés", () => {
    const diff = diffFields(
      { name: "Alice", role: "admin", actif: true },
      { name: "Alice", role: "formateur", actif: true },
      ["name", "role", "actif"],
    );

    expect(diff).toEqual({
      before: { role: "admin" },
      after: { role: "formateur" },
    });
  });

  it("ignore les champs non listés dans keys", () => {
    const diff = diffFields(
      { name: "Alice", role: "admin" },
      { name: "Bob", role: "admin" },
      ["role"],
    );
    expect(diff).toBeNull();
  });
});
