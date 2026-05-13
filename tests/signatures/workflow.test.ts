import { describe, it, expect } from "vitest";
import {
  canTransition,
  assertTransition,
  type SignatureStatus,
} from "@/lib/signatures/workflow";

describe("workflow state machine", () => {
  const validTransitions: Array<[SignatureStatus, SignatureStatus]> = [
    ["draft", "ready"],
    ["draft", "cancelled"],
    ["ready", "sent"],
    ["ready", "draft"], // retour design
    ["ready", "cancelled"],
    ["sent", "viewed"],
    ["sent", "expired"],
    ["sent", "rejected"],
    ["sent", "cancelled"],
    ["viewed", "signed"],
    ["viewed", "expired"],
    ["viewed", "rejected"],
    ["signed", "completed"],
  ];

  for (const [from, to] of validTransitions) {
    it(`accepte ${from} → ${to}`, () => {
      expect(canTransition(from, to)).toBe(true);
    });
  }

  it("refuse draft → signed (skip étapes)", () => {
    expect(canTransition("draft", "signed")).toBe(false);
  });
  it("refuse completed → draft (revert non autorisé)", () => {
    expect(canTransition("completed", "draft")).toBe(false);
  });
  it("refuse expired → signed (état terminal)", () => {
    expect(canTransition("expired", "signed")).toBe(false);
  });
  it("refuse rejected → anything (état terminal)", () => {
    expect(canTransition("rejected", "draft")).toBe(false);
    expect(canTransition("rejected", "sent")).toBe(false);
  });

  it("assertTransition throw avec un message clair sur transition invalide", () => {
    expect(() => assertTransition("draft", "signed")).toThrow(/draft.*signed/);
  });
  it("assertTransition silencieux sur transition valide", () => {
    expect(() => assertTransition("draft", "ready")).not.toThrow();
  });
});
