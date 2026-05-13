import { describe, expect, it } from "vitest";

import {
  destinationByRole,
  sanitizeNext,
} from "@/lib/auth/post-login-redirect";

describe("destinationByRole", () => {
  it("formateur → /espace-formateur", () => {
    expect(destinationByRole("formateur")).toBe("/espace-formateur");
  });

  it("client → /espace-client", () => {
    expect(destinationByRole("client")).toBe("/espace-client");
  });

  it("admin → /dashboard", () => {
    expect(destinationByRole("admin")).toBe("/dashboard");
  });

  it("rôle inconnu → /dashboard (fallback)", () => {
    expect(destinationByRole("ghost")).toBe("/dashboard");
  });
});

describe("sanitizeNext (anti open-redirect)", () => {
  it("null/undefined/empty → null", () => {
    expect(sanitizeNext(null)).toBeNull();
    expect(sanitizeNext(undefined)).toBeNull();
    expect(sanitizeNext("")).toBeNull();
  });

  it("chemin interne valide → conservé", () => {
    expect(sanitizeNext("/dashboard")).toBe("/dashboard");
    expect(sanitizeNext("/formations/abc?tab=detail")).toBe(
      "/formations/abc?tab=detail",
    );
  });

  it("URL absolue (http/https) → null", () => {
    expect(sanitizeNext("https://evil.com")).toBeNull();
    expect(sanitizeNext("http://evil.com")).toBeNull();
  });

  it("protocole-relative //evil.com → null", () => {
    expect(sanitizeNext("//evil.com")).toBeNull();
    expect(sanitizeNext("//evil.com/path")).toBeNull();
  });

  it("javascript: scheme → null", () => {
    expect(sanitizeNext("javascript:alert(1)")).toBeNull();
  });

  it("chemin sans slash initial → null", () => {
    expect(sanitizeNext("dashboard")).toBeNull();
    expect(sanitizeNext("../etc/passwd")).toBeNull();
  });
});
