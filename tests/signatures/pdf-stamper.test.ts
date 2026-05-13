import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import { stampSignatures, type SignatureFill } from "@/lib/signatures/pdf-stamper";

const samplePdf = readFileSync("tests/fixtures/sample.pdf");

// 1×1 PNG transparent base64 (tiny mais valide pour les tests).
const PNG_1PX =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

describe("pdf-stamper", () => {
  it("embed une signature image sur page 1 et retourne un PDF valide", async () => {
    const fills: SignatureFill[] = [
      {
        page: 1,
        x: 100,
        y: 100,
        width: 80,
        height: 30,
        type: "signature",
        method: "image",
        value: PNG_1PX,
      },
    ];
    const out = await stampSignatures(samplePdf, fills);
    expect(out).toBeInstanceOf(Buffer);
    const reloaded = await PDFDocument.load(out);
    expect(reloaded.getPageCount()).toBe(1);
  });

  it("embed une signature texte avec police cursive", async () => {
    const fills: SignatureFill[] = [
      {
        page: 1,
        x: 100,
        y: 100,
        width: 200,
        height: 40,
        type: "signature",
        method: "text",
        value: "Jean Dupont",
      },
    ];
    const out = await stampSignatures(samplePdf, fills);
    const reloaded = await PDFDocument.load(out);
    expect(reloaded.getPageCount()).toBe(1);
    // Le PDF final doit être strictement plus gros (font embed)
    expect(out.length).toBeGreaterThan(samplePdf.length);
  });

  it("gère plusieurs zones sur la même page", async () => {
    const fills: SignatureFill[] = [
      { page: 1, x: 100, y: 100, width: 80, height: 30, type: "signature", method: "image", value: PNG_1PX },
      { page: 1, x: 100, y: 200, width: 80, height: 30, type: "signature", method: "image", value: PNG_1PX },
    ];
    const out = await stampSignatures(samplePdf, fills);
    const reloaded = await PDFDocument.load(out);
    expect(reloaded.getPageCount()).toBe(1);
  });

  it("throw si page inexistante", async () => {
    const fills: SignatureFill[] = [
      { page: 99, x: 0, y: 0, width: 10, height: 10, type: "signature", method: "image", value: PNG_1PX },
    ];
    await expect(stampSignatures(samplePdf, fills)).rejects.toThrow(/Page 99/);
  });

  it("zone type date utilise la date du jour si value vide", async () => {
    const fills: SignatureFill[] = [
      { page: 1, x: 100, y: 100, width: 80, height: 20, type: "date", method: "text", value: "" },
    ];
    const out = await stampSignatures(samplePdf, fills);
    const reloaded = await PDFDocument.load(out);
    expect(reloaded.getPageCount()).toBe(1);
  });
});
