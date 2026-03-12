// eslint-disable-next-line @typescript-eslint/no-require-imports
const PdfPrinter = require("pdfmake");
const fonts = {
  Helvetica: {
    normal: "Helvetica",
    bold: "Helvetica-Bold",
    italics: "Helvetica-Oblique",
    bolditalics: "Helvetica-BoldOblique",
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function generatePdfBuffer(docDefinition: any): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const printer = new PdfPrinter(fonts);
    const doc = printer.createPdfKitDocument(docDefinition);

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(new Uint8Array(Buffer.concat(chunks))));
    doc.on("error", reject);
    doc.end();
  });
}
