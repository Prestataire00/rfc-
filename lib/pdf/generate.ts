/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports */

export function generatePdfBuffer(docDefinition: any): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    try {
      // Remove custom Helvetica font reference — the pdfmake browser build
      // ships with Roboto by default and does not support custom standard fonts
      // without the server-side printer.  Deleting the key lets pdfmake fall
      // back to its built-in Roboto font, which is embedded in vfs_fonts.js.
      if (docDefinition.defaultStyle?.font === "Helvetica") {
        delete docDefinition.defaultStyle.font;
      }

      // Use the *browser / bundled* build of pdfmake which embeds everything
      // it needs via a virtual file-system (vfs_fonts.js).  This avoids the
      // server-side printer that requires `data.trie` and other files that
      // don't get bundled correctly in Netlify serverless functions.
      const pdfmake = require("pdfmake/build/pdfmake");
      const pdfFonts = require("pdfmake/build/vfs_fonts");

      // vfs_fonts.js may expose fonts in different shapes depending on version
      if (pdfFonts && pdfFonts.pdfMake) {
        pdfmake.vfs = pdfFonts.pdfMake.vfs;
      } else if (pdfFonts && pdfFonts.vfs) {
        pdfmake.vfs = pdfFonts.vfs;
      }

      const doc = pdfmake.createPdf(docDefinition);

      // getBase64 is more reliable than getBuffer in non-browser environments
      doc.getBase64((data: string) => {
        resolve(new Uint8Array(Buffer.from(data, "base64")));
      });
    } catch (err) {
      reject(err);
    }
  });
}
