/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-require-imports */
const PdfPrinter = require("pdfmake/src/printer");

const fonts = {
  Helvetica: {
    normal: "Helvetica",
    bold: "Helvetica-Bold",
    italics: "Helvetica-Oblique",
    bolditalics: "Helvetica-BoldOblique",
  },
};

export function generatePdfBuffer(docDefinition: any): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    try {
      const printer = new PdfPrinter(fonts);
      const doc = printer.createPdfKitDocument(docDefinition);
      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(new Uint8Array(Buffer.concat(chunks))));
      doc.on("error", reject);
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
