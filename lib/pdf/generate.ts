/* eslint-disable @typescript-eslint/no-explicit-any */

let _printer: any = null;

function getPrinter() {
  if (!_printer) {
    // Dynamic require to avoid build-time bundling issues
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const PdfPrinter = require("pdfmake/src/printer");
    _printer = new PdfPrinter({
      Helvetica: {
        normal: "Helvetica",
        bold: "Helvetica-Bold",
        italics: "Helvetica-Oblique",
        bolditalics: "Helvetica-BoldOblique",
      },
    });
  }
  return _printer;
}

export function generatePdfBuffer(docDefinition: any): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    try {
      const printer = getPrinter();
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
