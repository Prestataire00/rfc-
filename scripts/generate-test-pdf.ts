import { PDFDocument, StandardFonts } from "pdf-lib";
import { writeFileSync, mkdirSync } from "node:fs";

async function main() {
  mkdirSync("tests/fixtures", { recursive: true });
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText("Document de test pour signature électronique", {
    x: 50,
    y: 750,
    size: 18,
    font,
  });
  page.drawText("Lorem ipsum dolor sit amet, consectetur adipiscing elit.", {
    x: 50,
    y: 700,
    size: 11,
    font,
  });
  writeFileSync("tests/fixtures/sample.pdf", await doc.save());
  console.log("✓ tests/fixtures/sample.pdf créée");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
