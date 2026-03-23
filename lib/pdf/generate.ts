/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports */

export function generatePdfBuffer(docDefinition: any): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    try {
      if (docDefinition.defaultStyle?.font === "Helvetica") {
        delete docDefinition.defaultStyle.font;
      }

      const pdfmake = require("pdfmake/build/pdfmake");
      const pdfFonts = require("pdfmake/build/vfs_fonts");

      if (pdfFonts && pdfFonts.pdfMake) {
        pdfmake.vfs = pdfFonts.pdfMake.vfs;
      } else if (pdfFonts && pdfFonts.vfs) {
        pdfmake.vfs = pdfFonts.vfs;
      }

      const doc = pdfmake.createPdf(docDefinition);

      // Timeout after 15 seconds
      const timeout = setTimeout(() => {
        reject(new Error("PDF generation timeout"));
      }, 15000);

      doc.getBase64((data: string) => {
        clearTimeout(timeout);
        resolve(new Uint8Array(Buffer.from(data, "base64")));
      });
    } catch (err) {
      reject(err);
    }
  });
}
