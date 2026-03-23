/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports */

const pdfmake = require("pdfmake/build/pdfmake");
const pdfFonts = require("pdfmake/build/vfs_fonts");

// Assign fonts - pdfmake 0.2.x exports font files directly as object keys
pdfmake.vfs = pdfFonts.pdfMake?.vfs || pdfFonts.vfs || pdfFonts;

export function generatePdfBuffer(docDefinition: any): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    try {
      // Use default Roboto font (embedded in vfs_fonts)
      if (docDefinition.defaultStyle?.font === "Helvetica") {
        delete docDefinition.defaultStyle.font;
      }

      const doc = pdfmake.createPdf(docDefinition);

      const timeout = setTimeout(() => reject(new Error("PDF generation timeout")), 15000);

      doc.getBase64((data: string) => {
        clearTimeout(timeout);
        resolve(new Uint8Array(Buffer.from(data, "base64")));
      });
    } catch (err) {
      reject(err);
    }
  });
}
